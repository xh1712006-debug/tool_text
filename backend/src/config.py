import json
from typing import List, Union, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Quản lý cấu hình toàn cục hệ thống được nạp từ biến môi trường hoặc tệp .env.
    Sử dụng Pydantic Settings để đảm bảo dữ liệu cấu hình luôn đúng kiểu và hợp lệ.
    """
    PROJECT_NAME: str = "Tune-Text Platform"
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"

    # Chuỗi kết nối PostgreSQL (Mặc định sử dụng driver psycopg2 chuẩn hóa cho SQLAlchemy 2.0)
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/tunetext_db"

    # Cấu hình Token JWT
    JWT_SECRET: str = "super_secret_jwt_key_please_change_in_production_1234567890"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Cấu hình Token Cloudflare Tunnel (Cho phép expose web ra Internet an toàn)
    CLOUDFLARE_TUNNEL_TOKEN: Optional[str] = None

    # Danh sách Domain được phép gọi CORS
    CORS_ORIGINS: Union[List[str], str] = ["*"]

    @field_validator("CORS_ORIGINS", mode="before")
    def parse_cors_origins(cls, value):
        # Hỗ trợ phân tích chuỗi JSON nếu truyền dạng string trong file .env
        if isinstance(value, str) and not value.startswith("["):
            return [x.strip() for x in value.split(",")]
        elif isinstance(value, str) and value.startswith("["):
            return json.loads(value)
        return value

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
