"""
ACE-Step 1.5 — Production-grade FastAPI on Modal
=================================================
Production fixes applied:
  1. batch_size=1 — stop generating 2 clips and throwing one away
  2. /tmp instead of /dev/shm — safer for large audio files
  3. min_containers=0 — scale to zero when idle
  4. Download timeout 120s — handles large audio files
  5. CPU preprocessor downloads audio to BYTES, passes to GPU worker
  6. GPU worker writes bytes to /tmp locally — paths exist on correct machine

Key fix: CPU preprocessor and GPU worker are DIFFERENT containers on
DIFFERENT machines. File paths from CPU /tmp don't exist on GPU /tmp.
Solution: pass audio as raw bytes through the function call.

Deploy:
  modal deploy api.py

Required Modal secrets:
  CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
  API_KEY (optional), ALLOWED_ORIGINS (optional)
"""

import os
import modal

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
PROJECT_ROOT   = "/root/acestep_app"
CHECKPOINT_DIR = f"{PROJECT_ROOT}/checkpoints"
DIT_MODEL      = "acestep-v15-turbo"
LLM_MODEL      = "acestep-5Hz-lm-1.7B"

# ---------------------------------------------------------------------------
# Container image
# ---------------------------------------------------------------------------
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "ffmpeg")
    .pip_install("packaging", "setuptools", "wheel")
    .pip_install(
        "torch==2.6.0",
        "torchaudio==2.6.0",
        index_url="https://download.pytorch.org/whl/cu124",
    )
    .pip_install(
        "transformers>=4.51.0,<5.0.0",
        "accelerate>=0.26.0",
        "diffusers>=0.31.0",
        "tokenizers>=0.19.0",
        "huggingface_hub[hf_transfer]>=0.23.0",
        "einops",
        "omegaconf",
        "librosa",
        "soundfile",
        "vector-quantize-pytorch>=1.27.15,<1.28.0",
        "x-transformers",
        "encodec",
        "vocos",
        "rotary-embedding-torch",
        "loguru",
        "cloudinary==1.41.0",
        "torchao",
        "requests",
    )
    .run_commands(
        "pip install --no-deps git+https://github.com/ace-step/ACE-Step-1.5.git"
    )
    .env({
        "HF_HUB_ENABLE_HF_TRANSFER": "1",
        "TORCHAUDIO_USE_TORCHCODEC": "0",
        "TOKENIZERS_PARALLELISM": "false",
    })
)

# ---------------------------------------------------------------------------
# CPU-only image for preprocessing — no GPU needed, much cheaper
# ---------------------------------------------------------------------------
cpu_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install(
        "soundfile",
        "requests",
        "librosa",
        "cloudinary==1.41.0",
    )
)

# ---------------------------------------------------------------------------
# Volume
# ---------------------------------------------------------------------------
model_cache = modal.Volume.from_name(
    "ace-step-v15-model-cache", create_if_missing=True
)

def _download_models():
    import subprocess
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)
    turbo_path = os.path.join(CHECKPOINT_DIR, DIT_MODEL)
    lm_path    = os.path.join(CHECKPOINT_DIR, LLM_MODEL)
    if (os.path.isdir(turbo_path) and os.listdir(turbo_path) and
            os.path.isdir(lm_path) and os.listdir(lm_path)):
        print("✅ Weights already present, skipping download.")
        return
    print("📦 Downloading ACE-Step/Ace-Step1.5 (~10 GB)…")
    subprocess.run(
        ["huggingface-cli", "download", "ACE-Step/Ace-Step1.5",
         "--local-dir", CHECKPOINT_DIR],
        check=True,
    )
    for path in [turbo_path, lm_path, os.path.join(CHECKPOINT_DIR, "vae")]:
        assert os.path.isdir(path), f"Missing after download: {path}"
    print(f"✅ Weights ready: {os.listdir(CHECKPOINT_DIR)}")

