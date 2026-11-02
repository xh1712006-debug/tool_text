from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserRegisterRequest(BaseModel):
    """Schema xác thực dữ liệu khi người dùng đăng ký tài khoản mới."""
    email: EmailStr
    password: str = Field(..., min_length=6, description="Mật khẩu tối thiểu 6 ký tự")
    full_name: Optional[str] = None


class UserLoginRequest(BaseModel):
    """Schema xác thực dữ liệu khi người dùng đăng nhập (Hỗ trợ cả Email hoặc Tên tài khoản như admin12345)."""
    email: str = Field(..., description="Email hoặc Tên tài khoản (Ví dụ: admin12345)")
    password: str = Field(..., description="Mật khẩu")


class TokenRefreshRequest(BaseModel):
    """Schema yêu cầu cấp lại Access Token qua Refresh Token."""
    refresh_token: str


class UserResponse(BaseModel):
    """Schema định dạng dữ liệu người dùng trả về cho Client."""
    id: int
    email: str
    full_name: Optional[str] = None
    role: Optional[str] = "USER"
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AuthTokenResponse(BaseModel):
    """Schema trả về thông tin cặp mã xác thực AccessToken và RefreshToken."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse
