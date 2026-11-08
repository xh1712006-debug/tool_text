"""
Tune-Text AI Studio Cloud Worker Server
Máy chủ sinh Hình ảnh (Text-to-Image) & Video (Image-to-Video) mã nguồn mở.
Có thể chạy trên Google Colab T4 miễn phí, RunPod, Vast.ai hoặc máy chủ GPU cá nhân.
"""

import os
import io
import time
import base64
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

app = FastAPI(title="Tune-Text AI Studio GPU Worker", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DTYPE = torch.float16 if torch.cuda.is_available() else torch.float32

pipe_image = None
pipe_video = None
MODEL_STATUS = {"image": "not_loaded", "video": "not_loaded"}


def get_gpu_name():
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        vram_gb = round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 1)
        return f"{gpu_name} ({vram_gb} GB VRAM)"
    return "CPU (No GPU detected)"


def load_image_pipeline():
    global pipe_image, MODEL_STATUS
    if pipe_image is not None:
        return pipe_image

    print(f"[{time.strftime('%H:%M:%S')}] ⏳ Đang nạp mô hình Text-to-Image (SDXL Lightning)...")
    try:
        from diffusers import StableDiffusionXLPipeline, UNet2DConditionModel, EulerDiscreteScheduler
        from huggingface_hub import hf_hub_download

        base_model = "stabilityai/stable-diffusion-xl-base-1.0"
        repo = "ByteDance/SDXL-Lightning"
        ckpt = "sdxl_lightning_4step_unet.safetensors"

        # Tải UNet 4-step Lightning tối ưu tốc độ 2s/ảnh
        unet = UNet2DConditionModel.from_config(base_model, subfolder="unet").to(DEVICE, DTYPE)
        unet.load_state_dict(torch.load(hf_hub_download(repo, ckpt), map_location=DEVICE))

        pipe_image = StableDiffusionXLPipeline.from_pretrained(
            base_model,
            unet=unet,
            torch_dtype=DTYPE,
            variant="fp16"
        ).to(DEVICE)

        pipe_image.scheduler = EulerDiscreteScheduler.from_config(
            pipe_image.scheduler.config,
            timestep_spacing="trailing"
        )

        # Tiết kiệm VRAM cho card 16GB
        if torch.cuda.is_available():
            pipe_image.enable_attention_slicing()

        MODEL_STATUS["image"] = "SDXL-Lightning-4step"
        print(f"[{time.strftime('%H:%M:%S')}] ✅ Đã nạp thành công mô hình Text-to-Image!")
        return pipe_image
    except Exception as e:
        print(f"⚠️ Không thể tải SDXL Lightning ({e}), chuyển sang chế độ dự phòng SD 1.5...")
        try:
            from diffusers import AutoPipelineForText2Image
            pipe_image = AutoPipelineForText2Image.from_pretrained(
                "runwayml/stable-diffusion-v1-5",
                torch_dtype=DTYPE
            ).to(DEVICE)
            MODEL_STATUS["image"] = "SD-1.5"
            return pipe_image
        except Exception as e2:
            print(f"❌ Lỗi nạp model: {e2}")
            MODEL_STATUS["image"] = f"error: {str(e2)}"
            return None


def load_video_pipeline():
    global pipe_video, MODEL_STATUS
    if pipe_video is not None:
        return pipe_video

    print(f"[{time.strftime('%H:%M:%S')}] ⏳ Đang nạp mô hình Image-to-Video (SVD)...")
    try:
        from diffusers import StableVideoDiffusionPipeline

        pipe_video = StableVideoDiffusionPipeline.from_pretrained(
            "stabilityai/stable-video-diffusion-img2vid-xt",
            torch_dtype=DTYPE,
            variant="fp16"
        ).to(DEVICE)

        if torch.cuda.is_available():
            pipe_video.enable_model_cpu_offload()

        MODEL_STATUS["video"] = "SVD-XT"
        print(f"[{time.strftime('%H:%M:%S')}] ✅ Đã nạp thành công mô hình Image-to-Video!")
        return pipe_video
    except Exception as e:
        print(f"⚠️ Lỗi nạp mô hình SVD: {e}")
        MODEL_STATUS["video"] = f"error: {str(e)}"
        return None


# --- SCHEMAS ---

class GenerateImageRequest(BaseModel):
    prompt: str
    negative_prompt: Optional[str] = "ugly, blurry, low quality, distorted, extra limbs, watermark"
    aspect_ratio: Optional[str] = "16:9"  # 16:9, 1:1, 9:16
    steps: Optional[int] = 4
    seed: Optional[int] = None


