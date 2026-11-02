from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.cores.controllers.auth_controller import AuthController
from src.cores.controllers.user_controller import UserController
from src.cores.schemas.auth_schema import UserRegisterRequest, UserLoginRequest, TokenRefreshRequest
from src.cores.middlewares.auth_middleware import get_current_user, require_roles
from src.cores.models.user import User

# Router cốt lõi dành cho Authentication & Users
cores_router = APIRouter()


# --- Phân hệ Xác thực (Auth Endpoints) ---
@cores_router.post("/auth/register", status_code=201, summary="Đăng ký tài khoản mới")
def register(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    """Đăng ký tài khoản người dùng mới và mã hóa mật khẩu trong PostgreSQL."""
    return AuthController.register(payload, db)


@cores_router.post("/auth/login", summary="Đăng nhập tài khoản")
def login(payload: UserLoginRequest, db: Session = Depends(get_db)):
    """Xác thực thông tin và cấp mã AccessToken cùng RefreshToken."""
    return AuthController.login(payload, db)


@cores_router.post("/auth/refresh", summary="Cấp mới Access Token")
def refresh_token(payload: TokenRefreshRequest, db: Session = Depends(get_db)):
    """Sử dụng Refresh Token còn hiệu lực để nhận lại Access Token mới."""
    return AuthController.refresh_access_token(payload, db)


# --- Phân hệ Người dùng (User Endpoints) ---
@cores_router.get("/users/me", summary="Lấy thông tin tài khoản hiện tại")
def get_current_profile(current_user: User = Depends(get_current_user)):
    """Yêu cầu Access Token để trả về thông tin người dùng đang đăng nhập."""
    return UserController.get_me(current_user)


@cores_router.get("/users", summary="Danh sách người dùng (Chỉ dành cho ADMIN)")
def list_users(
    skip: int = 0, 
    limit: int = 50, 
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles(["ADMIN"]))
):
    """Chỉ có tài khoản có vai trò ADMIN mới được phép truy cập endpoint này."""
    return UserController.list_users(db, skip, limit)

