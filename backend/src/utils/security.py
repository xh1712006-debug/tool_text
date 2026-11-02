from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Dict
import bcrypt
from jose import jwt, JWTError
from src.config import settings


def hash_password(password: str) -> str:
    """
    Băm mật khẩu sử dụng thư viện bcrypt trực tiếp.
    Cắt tối đa 72 bytes theo giới hạn chuẩn của thuật toán Bcrypt để chống tràn bộ nhớ.
    """
    password_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Đối chiếu mật khẩu người dùng nhập vào với chuỗi băm Bcrypt lưu trong PostgreSQL.
    """
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8")[:72],
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def create_access_token(subject: Any, role: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Tạo Access Token với thời hạn ngắn (mặc định 30 phút).
    Lưu id người dùng và vai trò để middleware có thể kiểm tra phân quyền RBAC nhanh chóng.
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    payload: Dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "type": "access",
        "exp": expire
    }
    encoded_jwt = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(subject: Any, expires_delta: Optional[timedelta] = None) -> str:
    """
    Tạo Refresh Token có thời hạn dài (mặc định 7 ngày) dùng để cấp lại Access Token mới.
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
    payload: Dict[str, Any] = {
        "sub": str(subject),
        "type": "refresh",
        "exp": expire
    }
    encoded_jwt = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Giải mã và xác minh tính toàn vẹn của chữ ký số JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None
