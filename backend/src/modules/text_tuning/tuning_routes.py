from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from src.database import get_db
from src.modules.text_tuning.controllers.tuning_controller import TextTuningController
from src.modules.text_tuning.schemas.tuning_schema import CreateTextTaskRequest
from src.cores.middlewares.auth_middleware import get_current_user
from src.cores.models.user import User

# Router phân hệ nghiệp vụ Tinh chỉnh văn bản (Text Tuning)
tuning_router = APIRouter(prefix="/tuning", tags=["Text Tuning Module"])


@tuning_router.post("/tasks", status_code=201, summary="Tạo tác vụ xử lý văn bản mới")
def create_task(
    payload: CreateTextTaskRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Tiếp nhận văn bản đầu vào, thực hiện tinh chỉnh và lưu vào PostgreSQL."""
    return TextTuningController.create_task(payload, current_user, db)


@tuning_router.get("/tasks", summary="Lấy danh sách tác vụ (kèm tìm kiếm)")
def list_tasks(
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Trả về danh sách tác vụ của người dùng với tính năng tìm kiếm từ khóa trong PostgreSQL."""
    return TextTuningController.list_tasks(current_user, db, q, skip, limit)


@tuning_router.get("/tasks/{task_id}", summary="Lấy chi tiết tác vụ theo ID")
def get_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Trả về chi tiết văn bản gốc và văn bản đã tinh chỉnh theo ID tác vụ."""
    return TextTuningController.get_task(task_id, current_user, db)


@tuning_router.delete("/tasks/{task_id}", summary="Xóa tác vụ theo ID")
def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Xóa một tác vụ xử lý văn bản khỏi hệ thống."""
    return TextTuningController.delete_task(task_id, current_user, db)


@tuning_router.post("/extract-file", summary="Trích xuất văn bản từ tệp tin (.txt, .docx, .pdf)")
async def extract_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Đọc tệp tin người dùng tải lên và trích xuất thành văn bản thuần (100% Cục bộ & Miễn phí)."""
    return await TextTuningController.extract_file_text(file)


@tuning_router.get("/tasks/{task_id}/export-docx", summary="Xuất tác vụ ra tệp Word (.docx)")
def export_docx(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Tải về tệp Word của văn bản sau tinh chỉnh."""
    return TextTuningController.export_task_docx(task_id, current_user, db)
