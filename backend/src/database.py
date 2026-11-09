from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from src.config import settings

import os
import logging
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from src.config import settings

logger = logging.getLogger("src.database")

# Lớp cơ sở (Base) cho toàn bộ các ORM Model
Base = declarative_base()


def create_resilient_engine_and_session():
    """
    Khởi tạo Engine và Session có cơ chế tự phục hồi (Self-Healing / Auto-Fallback).
    Nếu máy chủ chưa cài đặt hoặc không kết nối được PostgreSQL, hệ thống sẽ tự động
    chuyển sang SQLite cục bộ (tunetext_data.db) để đảm bảo đăng nhập và vận hành 100% không bị sập.
    """
    db_url = settings.DATABASE_URL or ""
    connect_args = {}

    if db_url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
        eng = create_engine(db_url, pool_pre_ping=True, connect_args=connect_args)
        return eng, sessionmaker(autocommit=False, autoflush=False, bind=eng)

    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    # Thử kết nối PostgreSQL với thời gian chờ 3 giây
    if "postgresql" in db_url:
        try:
            pg_args = {"connect_timeout": 3}
            eng = create_engine(db_url, pool_pre_ping=True, connect_args=pg_args)
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("✅ Kết nối cơ sở dữ liệu PostgreSQL thành công.")
            return eng, sessionmaker(autocommit=False, autoflush=False, bind=eng)
        except Exception as pg_err:
            logger.warning(
                f"⚠️ Không thể kết nối tới PostgreSQL ({pg_err}).\n"
                f"👉 Đang kích hoạt chế độ tự phục hồi: Thử chuyển sang SQLite cục bộ (tunetext_data.db)..."
            )
            try:
                import sqlite3
                sqlite_url = "sqlite:///tunetext_data.db"
                sqlite_eng = create_engine(sqlite_url, connect_args={"check_same_thread": False})
                with sqlite_eng.connect() as s_conn:
                    s_conn.execute(text("SELECT 1"))
                logger.info("✅ Tự phục hồi thành công: Sử dụng CSDL SQLite cục bộ (tunetext_data.db).")
                return sqlite_eng, sessionmaker(autocommit=False, autoflush=False, bind=sqlite_eng)
            except Exception as sq_err:
                logger.error(
                    f"❌ Cả PostgreSQL lẫn SQLite đều không khả dụng (PG: {pg_err} | SQLite: {sq_err}). "
                    f"Vui lòng bật dịch vụ PostgreSQL hoặc cấu hình DATABASE_URL trong .env."
                )
                return eng, sessionmaker(autocommit=False, autoflush=False, bind=eng)

    eng = create_engine(db_url, pool_pre_ping=True, connect_args=connect_args)
    return eng, sessionmaker(autocommit=False, autoflush=False, bind=eng)


