import os
from pathlib import Path
from typing import Optional
from uuid import uuid4

import modal

# Define the environment our generation runs in
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git", "ffmpeg")
    .uv_pip_install(
        "torch==2.8.0",
        "torchaudio==2.8.0",
        "git+https://github.com/ace-step/ACE-Step.git@6ae0852b1388de6dc0cca26b31a86d711f723cb3",
        "numba==0.63.1",
        "cloudinary==1.41.0",
    )
)

def load_model(and_return=False):
    from acestep.pipeline_ace_step import ACEStepPipeline
    model = ACEStepPipeline(dtype="bfloat16", cpu_offload=False, overlapped_decode=True)
    if and_return:
        return model

# Setup Cloud Cache for model weights
cache_dir = "/root/.cache/ace-step/checkpoints"
model_cache = modal.Volume.from_name("ACE-Step-model-cache", create_if_missing=True)

image = image.env(
    {"HF_HUB_CACHE": cache_dir, "HF_HUB_ENABLE_HF_TRANSER": "1"}
).run_function(load_model, volumes={cache_dir: model_cache})

app = modal.App("ace-music-generator-api")

# Define the logic that actually runs the model on the GPU
@app.cls(gpu="l40s", image=image, volumes={cache_dir: model_cache}, secrets=[modal.Secret.from_dotenv()])
class MusicGenerator:
    @modal.enter()
    def init(self):
        import cloudinary
        import cloudinary.uploader
        from acestep.pipeline_ace_step import ACEStepPipeline

        self.model: ACEStepPipeline = load_model(and_return=True)
        
        # Configure Cloudinary
        cloudinary.config(
            cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
            api_key=os.environ.get("CLOUDINARY_API_KEY"),
            api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
            secure=True,
        )

    @modal.method()
    def run(
        self,
        prompt: str,
        lyrics: str,
        duration: float = 60.0,
        format: str = "wav",
        manual_seeds: Optional[int] = 1,
    ) -> str:
        """Generates the music and uploads to Cloudinary, returning the URL"""
        import uuid
        import cloudinary.uploader

        output_path = f"/dev/shm/output_{uuid.uuid4().hex}.{format}"
        print("Generating music...")
        
        self.model(
            audio_duration=duration,
            prompt=prompt,
            lyrics=lyrics,
            format=format,
            save_path=output_path,
            manual_seeds=manual_seeds,
            infer_step=60,
            guidance_scale=15,
            scheduler_type="euler",
            cfg_type="apg",
            omega_scale=10,
            guidance_interval=0.5,
            guidance_interval_decay=0,
            min_guidance_scale=3,
            use_erg_tag=True,
            use_erg_lyric=True,
            use_erg_diffusion=True,
        )
        
        print("Music generated. Uploading to Cloudinary...")
        # Upload to Cloudinary using their API
        upload_result = cloudinary.uploader.upload(
            output_path,
            resource_type="video", # Audio files are treated as 'video' in Cloudinary
            folder="ace_music_generator"
        )
        
        print(f"Upload complete: {upload_result['secure_url']}")
        return upload_result["secure_url"]


# --- FastAPI Application ---
web_image = modal.Image.debian_slim(python_version="3.12").uv_pip_install(
    "fastapi[standard]==0.115.4", "pydantic==2.10.1"
)

@app.function(image=web_image)
@modal.asgi_app()
def api_endpoint():
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel

    web_app = FastAPI(title="ACE Music Generator API")

    # Add CORS middleware to allow the frontend to call this API
    web_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"], # For production, restrict this to your frontend domain
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    class GenerateRequest(BaseModel):
        prompt: str
        lyrics: str = "[inst]"
        duration: float = 30.0
        format: str = "wav"

    @web_app.post("/generate")
    async def generate_music(req: GenerateRequest):
        music_generator = MusicGenerator()
        generate = music_generator.run.remote
        
        # This calls the method on the GPU container
        cloudinary_url = await generate.aio(
            prompt=req.prompt,
            lyrics=req.lyrics,
            duration=req.duration,
            format=req.format
        )
        
        return {"url": cloudinary_url}

    return web_app
