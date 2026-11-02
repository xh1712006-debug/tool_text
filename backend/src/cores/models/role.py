from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from src.database import Base


class Role(Base):
    """
    Model đại diện cho bảng 'roles' trong cơ sở dữ liệu PostgreSQL.
    Dùng để phân quyền người dùng (ADMIN, USER, MANAGER...) theo mô hình RBAC.
    """
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    role_name = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Quan hệ 1-Nhiều với bảng users
    users = relationship("User", back_populates="role")

