from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from src.database import get_db
from src.cores.models.user import User
from src.utils.security import decode_token

# Sử dụng HTTPBearer để client gửi token qua header 'Authorization: Bearer <token>'
security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Middleware Dependency xác thực danh tính người dùng thông qua Access Token.
    Nếu không có token hoặc token không hợp lệ, trả về mã lỗi 401 Unauthorized.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yêu cầu mã xác thực AccessToken để truy cập tài nguyên này."
        )

    token = credentials.credentials
    payload = decode_token(token)

    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AccessToken không hợp lệ hoặc đã hết hạn."
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Không tìm thấy danh tính người dùng trong token."
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tài khoản người dùng liên kết với token này không tồn tại."
        )

    return user


def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Middleware Dependency xác thực tùy chọn (Optional Auth).
    Nếu client gửi AccessToken hợp lệ -> trả về đối tượng User.
    Nếu không có token hoặc token đã hết hạn -> trả về None mà không chặn (không ném mã lỗi 401).
    Phù hợp cho các chức năng tự động hóa cục bộ như RPA Robot.
    """
    if not credentials:
        return None

    try:
        token = credentials.credentials
        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            return None

        user_id = payload.get("sub")
        if not user_id:
            return None

        return db.query(User).filter(User.id == int(user_id)).first()
    except Exception:
        return None


def require_roles(allowed_roles: List[str]):
    """
    Kiểm tra phân quyền dựa trên vai trò (Role-Based Access Control - RBAC).
    Chỉ cho phép người dùng có vai trò nằm trong danh sách được cấp phép.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = current_user.role.role_name if current_user.role else "USER"
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Quyền hạn bị từ chối. Yêu cầu một trong các vai trò: {', '.join(allowed_roles)}"
            )
        return current_user

    return role_checker