image = image.run_function(
    _download_models,
    volumes={CHECKPOINT_DIR: model_cache},
)

# ---------------------------------------------------------------------------
# Modal app
# ---------------------------------------------------------------------------
app = modal.App("ace-step-v15-music-api")


# ---------------------------------------------------------------------------
# Module-level helpers
# ---------------------------------------------------------------------------

def _download_audio(url: str, dest_dir: str) -> str:
    import requests
    from urllib.parse import urlparse

    ext = os.path.splitext(urlparse(url).path)[-1].lower()
    if ext not in (".wav", ".mp3", ".flac", ".ogg", ".m4a", ".aac"):
        ext = ".wav"

    dest_path = os.path.join(dest_dir, f"src_{os.urandom(4).hex()}{ext}")

    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        with open(dest_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                f.write(chunk)

    return dest_path


def _extract_wav_tensor(result: dict, fallback_seed: int):
    import torch

    if not result.get("success", True):
        raise RuntimeError(
            f"generate_music() failed: {result.get('error', 'unknown error')}"
        )
    audios = result.get("audios")
    if not audios:
        raise RuntimeError(
            f"generate_music() returned empty 'audios'. Keys: {list(result.keys())}"
        )
    first = audios[0]
    if isinstance(first, dict):
        if "tensor" in first:
            wav_tensor = first["tensor"]
        elif "audio" in first:
            wav_tensor = first["audio"]
        elif "wav" in first:
            wav_tensor = first["wav"]
        else:
            raise RuntimeError(
                f"No tensor key in audios[0]. Keys: {list(first.keys())}"
            )
    elif isinstance(first, torch.Tensor):
        wav_tensor = first
    else:
        raise RuntimeError(f"Unexpected audios[0] type: {type(first)}")

    used_seed = int(
        (first.get("seed") if isinstance(first, dict) else None)
        or result.get("extra_outputs", {}).get("seed")
        or fallback_seed
    )
    return wav_tensor, used_seed


def _tensor_to_file(wav_tensor, sample_rate: int, path: str):
    import torch, torchaudio
    wav = wav_tensor
    if not isinstance(wav, torch.Tensor):
        import numpy as np
        wav = torch.from_numpy(np.array(wav))
    wav = wav.float().cpu()
    if wav.ndim == 3:
        wav = wav.squeeze(0)
    if wav.ndim == 1:
        wav = wav.unsqueeze(0)
    torchaudio.save(path, wav, sample_rate)
    return wav


# ---------------------------------------------------------------------------
# GPU worker
# ---------------------------------------------------------------------------
@app.cls(
    gpu="a10g",
    image=image,
    volumes={CHECKPOINT_DIR: model_cache},
    secrets=[modal.Secret.from_name("ace-step-secrets")],
    min_containers=0,
    scaledown_window=300,
    timeout=600,
)
class MusicGenerator:

    @modal.enter()
    def init(self):
        import cloudinary, cloudinary.uploader
        from acestep.handler import AceStepHandler
        from acestep.llm_inference import LLMHandler

        print("🔧 Initialising AceStepHandler (DiT)…")
        self.dit = AceStepHandler()
        status, ok = self.dit.initialize_service(
            project_root=PROJECT_ROOT,
            config_path=DIT_MODEL,
            device="auto",
            use_flash_attention=False,
            compile_model=False,
            offload_to_cpu=False,
            offload_dit_to_cpu=False,
        )
        print(f"✅ DiT ready — {status!r} | ok={ok}")

        print("🔧 Initialising LLMHandler (LM)…")
        self.llm = LLMHandler()
        self.llm.initialize(
            checkpoint_dir=CHECKPOINT_DIR,
            lm_model_path=LLM_MODEL,
            backend="pt",
            device="cuda",
        )
        print("✅ LLM ready.")

        cloudinary.config(
            cloud_name=os.environ["CLOUDINARY_CLOUD_NAME"],
            api_key=os.environ["CLOUDINARY_API_KEY"],
            api_secret=os.environ["CLOUDINARY_API_SECRET"],
            secure=True,
        )
        self._uploader = cloudinary.uploader
        print("✅ Ready.")

    def _upload(self, path: str, public_id: str) -> str:
        upload = self._uploader.upload(
            path,
            resource_type="video",
            folder="ace_step_v15",
            public_id=public_id,
            overwrite=False,
        )
        return upload["secure_url"]

    @modal.method()
    def warmup(self) -> dict:
        return {"status": "warm"}

    @modal.method()
    def generate(
        self,
        *,
        prompt: str,
        lyrics: str = "[inst]",
        duration: float = 30.0,
        output_format: str = "mp3",
        infer_step: int = 12,
        seed: int = -1,
        bpm: str = "",
        key: str = "",
        language: str = "en",
    ) -> dict:
        import uuid, shutil

        save_dir = f"/tmp/ace_{uuid.uuid4().hex}"
        os.makedirs(save_dir, exist_ok=True)

        print(f"🎵 generate | {prompt!r} | {duration}s | steps={infer_step} | seed={seed}")

        result = self.dit.generate_music(
            captions=prompt,
            lyrics=lyrics,
            audio_duration=duration,
            bpm=int(bpm) if bpm else None,
            key_scale=key or "",
            vocal_language=language or "en",
            inference_steps=infer_step,
            guidance_scale=15.0,
            use_random_seed=(seed == -1),
            seed=seed,
            batch_size=1,
            task_type="text2music",
            shift=1.0,
            cfg_interval_start=0.0,
            cfg_interval_end=1.0,
            infer_method="ode",
            use_tiled_decode=True,
        )

        wav_tensor, used_seed = _extract_wav_tensor(result, seed)
        audio_path = f"{save_dir}/output.{output_format}"
        _tensor_to_file(wav_tensor, self.dit.sample_rate, audio_path)
        print(f"💾 Saved {audio_path}")

        url = self._upload(audio_path, f"song_{used_seed}_{uuid.uuid4().hex[:8]}")
        shutil.rmtree(save_dir, ignore_errors=True)
        print(f"✅ generate done: {url}")
        return {"url": url, "duration": duration, "seed": used_seed}

    @modal.method()
    def repaint(
        self,
        *,
        # ── Audio passed as bytes — CPU and GPU are different containers,
        #    file paths from CPU /tmp do NOT exist on GPU /tmp ──────────────
        src_bytes: bytes,
        src_ext: str,
        src_duration: float,
        repainting_start: float,
        repainting_end: float,
        # Prompt
        prompt: str,
        lyrics: str = "[inst]",
        # Task
        task_type: str = "repaint",
        # Optional reference
        ref_bytes: bytes | None = None,
        ref_ext: str | None = None,
        # Blending
        audio_cover_strength: float = 1.0,
        cover_noise_strength: float = 0.0,
        # Quality
        infer_step: int = 8,
        guidance_scale: float = 15.0,
        seed: int = -1,
        # Metadata
        bpm: str = "",
        key: str = "",
        language: str = "en",
        # Advanced diffusion
        infer_method: str = "ode",
        cfg_interval_start: float = 0.0,
        cfg_interval_end: float = 1.0,
        shift: float = 1.0,
        use_adg: bool = False,
        output_format: str = "mp3",
    ) -> dict:
        import uuid, shutil

        save_dir = f"/tmp/ace_{uuid.uuid4().hex}"
        os.makedirs(save_dir, exist_ok=True)

        try:
            # Write bytes to local files on THIS GPU container
            src_path = f"{save_dir}/src{src_ext}"
            with open(src_path, "wb") as f:
                f.write(src_bytes)

            ref_path = None
            if ref_bytes and ref_ext:
                ref_path = f"{save_dir}/ref{ref_ext}"
                with open(ref_path, "wb") as f:
                    f.write(ref_bytes)

            print(
                f"🎨 repaint | task={task_type} | "
                f"{repainting_start:.1f}s→{repainting_end:.1f}s "
                f"| {prompt!r} | steps={infer_step} | seed={seed}"
            )

            result = self.dit.generate_music(
                captions=prompt,
                lyrics=lyrics,
                audio_duration=src_duration,
                bpm=int(bpm) if bpm else None,
                key_scale=key or "",
                vocal_language=language or "en",
                inference_steps=infer_step,
                guidance_scale=guidance_scale,
                use_random_seed=(seed == -1),
                seed=seed,
                batch_size=1,
                src_audio=src_path,
                reference_audio=ref_path,
                repainting_start=repainting_start,
                repainting_end=repainting_end,
                task_type=task_type,
                audio_cover_strength=audio_cover_strength,
                cover_noise_strength=cover_noise_strength,
                shift=shift,
                cfg_interval_start=cfg_interval_start,
                cfg_interval_end=cfg_interval_end,
                infer_method=infer_method,
                use_adg=use_adg,
                use_tiled_decode=True,
            )

            wav_tensor, used_seed = _extract_wav_tensor(result, seed)
            audio_path = f"{save_dir}/output.{output_format}"
            _tensor_to_file(wav_tensor, self.dit.sample_rate, audio_path)
            print(f"💾 Saved repaint output: {audio_path}")

            url = self._upload(
                audio_path,
                f"repaint_{used_seed}_{uuid.uuid4().hex[:8]}"
            )
            print(f"✅ repaint done: {url}")
            return {
                "url": url,
                "duration": src_duration,
                "seed": used_seed,
                "repainting_start": repainting_start,
                "repainting_end": repainting_end,
                "task_type": task_type,
            }
        finally:
            shutil.rmtree(save_dir, ignore_errors=True)


# ---------------------------------------------------------------------------
# CPU preprocessor — downloads audio to bytes, hands to GPU worker
# ---------------------------------------------------------------------------
@app.function(
    image=cpu_image,
    secrets=[modal.Secret.from_name("ace-step-secrets")],
    timeout=180,
)
def preprocess_audio(
    src_audio_url: str,
    reference_audio_url: str | None,
    repainting_start: float,
    repainting_end: float | None,
) -> dict:
    import soundfile as sf
    import tempfile, shutil

    work_dir = tempfile.mkdtemp(prefix="ace_pre_")

    try:
        print(f"⬇️  Downloading source: {src_audio_url}")
        src_path = _download_audio(src_audio_url, work_dir)

        try:
            info = sf.info(src_path)
        except Exception as e:
            raise ValueError(f"Source audio unreadable: {e}") from e

        actual_duration = info.duration
        if actual_duration < 1.0:
            raise ValueError(f"Source audio too short: {actual_duration:.2f}s")

        print(f"📏 Source: {actual_duration:.2f}s | {info.samplerate}Hz | {info.channels}ch")

        repaint_end = (
            min(repainting_end, actual_duration)
            if repainting_end is not None
            else actual_duration
        )

        if repainting_start >= repaint_end:
            raise ValueError(
                f"repainting_start ({repainting_start}s) must be less than "
                f"repainting_end ({repaint_end}s)"
            )

        # Read bytes — these will be passed to GPU container
        with open(src_path, "rb") as f:
            src_bytes = f.read()
        src_ext = os.path.splitext(src_path)[-1].lower()

        ref_bytes = None
        ref_ext = None
        if reference_audio_url:
            print(f"⬇️  Downloading reference: {reference_audio_url}")
            ref_path = _download_audio(reference_audio_url, work_dir)
            try:
                sf.info(ref_path)
            except Exception as e:
                raise ValueError(f"Reference audio unreadable: {e}") from e
            with open(ref_path, "rb") as f:
                ref_bytes = f.read()
            ref_ext = os.path.splitext(ref_path)[-1].lower()

        return {
            "src_bytes": src_bytes,
            "src_ext": src_ext,
            "ref_bytes": ref_bytes,
            "ref_ext": ref_ext,
            "actual_duration": actual_duration,
            "repainting_start": repainting_start,
            "repainting_end": repaint_end,
        }
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


# ---------------------------------------------------------------------------
# FastAPI gateway
# ---------------------------------------------------------------------------
web_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("fastapi[standard]==0.115.4", "pydantic==2.10.1")
)


