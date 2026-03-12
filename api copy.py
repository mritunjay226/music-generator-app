"""
ACE-Step 1.5 — Production-grade FastAPI on Modal
=================================================
Production fixes applied:
  1. batch_size=1 — stop generating 2 clips and throwing one away
  2. /tmp instead of /dev/shm — safer for large audio files
  3. min_containers=1 — no cold start for interactive repaint UX
  4. Download timeout 120s — handles large audio files
  5. CPU preprocessor downloads + validates audio BEFORE touching GPU
  6. MusicGenerator.repaint() is pure GPU work — no network calls inside it

Confirmed signatures:
  - generate_music() — confirmed live via debug_generate_music_sig
  - process_src_audio(path) — sf.read(path), auto-resamples to stereo 48kHz
  - process_reference_audio(path) — sf.read(path), samples 3x10s segments
  - result["audios"][0]["tensor"] — confirmed via debug_result_keys

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
# Module-level helpers (no GPU needed, used by both generate + repaint)
# ---------------------------------------------------------------------------

def _download_audio(url: str, dest_dir: str) -> str:
    """
    Download audio from URL to a temp file in dest_dir.
    Returns the local file path.
    Uses streaming to handle large files safely.
    Timeout 120s — handles 5-min WAV (~115MB) on slow connections.
    """
    import requests
    from urllib.parse import urlparse

    ext = os.path.splitext(urlparse(url).path)[-1].lower()
    if ext not in (".wav", ".mp3", ".flac", ".ogg", ".m4a", ".aac"):
        ext = ".wav"

    dest_path = os.path.join(dest_dir, f"src_{os.urandom(4).hex()}{ext}")

    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        with open(dest_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 1024):  # 1MB chunks
                f.write(chunk)

    return dest_path


def _extract_wav_tensor(result: dict, fallback_seed: int):
    """
    Extract waveform tensor from generate_music() result dict.
    Confirmed structure: result["audios"][0]["tensor"] = torch.Tensor
    """
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
        # Cannot use 'or' on tensors — bool(tensor) raises for multi-element tensors
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
    """Normalize tensor shape to [C, T] and save to disk."""
    import torch, torchaudio
    wav = wav_tensor
    if not isinstance(wav, torch.Tensor):
        import numpy as np
        wav = torch.from_numpy(np.array(wav))
    wav = wav.float().cpu()
    if wav.ndim == 3:
        wav = wav.squeeze(0)    # [B, C, T] → [C, T]
    if wav.ndim == 1:
        wav = wav.unsqueeze(0)  # [T] → [1, T]
    torchaudio.save(path, wav, sample_rate)
    return wav


# ---------------------------------------------------------------------------
# GPU worker — pure model inference, zero network calls inside
# ---------------------------------------------------------------------------
@app.cls(
    gpu="a10g",
    image=image,
    volumes={CHECKPOINT_DIR: model_cache},
    secrets=[modal.Secret.from_name("ace-step-secrets")],
    # min_containers=1: keeps one warm container so repaint feels interactive.
    # Cost: ~$0.67/hr idle. Set to 0 if cost matters more than latency.
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
        """No-op — just triggers @modal.enter() so container is ready."""
        return {"status": "warm"}

    # -------------------------------------------------------------------------
    # TEXT-TO-MUSIC
    # No file I/O needed here — pure generation from text prompt
    # -------------------------------------------------------------------------
    @modal.method()
    def generate(
        self,
        *,
        prompt: str,
        lyrics: str = "[inst]",
        duration: float = 30.0,
        output_format: str = "wav",
        infer_step: int = 12,
        seed: int = -1,
        bpm: str = "",
        key: str = "",
        language: str = "en",
    ) -> dict:
        import uuid, shutil

        # Use /tmp — safer than /dev/shm for large audio files
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
            # batch_size=1: only generate one clip — default is 2, wastes GPU
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

    # -------------------------------------------------------------------------
    # REPAINT — pure GPU work, receives pre-downloaded file paths
    #
    # Audio is downloaded by the CPU preprocessor (preprocess_audio) BEFORE
    # this method is called. No network calls here — GPU time is not wasted
    # on downloads.
    #
    # Confirmed params from source inspection:
    #   src_audio        = local file path → process_src_audio → sf.read()
    #   reference_audio  = local file path → process_reference_audio → sf.read()
    #   task_type        = "repaint" | "continuation" | "remix" | "extract"
    #   repainting_start/end = seconds within the audio
    #   audio_cover_strength = 0.0..1.0 (0=keep source, 1=full repaint)
    #   cover_noise_strength = 0.0..1.0 (noise added before repainting)
    #   use_adg          = Adaptive Diffusion Guidance
    # -------------------------------------------------------------------------
    @modal.method()
    def repaint(
        self,
        *,
        # Pre-downloaded local file paths (set by CPU preprocessor)
        src_audio_path: str,
        src_duration: float,
        repainting_start: float,
        repainting_end: float,
        # Prompt
        prompt: str,
        lyrics: str = "[inst]",
        # Task
        task_type: str = "repaint",
        # Optional style reference (local path, None if not provided)
        reference_audio_path: str | None = None,
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
        # Output
        output_format: str = "wav",
    ) -> dict:
        import uuid, shutil

        save_dir = f"/tmp/ace_{uuid.uuid4().hex}"
        os.makedirs(save_dir, exist_ok=True)

        try:
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
                # batch_size=1 — only one output needed
                batch_size=1,
                # Repaint-specific params
                src_audio=src_audio_path,
                reference_audio=reference_audio_path,
                repainting_start=repainting_start,
                repainting_end=repainting_end,
                task_type=task_type,
                audio_cover_strength=audio_cover_strength,
                cover_noise_strength=cover_noise_strength,
                # Diffusion
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
# CPU preprocessor — downloads + validates audio, then hands off to GPU
#
# Runs on cheap CPU container, NOT on the GPU.
# GPU billing only starts when MusicGenerator.repaint() is called.
# ---------------------------------------------------------------------------
@app.function(
    image=cpu_image,
    secrets=[modal.Secret.from_name("ace-step-secrets")],
    timeout=180,   # 3 min: download + validate, not generation
)
def preprocess_audio(
    src_audio_url: str,
    reference_audio_url: str | None,
    repainting_start: float,
    repainting_end: float | None,
) -> dict:
    """
    CPU-only step: download audio files from Cloudinary, validate them,
    return local paths + metadata for the GPU repaint step.
    Runs on a cheap CPU container — GPU is not billed during this step.
    """
    import soundfile as sf
    import tempfile

    work_dir = tempfile.mkdtemp(prefix="ace_pre_")

    # ── Download source audio ────────────────────────────────────────────────
    print(f"⬇️  Downloading source: {src_audio_url}")
    src_path = _download_audio(src_audio_url, work_dir)

    # Validate and get metadata
    try:
        info = sf.info(src_path)
    except Exception as e:
        raise ValueError(f"Source audio unreadable: {e}") from e

    actual_duration = info.duration
    if actual_duration < 1.0:
        raise ValueError(f"Source audio too short: {actual_duration:.2f}s")

    print(f"📏 Source: {actual_duration:.2f}s | {info.samplerate}Hz | {info.channels}ch")

    # Clamp repainting_end to actual duration
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

    # ── Download reference audio if provided ────────────────────────────────
    ref_path = None
    if reference_audio_url:
        print(f"⬇️  Downloading reference: {reference_audio_url}")
        ref_path = _download_audio(reference_audio_url, work_dir)
        try:
            sf.info(ref_path)
        except Exception as e:
            raise ValueError(f"Reference audio unreadable: {e}") from e

    return {
        "src_path": src_path,
        "ref_path": ref_path,
        "actual_duration": actual_duration,
        "repainting_start": repainting_start,
        "repainting_end": repaint_end,
        "work_dir": work_dir,
    }


# ---------------------------------------------------------------------------
# FastAPI gateway — CPU-only, no GPU cost
# ---------------------------------------------------------------------------
web_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("fastapi[standard]==0.115.4", "pydantic==2.10.1")
)


@app.function(
    image=web_image,
    secrets=[modal.Secret.from_name("ace-step-secrets")],
    timeout=660,  # slightly above MusicGenerator timeout to avoid gateway cutting off first
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

    # ── /generate ────────────────────────────────────────────────────────────
    class GenerateRequest(BaseModel):
        prompt: str        = Field(..., description="Style/genre description")
        lyrics: str        = Field("[inst]", description="Lyrics or '[inst]' for instrumental")
        duration: float    = Field(30.0, ge=10.0, le=300.0)
        output_format: str = Field("wav", pattern="^(mp3|wav|flac)$")
        infer_step: int    = Field(12, ge=4, le=20)
        seed: int          = Field(-1, description="-1 for random")
        bpm: str           = Field("", description="e.g. '128'. Empty = auto")
        key: str           = Field("", description="e.g. 'C major'. Empty = auto")
        language: str      = Field("en")

    class GenerateResponse(BaseModel):
        url: str
        duration: float
        seed: int

    # ── /repaint ─────────────────────────────────────────────────────────────
    class RepaintRequest(BaseModel):
        # Source audio (Cloudinary URL — uploaded directly from browser)
        src_audio_url: str = Field(..., description="Cloudinary URL of audio to edit")
        # Section to repaint
        repainting_start: float  = Field(0.0, ge=0.0, description="Start of section (seconds)")
        repainting_end: Optional[float] = Field(None, description="End of section (seconds). None = end of file")
        # Prompt
        prompt: str  = Field(..., description="Description for the repainted section")
        lyrics: str  = Field("[inst]", description="Lyrics or '[inst]' for instrumental")
        # Task type
        task_type: str = Field(
            "repaint",
            pattern="^(repaint|continuation|remix|extract)$",
            description=(
                "repaint: rewrite a section, keep the rest. "
                "continuation: extend audio from repainting_start onward. "
                "remix: style transfer using reference_audio. "
                "extract: stem extraction using reference_audio."
            ),
        )
        # Optional style reference for remix / guided repaint
        reference_audio_url: Optional[str] = Field(
            None,
            description="Cloudinary URL of style reference audio (remix/extract only)"
        )
        # Blending controls
        audio_cover_strength: float = Field(1.0, ge=0.0, le=1.0, description="0=keep source, 1=full repaint")
        cover_noise_strength: float = Field(0.0, ge=0.0, le=1.0, description="Noise added before repainting")
        # Quality
        infer_step: int       = Field(8, ge=1, le=8, description="Max 8 for turbo model")
        guidance_scale: float = Field(15.0, ge=1.0, le=30.0)
        seed: int             = Field(-1, description="-1 for random")
        # Music metadata
        bpm: str     = Field("", description="e.g. '128'. Empty = auto")
        key: str     = Field("", description="e.g. 'C major'. Empty = auto")
        language: str = Field("en")
        # Advanced diffusion
        infer_method: str         = Field("ode", pattern="^(ode|euler)$")
        cfg_interval_start: float = Field(0.0, ge=0.0, le=1.0)
        cfg_interval_end: float   = Field(1.0, ge=0.0, le=1.0)
        shift: float              = Field(1.0)
        use_adg: bool             = Field(False, description="Adaptive Diffusion Guidance")
        output_format: str        = Field("wav", pattern="^(mp3|wav|flac)$")

    class RepaintResponse(BaseModel):
        url: str
        duration: float
        seed: int
        repainting_start: float
        repainting_end: float
        task_type: str

    # ── Routes ───────────────────────────────────────────────────────────────
    @web.get("/health")
    async def health():
        return {"status": "ok", "dit": DIT_MODEL, "lm": LLM_MODEL}

    @web.get("/warmup")
    async def warmup(_=Depends(require_key)):
        """Call when user opens Edit page — spins up GPU container in background."""
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
        # Step 1: CPU preprocessing — download + validate (free, no GPU billing)
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

        # Step 2: GPU generation — receives local file paths, no network calls
        generator = MusicGenerator()
        try:
            result = await generator.repaint.remote.aio(
                src_audio_path=pre["src_path"],
                src_duration=pre["actual_duration"],
                repainting_start=pre["repainting_start"],
                repainting_end=pre["repainting_end"],
                prompt=req.prompt,
                lyrics=req.lyrics,
                task_type=req.task_type,
                reference_audio_path=pre["ref_path"],
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
        finally:
            # Clean up work_dir from preprocessor regardless of outcome
            import shutil
            shutil.rmtree(pre.get("work_dir", ""), ignore_errors=True)

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