class GenerateVideoRequest(BaseModel):
    image_base64: str
    prompt: Optional[str] = ""
    num_frames: Optional[int] = 25
    fps: Optional[int] = 8
    motion_bucket_id: Optional[int] = 127


# --- ENDPOINTS ---

@app.get("/health")
@app.get("/info")
def health_check():
    return {
        "status": "ready",
        "gpu": get_gpu_name(),
        "device": DEVICE,
        "models": ["SDXL-Lightning (Text-to-Image)", "SVD-XT (Image-to-Video)"],
        "model_status": MODEL_STATUS,
        "timestamp": int(time.time())
    }


@app.post("/api/generate-image")
def api_generate_image(req: GenerateImageRequest):
    if not req.prompt:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp prompt.")

    pipe = load_image_pipeline()
    if pipe is None:
        raise HTTPException(status_code=500, detail="Mô hình Text-to-Image chưa sẵn sàng trên GPU Worker.")

    # Tính toán kích thước theo tỉ lệ
    width, height = 1024, 576  # 16:9
    if req.aspect_ratio == "9:16":
        width, height = 576, 1024
    elif req.aspect_ratio == "1:1":
        width, height = 1024, 1024

    generator = None
    if req.seed is not None:
        generator = torch.Generator(device=DEVICE).manual_seed(req.seed)

    print(f"[{time.strftime('%H:%M:%S')}] 🎨 Bắt đầu vẽ ảnh: {req.prompt[:60]}... ({width}x{height})")
    start = time.time()

    try:
        with torch.inference_mode():
            image = pipe(
                prompt=req.prompt,
                negative_prompt=req.negative_prompt,
                width=width,
                height=height,
                num_inference_steps=req.steps or 4,
                guidance_scale=0.0 if "lightning" in MODEL_STATUS.get("image", "").lower() else 7.0,
                generator=generator
            ).images[0]

        # Chuyển ảnh PIL thành chuỗi base64 PNG
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        elapsed = round(time.time() - start, 2)
        print(f"[{time.strftime('%H:%M:%S')}] ✅ Vẽ ảnh hoàn tất trong {elapsed}s!")

        return {
            "success": True,
            "image_base64": f"data:image/png;base64,{img_str}",
            "width": width,
            "height": height,
            "elapsed_seconds": elapsed
        }
    except Exception as e:
        print(f"❌ Lỗi khi sinh ảnh: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-video")
def api_generate_video(req: GenerateVideoRequest):
    if not req.image_base64:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp image_base64.")

    pipe = load_video_pipeline()
    if pipe is None:
        raise HTTPException(status_code=500, detail="Mô hình Image-to-Video chưa sẵn sàng trên GPU Worker.")

    import tempfile
    from PIL import Image
    from diffusers.utils import export_to_video

    # Giải mã ảnh PIL
    raw_b64 = req.image_base64
    if "," in raw_b64:
        raw_b64 = raw_b64.split(",", 1)[1]
    image_bytes = base64.b64decode(raw_b64)
    input_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # Resize để phù hợp với SVD (1024x576)
    input_image = input_image.resize((1024, 576), Image.LANCZOS)

    print(f"[{time.strftime('%H:%M:%S')}] 🎬 Bắt đầu kết xuất video...")
    start = time.time()

    try:
        with torch.inference_mode():
            frames = pipe(
                input_image,
                decode_chunk_size=8,
                motion_bucket_id=req.motion_bucket_id or 127,
                fps=req.fps or 8,
                num_frames=req.num_frames or 25
            ).frames[0]

        # Xuất video MP4 tạm thời
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp_file:
            tmp_video_path = tmp_file.name

        export_to_video(frames, tmp_video_path, fps=req.fps or 8)

        with open(tmp_video_path, "rb") as vf:
            video_bytes = vf.read()

        try:
            os.remove(tmp_video_path)
        except Exception:
            pass

        vid_str = base64.b64encode(video_bytes).decode("utf-8")
        elapsed = round(time.time() - start, 2)
        print(f"[{time.strftime('%H:%M:%S')}] 🎉 Kết xuất video hoàn tất trong {elapsed}s!")

        return {
            "success": True,
            "video_base64": f"data:video/mp4;base64,{vid_str}",
            "frames": len(frames),
            "fps": req.fps or 8,
            "elapsed_seconds": elapsed
        }
    except Exception as e:
        print(f"❌ Lỗi khi sinh video: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

