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

    # Gộp đoạn nếu người dùng yêu cầu batch_size > 1 (Chế độ Gộp gửi hàng loạt)
    batch_size = max(1, payload.batch_size or 1)
    if batch_size > 1:
        batched_prompts = []
        for i in range(0, len(prompts), batch_size):
            chunk = prompts[i:i + batch_size]
            batched_prompts.append("\n\n".join(chunk))
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

