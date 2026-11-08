import re
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.cores.middlewares.auth_middleware import get_current_user, get_optional_current_user
from src.cores.models.user import User
from src.modules.ai_automation.models.ai_preset import AIPreset, DEFAULT_AI_PRESETS
from src.modules.ai_automation.schemas.rpa_schema import (
    StartRPARequest,
    AIPresetCreateRequest,
    AIPresetUpdateRequest
)
from src.modules.ai_automation.services.rpa_chatgpt_service import RPAChatGPTService
from src.utils.responses import success_response

rpa_router = APIRouter(prefix="/rpa", tags=["AI RPA Automation"])


@rpa_router.get("/presets", summary="Lấy danh sách các cấu hình nền tảng AI")
def get_ai_presets(db: Session = Depends(get_db)):
    """
    Trả về danh sách toàn bộ các cấu hình AI có sẵn (ChatGPT, Claude, Gemini, DeepSeek, Poe...)
    và các cấu hình do người dùng tự định nghĩa trong PostgreSQL.
    """
    try:
        presets = db.query(AIPreset).order_by(AIPreset.id.asc()).all()
        if not presets:
            # Tự động nạp các preset mặc định nếu bảng đang rỗng
            for item in DEFAULT_AI_PRESETS:
                db.add(AIPreset(**item))
            db.commit()
            presets = db.query(AIPreset).order_by(AIPreset.id.asc()).all()

        preset_list = [p.to_dict() for p in presets]
    except Exception:
        preset_list = DEFAULT_AI_PRESETS

    return success_response(
        data={"presets": preset_list},
        message="Lấy danh sách cấu hình nền tảng AI thành công."
    )


@rpa_router.post("/presets", status_code=status.HTTP_201_CREATED, summary="Thêm cấu hình nền tảng AI mới")
def create_ai_preset(
    payload: AIPresetCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lưu thêm một cấu hình nền tảng AI mới vào PostgreSQL để dùng lại vĩnh viễn."""
    existing = db.query(AIPreset).filter(AIPreset.platform_code == payload.platform_code.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Mã nền tảng '{payload.platform_code}' đã tồn tại trong hệ thống."
        )

    new_preset = AIPreset(
        name=payload.name.strip(),
        platform_code=payload.platform_code.lower().strip(),
        target_url=payload.target_url.strip(),
        input_selectors=payload.input_selectors.strip(),
        send_btn_selectors=payload.send_btn_selectors.strip(),
        stop_btn_selectors=payload.stop_btn_selectors.strip(),
        notes=payload.notes.strip() if payload.notes else None,
        is_built_in=False
    )
    db.add(new_preset)
    db.commit()
    db.refresh(new_preset)

    return success_response(
        data=new_preset.to_dict(),
        message=f"Đã lưu thành công cấu hình nền tảng '{new_preset.name}' vào PostgreSQL.",
        status_code=status.HTTP_201_CREATED
    )


@rpa_router.delete("/presets/{preset_id}", summary="Xóa cấu hình nền tảng AI tùy biến")
def delete_ai_preset(
    preset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Xóa cấu hình nền tảng AI tùy biến (không cho phép xóa cấu hình mặc định của hệ thống)."""
    preset = db.query(AIPreset).filter(AIPreset.id == preset_id).first()
    if not preset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy cấu hình này.")

    if preset.is_built_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xóa cấu hình mặc định tích hợp sẵn của hệ thống."
        )

    db.delete(preset)
    db.commit()

    return success_response(
        data={"deleted_id": preset_id},
        message="Đã xóa cấu hình nền tảng thành công."
    )