@app.function(
    image=web_image,
    secrets=[modal.Secret.from_name("ace-step-secrets")],
    timeout=660,
)
@modal.asgi_app()
def api():
    from fastapi import FastAPI, HTTPException, Security, Depends
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.security.api_key import APIKeyHeader
    from pydantic import BaseModel, Field
    from typing import Optional

    web = FastAPI(
        title="ACE-Step v1.5 Music API",
        version="1.5.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    origins = os.environ.get("ALLOWED_ORIGINS", "*").split(",")
    web.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    _SECRET    = os.environ.get("API_KEY", "")
    key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

    def require_key(key: str = Security(key_header)):
        if _SECRET and key != _SECRET:
            raise HTTPException(status_code=403, detail="Invalid API key")

    class GenerateRequest(BaseModel):
        prompt: str        = Field(..., description="Style/genre description")
        lyrics: str        = Field("[inst]")
        duration: float    = Field(30.0, ge=10.0, le=300.0)
        output_format: str = Field("mp3", pattern="^(mp3|wav|flac)$")
        infer_step: int    = Field(12, ge=4, le=20)
        seed: int          = Field(-1)
        bpm: str           = Field("")
        key: str           = Field("")
        language: str      = Field("en")

    class GenerateResponse(BaseModel):
        url: str
        duration: float
        seed: int

    class RepaintRequest(BaseModel):
        src_audio_url: str          = Field(...)
        repainting_start: float     = Field(0.0, ge=0.0)
        repainting_end: Optional[float] = Field(None)
        prompt: str                 = Field(...)
        lyrics: str                 = Field("[inst]")
        task_type: str              = Field("repaint", pattern="^(repaint|continuation|remix|extract|cover)$")
        reference_audio_url: Optional[str] = Field(None)
        audio_cover_strength: float = Field(1.0, ge=0.0, le=1.0)
        cover_noise_strength: float = Field(0.0, ge=0.0, le=1.0)
        infer_step: int             = Field(8, ge=1, le=20)
        guidance_scale: float       = Field(15.0, ge=1.0, le=30.0)
        seed: int                   = Field(-1)
        bpm: str                    = Field("")
        key: str                    = Field("")
        language: str               = Field("en")
        infer_method: str           = Field("ode", pattern="^(ode|euler)$")
        cfg_interval_start: float   = Field(0.0, ge=0.0, le=1.0)
        cfg_interval_end: float     = Field(1.0, ge=0.0, le=1.0)
        shift: float                = Field(1.0)
        use_adg: bool               = Field(False)
        output_format: str          = Field("mp3", pattern="^(mp3|wav|flac)$")

    class RepaintResponse(BaseModel):
        url: str
        duration: float
        seed: int
        repainting_start: float
        repainting_end: float
        task_type: str

    @web.get("/health")
    async def health():
        return {"status": "ok", "dit": DIT_MODEL, "lm": LLM_MODEL}

    @web.get("/warmup")
    async def warmup(_=Depends(require_key)):
        generator = MusicGenerator()
        await generator.warmup.remote.aio()
        return {"status": "warm"}

    @web.post("/generate", response_model=GenerateResponse)
    async def generate(req: GenerateRequest, _=Depends(require_key)):
        generator = MusicGenerator()
        try:
            result = await generator.generate.remote.aio(
                prompt=req.prompt,
                lyrics=req.lyrics,
                duration=req.duration,
                output_format=req.output_format,
                infer_step=req.infer_step,
                seed=req.seed,
                bpm=req.bpm,
                key=req.key,
                language=req.language,
            )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        return GenerateResponse(**result)

    @web.post("/repaint", response_model=RepaintResponse)
    async def repaint(req: RepaintRequest, _=Depends(require_key)):
        # Step 1: CPU — download audio to bytes (no GPU billing)
        try:
            pre = await preprocess_audio.remote.aio(
                src_audio_url=req.src_audio_url,
                reference_audio_url=req.reference_audio_url,
                repainting_start=req.repainting_start,
                repainting_end=req.repainting_end,
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Audio download failed: {exc}") from exc

        # Step 2: GPU — write bytes to local /tmp on GPU container, then generate
        generator = MusicGenerator()
        try:
            result = await generator.repaint.remote.aio(
                src_bytes=pre["src_bytes"],
                src_ext=pre["src_ext"],
                src_duration=pre["actual_duration"],
                repainting_start=pre["repainting_start"],
                repainting_end=pre["repainting_end"],
                prompt=req.prompt,
                lyrics=req.lyrics,
                task_type=req.task_type,
                ref_bytes=pre["ref_bytes"],
                ref_ext=pre["ref_ext"],
                audio_cover_strength=req.audio_cover_strength,
                cover_noise_strength=req.cover_noise_strength,
                infer_step=req.infer_step,
                guidance_scale=req.guidance_scale,
                seed=req.seed,
                bpm=req.bpm,
                key=req.key,
                language=req.language,
                infer_method=req.infer_method,
                cfg_interval_start=req.cfg_interval_start,
                cfg_interval_end=req.cfg_interval_end,
                shift=req.shift,
                use_adg=req.use_adg,
                output_format=req.output_format,
            )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

        return RepaintResponse(**result)

    return web


# ---------------------------------------------------------------------------
# Debug helpers
# ---------------------------------------------------------------------------
@app.function(gpu="a10g", image=image, volumes={CHECKPOINT_DIR: model_cache})
def debug_generate_music_sig():
    """modal run api.py::debug_generate_music_sig"""
    import inspect
    from acestep.handler import AceStepHandler
    h = AceStepHandler()
    print(inspect.signature(h.generate_music))

@app.function(gpu="a10g", image=image, volumes={CHECKPOINT_DIR: model_cache})
def debug_result_keys():
    """modal run api.py::debug_result_keys"""
    from acestep.handler import AceStepHandler
    h = AceStepHandler()
    h.initialize_service(
        project_root=PROJECT_ROOT, config_path=DIT_MODEL,
        device="auto", use_flash_attention=False,
        compile_model=False, offload_to_cpu=False, offload_dit_to_cpu=False,
    )
    result = h.generate_music(
        captions="upbeat pop test", lyrics="[inst]",
        audio_duration=5.0, inference_steps=4,
        guidance_scale=7.0, use_random_seed=True, seed=-1,
        batch_size=1, task_type="text2music",
    )
    import torch
    print("=== generate_music() returned keys ===")
    for k, v in result.items():
        if isinstance(v, torch.Tensor):
            print(f"  {k}: Tensor{list(v.shape)} dtype={v.dtype}")
        else:
            print(f"  {k}: {type(v).__name__} = {repr(v)[:120]}")

@app.function(gpu="a10g", image=image, volumes={CHECKPOINT_DIR: model_cache})
def debug_repaint_src_audio():
    """modal run api.py::debug_repaint_src_audio"""
    import inspect
    from acestep.handler import AceStepHandler
    h = AceStepHandler()
    print(inspect.getsource(h._prepare_reference_and_source_audio))

@app.function(gpu="a10g", image=image, volumes={CHECKPOINT_DIR: model_cache})
def debug_process_src_audio():
    """modal run api.py::debug_process_src_audio"""
    import inspect
    from acestep.handler import AceStepHandler
    h = AceStepHandler()
    print(inspect.getsource(h.process_src_audio))
    print(inspect.getsource(h.process_reference_audio))