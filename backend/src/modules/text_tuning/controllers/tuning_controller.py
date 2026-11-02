from fastapi import HTTPException, status, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from src.modules.text_tuning.models.text_task import TextTask
from src.modules.text_tuning.services.tuning_service import TextTuningService
from src.modules.text_tuning.schemas.tuning_schema import CreateTextTaskRequest
from src.cores.models.user import User
from src.utils.responses import success_response


class TextTuningController:
    """
    Controller điều phối các nghiệp vụ Tinh chỉnh Văn bản & Tương tác Tệp tin (100% Free & Offline).
    """

    @staticmethod
    def create_task(payload: CreateTextTaskRequest, current_user: User, db: Session):
        # 1. Gọi Service để xử lý văn bản
        tuned_result = TextTuningService.process_text(payload.input_text, mode=payload.mode or "smart_tune")

        # 2. Lưu kết quả xử lý vào cơ sở dữ liệu PostgreSQL
        task = TextTask(
            title=payload.title,
            input_text=payload.input_text,
            tuned_text=tuned_result,
            status="COMPLETED",
            user_id=current_user.id
        )
        db.add(task)
        db.commit()
        db.refresh(task)

        task_data = {
            "id": task.id,
            "title": task.title,
            "input_text": task.input_text,
            "tuned_text": task.tuned_text,
            "status": task.status,
            "user_id": task.user_id,
            "created_at": task.created_at.isoformat() if task.created_at else None
        }
        return success_response(
            data=task_data,
            message="Tạo tác vụ và xử lý tinh chỉnh văn bản thành công.",
            status_code=status.HTTP_201_CREATED
        )

    @staticmethod
    def list_tasks(current_user: User, db: Session, q: str = None, skip: int = 0, limit: int = 20):
        # Tra cứu tác vụ với tính năng Tìm kiếm toàn văn trong PostgreSQL
        query = db.query(TextTask).filter(TextTask.user_id == current_user.id)
        
        if q and q.strip():
            search_pattern = f"%{q.strip()}%"
            query = query.filter(
                or_(
                    TextTask.title.ilike(search_pattern),
                    TextTask.input_text.ilike(search_pattern),
                    TextTask.tuned_text.ilike(search_pattern)
                )
            )

        tasks = query.order_by(TextTask.id.desc()).offset(skip).limit(limit).all()

        results = [
            {
                "id": t.id,
                "title": t.title,
                "input_text": t.input_text,
                "tuned_text": t.tuned_text,
                "status": t.status,
                "user_id": t.user_id,
                "created_at": t.created_at.isoformat() if t.created_at else None
            }
            for t in tasks
        ]
        return success_response(
            data={"total": len(results), "tasks": results, "search_keyword": q},
            message="Lấy danh sách tác vụ thành công."
        )

    @staticmethod
    def get_task(task_id: int, current_user: User, db: Session):
        task = db.query(TextTask).filter(
            TextTask.id == task_id,
            TextTask.user_id == current_user.id
        ).first()

        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy tác vụ xử lý văn bản có mã ID={task_id}."
            )

        task_data = {
            "id": task.id,
            "title": task.title,
            "input_text": task.input_text,
            "tuned_text": task.tuned_text,
            "status": task.status,
            "user_id": task.user_id,
            "created_at": task.created_at.isoformat() if task.created_at else None,
            "updated_at": task.updated_at.isoformat() if task.updated_at else None
        }
        return success_response(
            data=task_data,
            message="Lấy chi tiết tác vụ thành công."
        )

    @staticmethod
    def delete_task(task_id: int, current_user: User, db: Session):
        task = db.query(TextTask).filter(
            TextTask.id == task_id,
            TextTask.user_id == current_user.id
        ).first()

        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy tác vụ có ID={task_id} để xóa."
            )

        db.delete(task)
        db.commit()
        return success_response(
            data={"deleted_id": task_id},
            message="Xóa tác vụ thành công."
        )

    @staticmethod
    async def extract_file_text(file: UploadFile):
        """Tiếp nhận tệp đính kèm và trích xuất nội dung văn bản thuần."""
        try:
            content = await file.read()
            text = TextTuningService.extract_text_from_file(content, file.filename)
            return success_response(
                data={"filename": file.filename, "extracted_text": text},
                message=f"Trích xuất thành công văn bản từ tệp '{file.filename}'."
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Lỗi khi đọc tệp tin: {str(e)}"
            )

    @staticmethod
    def export_task_docx(task_id: int, current_user: User, db: Session):
        """Xuất tệp Word (.docx) của tác vụ cho người dùng tải về."""
        task = db.query(TextTask).filter(
            TextTask.id == task_id,
            TextTask.user_id == current_user.id
        ).first()

        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy tác vụ để xuất file."
            )

        file_stream = TextTuningService.create_docx_file(
            text_content=task.tuned_text or task.input_text,
            title=task.title
        )
        safe_filename = f"task_{task_id}_tuned.docx"

        return StreamingResponse(
            file_stream,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename={safe_filename}"}
        )