@rpa_router.post("/start", summary="Bắt đầu tự động hóa gõ vào AI Web")
def start_rpa(payload: StartRPARequest, current_user: Optional[User] = Depends(get_optional_current_user)):
    """
    Tiếp nhận danh sách các đoạn văn bản, phân tách và khởi chạy Robot
    gõ tuần tự vào ChatGPT, Claude, Gemini hoặc web AI bất kỳ trong một luồng nền độc lập.
    """
    if RPAChatGPTService.state.is_running:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Hiện đang có một tác vụ tự động hóa đang chạy. Vui lòng dừng hoặc chờ tác vụ hiện tại hoàn thành!"
        )

    # Phân tách văn bản thành danh sách các đoạn prompt
    raw_text = payload.prompts_text.strip()
    if not raw_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng cung cấp nội dung các đoạn văn bản cần gửi!"
        )

    if payload.split_mode == "line":
        prompts = [p.strip() for p in raw_text.split("\n") if p.strip()]
    else:
        # Phân tách theo đoạn văn (hai lần xuống dòng)
        prompts = [p.strip() for p in re.split(r"\n\s*\n+", raw_text) if p.strip()]

    if not prompts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không tìm thấy đoạn văn bản hợp lệ sau khi phân tách."
        )

    # Gộp đoạn theo batch_size và tự động chèn câu lệnh mở đầu nếu được bật
    batch_size = max(1, payload.batch_size or 1)
    batched_prompts = []
    batch_idx = 1
    for i in range(0, len(prompts), batch_size):
        chunk = prompts[i:i + batch_size]
        combined = "\n\n".join(chunk)
        if payload.enable_prefix_header:
            tpl = payload.prefix_template or "hãy tạo cho tôi {count} đợt {batch} {code}"
            header = (
                tpl.replace("{count}", str(len(chunk)))
                   .replace("{batch}", str(batch_idx))
                   .replace("{code}", (payload.special_code or "").strip())
                   .strip()
            )
            if not header.endswith(":"):
                header += ":"
            combined = f"{header}\n\n{combined}"
        batched_prompts.append(combined)
        batch_idx += 1
    prompts = batched_prompts

    RPAChatGPTService.start_in_background(
        target_url=payload.target_url,
        prompts=prompts,
        platform_code=payload.platform_code,
        custom_input_selector=payload.custom_input_selector,
        custom_send_selector=payload.custom_send_selector,
        custom_stop_selector=payload.custom_stop_selector,
        loop_count=payload.loop_count or 1,
        duration_minutes=payload.duration_minutes or 0.0,
        delay_between_prompts=payload.delay_between_prompts or 4.0
    )

    return success_response(
        data={"total_prompts": len(prompts), "target_url": payload.target_url},
        message=f"Đã khởi chạy Robot tự động gõ {len(prompts)} đoạn văn bản vào {payload.target_url}."
    )


@rpa_router.get("/status", summary="Lấy tiến độ và nhật ký chạy thời gian thực")
def get_rpa_status(current_user: Optional[User] = Depends(get_optional_current_user)):
    """Lấy trạng thái tiến độ thời gian thực của Robot cho giao diện theo dõi."""
    return success_response(
        data={
            "is_running": RPAChatGPTService.state.is_running,
            "current_index": RPAChatGPTService.state.current_index,
            "total_prompts": RPAChatGPTService.state.total_prompts,
            "current_prompt": RPAChatGPTService.state.current_prompt,
            "status_message": RPAChatGPTService.state.status_message,
            "logs": RPAChatGPTService.state.logs
        },
        message="Lấy trạng thái Robot thành công."
    )


@rpa_router.post("/stop", summary="Dừng khẩn cấp tiến trình Robot")
def stop_rpa(current_user: Optional[User] = Depends(get_optional_current_user)):
    """Gửi tín hiệu yêu cầu Robot dừng lại an toàn."""
    RPAChatGPTService.stop()
    return success_response(
        data={"stop_requested": True},
        message="Đã gửi tín hiệu dừng Robot."
    )


