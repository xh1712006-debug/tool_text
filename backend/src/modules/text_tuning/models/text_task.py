from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from src.database import Base


class TextTask(Base):
    """
    Model quản lý các tác vụ tinh chỉnh văn bản (Tune-Text Tasks) trong PostgreSQL.
    Lưu trữ văn bản gốc đầu vào và văn bản sau khi được AI/hệ thống chuẩn hóa.
    """
    __tablename__ = "text_tasks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    input_text = Column(Text, nullable=False)
    tuned_text = Column(Text, nullable=True)
    status = Column(String(50), default="COMPLETED", nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Quan hệ với bảng users
    user = relationship("User", back_populates="text_tasks")

