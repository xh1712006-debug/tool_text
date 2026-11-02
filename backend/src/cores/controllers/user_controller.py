from typing import Optional
from sqlalchemy.orm import Session
from src.cores.models.user import User
from src.utils.responses import success_response


class UserController:
    """
    Quản lý thông tin hồ sơ người dùng và các tác vụ quản trị danh sách người dùng.
    """

    @staticmethod
    def get_me(current_user: User):
        """Trả về thông tin hồ sơ của tài khoản đang đăng nhập."""
        profile_data = {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "role": current_user.role.role_name if current_user.role else "USER",
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None
        }
        return success_response(
            data=profile_data,
            message="Lấy thông tin tài khoản thành công."
        )

    @staticmethod
    def list_users(db: Session, skip: int = 0, limit: int = 50):
        """Dành riêng cho Quản trị viên (ADMIN) xem danh sách người dùng hệ thống."""
        users = db.query(User).offset(skip).limit(limit).all()
        result = [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role.role_name if u.role else "USER",
                "created_at": u.created_at.isoformat() if u.created_at else None
            }
            for u in users
        ]
        return success_response(
            data={"total": len(result), "users": result},
            message="Lấy danh sách người dùng thành công."
        )