@rpa_router.post("/open-browser", summary="Mở Chrome Robot độc lập để đăng nhập sẵn")
def open_browser(payload: Optional[Dict[str, Any]] = None, current_user: Optional[User] = Depends(get_optional_current_user)):
    """
    Mở cửa sổ Chrome riêng biệt của Robot để người dùng đăng nhập tài khoản AI (ChatGPT, Claude, v.v.).
    Hoàn toàn không can thiệp, không tắt Chrome đang dùng (Không cần out máy).
    """
    url = (payload or {}).get("target_url") or "https://chatgpt.com"
    RPAChatGPTService.open_login_browser(url)
    return success_response(
        data={"opened": True, "target_url": url},
        message="Đã mở cửa sổ Chrome Robot độc lập! Bạn có thể đăng nhập tài khoản mà không sợ tắt các tab Chrome đang xem."
    )


@rpa_router.post("/sync-profile", summary="Đồng bộ nick Google và tài khoản AI từ Chrome thật")
def sync_chrome_profile(current_user: Optional[User] = Depends(get_optional_current_user)):
    """
    Sao chép an toàn Cookies, LocalStorage và Session của Google/ChatGPT/Claude
    từ trình duyệt Chrome thật của người dùng sang Profile của Robot.
    """
    success = RPAChatGPTService.sync_chrome_profile()
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể đồng bộ hồ sơ Chrome. Vui lòng đảm bảo Chrome đã được cài đặt trên máy."
        )

    return success_response(
        data={"synced": True},
        message="Đã đồng bộ tài khoản Google và toàn bộ phiên đăng nhập từ Chrome thật của bạn thành công!"
    )


# --- CÁC ENDPOINT CHO CLOUD GPU WORKER (GOOGLE COLAB / RUNPOD / OLLAMA) ---

@rpa_router.post("/cloud-worker/test", summary="Kiểm tra kết nối Cloud GPU Worker")
async def test_cloud_worker(payload: Dict[str, Any]):
    """
    Kiểm tra trạng thái kết nối tới Cloud GPU Worker (Ollama, vLLM, Colab Tunnel, RunPod).
    """
    from src.modules.ai_automation.services.cloud_worker_service import CloudWorkerService
    worker_url = payload.get("worker_url", "")
    result = await CloudWorkerService.test_connection(worker_url)
    return success_response(
        data=result,
        message=result.get("message", "Đã kiểm tra kết nối Cloud Worker.")
    )


@rpa_router.post("/cloud-worker/generate", summary="Sinh văn bản/prompt qua Cloud GPU Worker")
async def generate_with_cloud_worker(payload: Dict[str, Any]):
    """
    Gửi prompt trực tiếp lên GPU Cloud để sinh kết quả mà máy tính cá nhân không tốn CPU/GPU.
    """
    from src.modules.ai_automation.services.cloud_worker_service import CloudWorkerService
    worker_url = payload.get("worker_url", "")
    prompt = payload.get("prompt", "")
    model = payload.get("model")
    system_prompt = payload.get("system_prompt", "")

    if not worker_url or not prompt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng cung cấp đầy đủ worker_url và prompt."
        )

    try:
        res = await CloudWorkerService.generate_text(
            worker_url=worker_url,
            prompt=prompt,
            model=model,
            system_prompt=system_prompt
        )
        return success_response(
            data=res,
            message="Xử lý trên Cloud GPU thành công!"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Lỗi Cloud Worker: {str(e)}"
        )


# --- CÁC ENDPOINT CHO AI STUDIO NỘI BỘ (TỰ TẠO ẢNH & VIDEO TRỰC TIẾP) ---

@rpa_router.post("/ai-studio/test", summary="Kiểm tra kết nối GPU Worker của AI Studio")
async def test_ai_studio_worker(payload: Dict[str, Any]):
    """Kiểm tra xem máy chủ Cloud GPU có sẵn sàng sinh ảnh và video không."""
    from src.modules.ai_automation.services.ai_studio_service import AIStudioService
    worker_url = payload.get("worker_url", "")
    result = await AIStudioService.test_connection(worker_url)
    return success_response(data=result, message=result.get("message", "Đã kiểm tra kết nối."))