engine, SessionLocal = create_resilient_engine_and_session()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency cung cấp database session cho từng HTTP Request.
    Đảm bảo session luôn được đóng (close) an toàn sau khi kết thúc request để tránh rò rỉ kết nối (connection leak).
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_initial_data(db: Session) -> None:
    """Nạp sẵn vai trò, tài khoản quản trị VIP và danh sách cấu hình AI Presets trực tiếp trong code."""
    from src.cores.models.role import Role
    from src.cores.models.user import User
    from src.cores.models.session import SessionModel
    from src.modules.ai_automation.models.ai_preset import AIPreset, DEFAULT_AI_PRESETS
    from src.utils.security import hash_password, create_refresh_token
    from datetime import datetime, timedelta, timezone

    # 1. Khởi tạo các vai trò chuẩn RBAC
    try:
        admin_role = db.query(Role).filter(Role.role_name == "ADMIN").first()
        if not admin_role:
            admin_role = Role(role_name="ADMIN", description="Quản trị viên tối cao với token vĩnh viễn")
            db.add(admin_role)
            db.commit()
            db.refresh(admin_role)

        user_role = db.query(Role).filter(Role.role_name == "USER").first()
        if not user_role:
            user_role = Role(role_name="USER", description="Người dùng tiêu chuẩn")
            db.add(user_role)
            db.commit()
            db.refresh(user_role)
    except Exception as e:
        db.rollback()
        print(f"[Seed] Lỗi tạo vai trò: {e}")
        admin_role = db.query(Role).filter(Role.role_name == "ADMIN").first()

    if not admin_role:
        return

    # 2. Khởi tạo tài khoản Super Admin với Token Vô Hạn (admin12345 / admin12345)
    try:
        admin12345_user = db.query(User).filter(
            (User.email == "admin12345@tunetext.local") | (User.email == "admin12345")
        ).first()
        if not admin12345_user:
            admin12345_user = User(
                email="admin12345@tunetext.local",
                password_hash=hash_password("admin12345"),
                full_name="Quản Trị Viên (admin12345)",
                role_id=admin_role.id
            )
            db.add(admin12345_user)
            db.commit()
            db.refresh(admin12345_user)
        else:
            admin12345_user.password_hash = hash_password("admin12345")
            admin12345_user.role_id = admin_role.id
            db.commit()

        # Tạo phiên vĩnh viễn (Session 100 năm) cho admin12345
        existing_session = db.query(SessionModel).filter(SessionModel.user_id == admin12345_user.id).first()
        if not existing_session:
            expires_delta = timedelta(days=36500)
            perm_refresh = create_refresh_token(subject=admin12345_user.id, expires_delta=expires_delta)
            session_entry = SessionModel(
                token=perm_refresh,
                user_id=admin12345_user.id,
                expires_at=datetime.now(timezone.utc) + expires_delta
            )
            db.add(session_entry)
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"[Seed] Lỗi tạo admin12345: {e}")

    # 3. Tạo tài khoản admin@tunetext.local và xh1712006@gmail.com
    try:
        admin_user = db.query(User).filter(User.email == "admin@tunetext.local").first()
        if not admin_user:
            admin_user = User(
                email="admin@tunetext.local",
                password_hash=hash_password("admin12345"),
                full_name="Quản Trị Viên VIP (Token Vô Hạn)",
                role_id=admin_role.id
            )
            db.add(admin_user)
            db.commit()
        else:
            admin_user.password_hash = hash_password("admin12345")
            admin_user.role_id = admin_role.id
            db.commit()

        owner_user = db.query(User).filter(User.email == "xh1712006@gmail.com").first()
        if not owner_user:
            owner_user = User(
                email="xh1712006@gmail.com",
                password_hash=hash_password("admin123"),
                full_name="Quản Trị Viên (admin123)",
                role_id=admin_role.id
            )
            db.add(owner_user)
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"[Seed] Lỗi tạo tài khoản phụ: {e}")

    # 4. Khởi tạo danh sách AI Presets
    try:
        count = db.query(AIPreset).count()
        if count == 0:
            for item in DEFAULT_AI_PRESETS:
                preset = AIPreset(**item)
                db.add(preset)
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"[Seed] Lỗi tạo presets: {e}")


def init_db() -> None:
    """
    Khởi tạo bảng cơ sở dữ liệu nếu chưa tồn tại và nạp sẵn các cấu hình AI mặc định (Seed Presets).
    """
    # Import các model để SQLAlchemy metadata ghi nhận
    from src.cores.models.role import Role
    from src.cores.models.user import User
    from src.cores.models.session import SessionModel
    from src.modules.text_tuning.models.text_task import TextTask
    from src.modules.ai_automation.models.ai_preset import AIPreset

    Base.metadata.create_all(bind=engine)

    # Tự động nạp dữ liệu mặc định
    db = SessionLocal()
    try:
        seed_initial_data(db)
    except Exception:
        db.rollback()
    finally:
        db.close()
