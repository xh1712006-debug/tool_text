from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from src.database import Base


class User(Base):
    """
    Model đại diện cho bảng 'users' trong cơ sở dữ liệu PostgreSQL.
    Lưu trữ tài khoản người dùng, mật khẩu đã băm và liên kết với vai trò (Role).
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Quan hệ với bảng roles và sessions
    role = relationship("Role", back_populates="users")
    sessions = relationship("SessionModel", back_populates="user", cascade="all, delete-orphan")
    text_tasks = relationship("TextTask", back_populates="user", cascade="all, delete-orphan")