@rpa_router.post("/ai-studio/generate-single", summary="Sinh 1 ảnh hoặc 1 video đơn lẻ qua AI Studio")
async def generate_single_ai_studio(payload: Dict[str, Any]):
    """Sinh thử 1 ảnh hoặc video từ prompt đơn lẻ."""
    from src.modules.ai_automation.services.ai_studio_service import AIStudioService
    worker_url = payload.get("worker_url", "")
    prompt = payload.get("prompt", "")
    aspect_ratio = payload.get("aspect_ratio", "16:9")
    mode = payload.get("mode", "image")  # 'image' or 'pipeline'

    if not worker_url or not prompt:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp worker_url và prompt.")

    try:
        img_res = await AIStudioService.generate_single_image(
            worker_url=worker_url,
            prompt=prompt,
            aspect_ratio=aspect_ratio
        )
        vid_res = None
        if mode == "pipeline" and img_res.get("image_base64"):
            vid_res = await AIStudioService.generate_single_video(
                worker_url=worker_url,
                image_base64=img_res["image_base64"],
                prompt=prompt
            )

        return success_response(
            data={"image": img_res, "video": vid_res},
            message="Đã tạo thành công qua AI Studio!"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@rpa_router.post("/ai-studio/batch/start", summary="Bắt đầu tạo hàng loạt ảnh và video nội bộ")
async def start_ai_studio_batch(payload: Dict[str, Any]):
    """
    Bắt đầu tiến trình tạo hàng loạt ảnh và video từ danh sách prompt.
    Tự động lưu vào thư mục máy tính và không cần mở tab Chrome bên ngoài.
    """
    from src.modules.ai_automation.services.ai_studio_service import AIStudioService
    worker_url = payload.get("worker_url", "")
    prompts = payload.get("prompts", [])
    folder_name = payload.get("folder_name", "prompts_video")
    generate_video = payload.get("generate_video", True)
    aspect_ratio = payload.get("aspect_ratio", "16:9")

    if not worker_url:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp worker_url.")
    if not prompts or not isinstance(prompts, list):
        raise HTTPException(status_code=400, detail="Danh sách prompt không được rỗng.")

    try:
        res = AIStudioService.start_batch(
            worker_url=worker_url,
            prompts=prompts,
            folder_name=folder_name,
            generate_video=generate_video,
            aspect_ratio=aspect_ratio
        )
        if not res.get("started"):
            raise HTTPException(status_code=409, detail=res.get("message"))

        return success_response(data=res, message=res.get("message"))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@rpa_router.get("/ai-studio/batch/status", summary="Lấy tiến độ tạo hàng loạt thời gian thực")
def get_ai_studio_status():
    """Lấy trạng thái tiến độ thời gian thực của AI Studio."""
    from src.modules.ai_automation.services.ai_studio_service import AIStudioService
    return success_response(data=AIStudioService.get_status(), message="Cập nhật trạng thái thành công.")


@rpa_router.post("/ai-studio/batch/stop", summary="Dừng tiến trình AI Studio đang chạy")
def stop_ai_studio_batch():
    """Dừng tiến trình tạo hàng loạt AI Studio."""
    from src.modules.ai_automation.services.ai_studio_service import AIStudioService
    res = AIStudioService.stop_batch()
    return success_response(data=res, message=res.get("message"))


@rpa_router.get("/ai-studio/gallery", summary="Lấy danh sách ảnh và video đã tạo trong thư mục")
def get_ai_studio_gallery(folder_name: str = "prompts_video"):
    """Quét và lấy toàn bộ ảnh và video đã tạo trong thư mục."""
    from src.modules.ai_automation.services.ai_studio_service import AIStudioService
    res = AIStudioService.list_gallery(folder_name)
    return success_response(data=res, message="Lấy danh sách thư viện media thành công.")


