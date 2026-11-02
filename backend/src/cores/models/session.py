from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from src.database import Base


class SessionModel(Base):
    """
    Model đại diện cho bảng 'sessions' trong cơ sở dữ liệu PostgreSQL.
    Lưu trữ mã RefreshToken để kiểm soát đăng xuất và thu hồi phiên làm việc của người dùng.
    """
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    token = Column(String(512), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Quan hệ ngược về User sở hữu phiên
    user = relationship("User", back_populates="sessions")

