from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from src.cores.models.user import User
from src.cores.models.role import Role
from src.cores.models.session import SessionModel
from src.cores.schemas.auth_schema import UserRegisterRequest, UserLoginRequest, TokenRefreshRequest
from src.utils.security import (
    hash_password, 
    verify_password, 
    create_access_token, 
    create_refresh_token, 
    decode_token
)
from src.utils.responses import success_response
from src.config import settings


class AuthController:
    """
    Xử lý các nghiệp vụ xác thực người dùng bao gồm đăng ký, đăng nhập và làm mới token.
    Tuân thủ quy chuẩn bảo mật phân phối JWT theo docs/cores/04-security.md.
    """

    @staticmethod
    def register(payload: UserRegisterRequest, db: Session):
        # 1. Kiểm tra xem email đã được đăng ký trước đó hay chưa
        existing_user = db.query(User).filter(User.email == payload.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Địa chỉ email này đã được sử dụng bởi một tài khoản khác."
            )

        # 2. Tìm hoặc tự động tạo vai trò mặc định 'USER'
        default_role = db.query(Role).filter(Role.role_name == "USER").first()
        if not default_role:
            default_role = Role(role_name="USER", description="Vai trò người dùng thông thường")
            db.add(default_role)
            db.commit()
            db.refresh(default_role)

        # 3. Băm mật khẩu an toàn và lưu vào PostgreSQL
        new_user = User(
            email=payload.email,
            password_hash=hash_password(payload.password),
            full_name=payload.full_name,
            role_id=default_role.id
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        user_data = {
            "id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": default_role.role_name,
            "created_at": new_user.created_at.isoformat() if new_user.created_at else None
        }
        return success_response(
            data=user_data,
            message="Đăng ký tài khoản người dùng thành công.",
            status_code=status.HTTP_201_CREATED
        )

    @staticmethod
    def login(payload: UserLoginRequest, db: Session):
        # 1. Tra cứu người dùng theo email hoặc tên tài khoản (Ví dụ: admin12345)
        input_account = payload.email.strip()
        lookup_email = input_account if "@" in input_account else f"{input_account}@tunetext.local"

        user = db.query(User).filter(
            (User.email == input_account) | (User.email == lookup_email)
        ).first()

        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Thông tin đăng nhập tài khoản hoặc mật khẩu không chính xác."
            )

        # 2. Sinh cặp token AccessToken và RefreshToken
        # Nếu là tài khoản ADMIN (Super Admin), cấp token vô hạn có giá trị 100 năm (36.500 ngày)
        user_role = user.role.role_name if user.role else "USER"
        is_infinite = (user_role == "ADMIN" or "admin" in user.email.lower())
        expires_delta = timedelta(days=36500) if is_infinite else None

        access_token = create_access_token(subject=user.id, role=user_role, expires_delta=expires_delta)
        refresh_token = create_refresh_token(subject=user.id, expires_delta=expires_delta)

        # 3. Lưu thông tin phiên RefreshToken vào PostgreSQL để quản lý
        expires_at = datetime.now(timezone.utc) + (expires_delta if expires_delta else timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))
        session_entry = SessionModel(
            token=refresh_token,
            user_id=user.id,
            expires_at=expires_at
        )
        db.add(session_entry)
        db.commit()

        response_data = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user_role
            }
        }
        return success_response(
            data=response_data,
            message="Đăng nhập hệ thống thành công."
        )

    @staticmethod
    def refresh_access_token(payload: TokenRefreshRequest, db: Session):
        # 1. Giải mã token để lấy user_id
        decoded = decode_token(payload.refresh_token)
        if not decoded or decoded.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="RefreshToken không hợp lệ hoặc đã hết hạn."
            )

        # 2. Kiểm tra xem RefreshToken có tồn tại trong bảng sessions không
        session_record = db.query(SessionModel).filter(
            SessionModel.token == payload.refresh_token
        ).first()

        if not session_record:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Phiên làm việc này đã bị thu hồi hoặc không tồn tại."
            )

        # 3. Kiểm tra hạn sử dụng trong CSDL (Xử lý tương thích cả PostgreSQL và SQLite)
        expires_at = session_record.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < datetime.now(timezone.utc):
            db.delete(session_record)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại."
            )

        user = session_record.user
        user_role = user.role.role_name if user.role else "USER"
        is_infinite = (user_role == "ADMIN" or (user and user.email == "admin@tunetext.local"))
        expires_delta = timedelta(days=36500) if is_infinite else None
        new_access_token = create_access_token(subject=user.id, role=user_role, expires_delta=expires_delta)

        return success_response(
            data={"access_token": new_access_token, "token_type": "bearer"},
            message="Cấp mới AccessToken thành công."
        )
