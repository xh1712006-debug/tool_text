from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from src.config import settings

# Khởi tạo SQLAlchemy Engine với cơ chế pool_pre_ping để tự động khôi phục kết nối hỏng
# Hỗ trợ kết nối PostgreSQL hoặc SQLite khi chạy kiểm thử
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Chuẩn hóa URL cho PostgreSQL nếu người dùng nhập postgresql://
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(
    db_url,
    pool_pre_ping=True,
    connect_args=connect_args
)

# Phiên làm việc (Session) thao tác với CSDL
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Lớp cơ sở (Base) cho toàn bộ các ORM Model
Base = declarative_base()


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
    """Nạp sẵn vai trò, tài khoản quản trị VIP và danh sách cấu hình AI Presets."""
    from src.cores.models.role import Role
    from src.cores.models.user import User
    from src.modules.ai_automation.models.ai_preset import AIPreset, DEFAULT_AI_PRESETS
    from src.utils.security import hash_password

    # 1. Khởi tạo các vai trò chuẩn RBAC
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

    # 2. Khởi tạo tài khoản Super Admin với Token Vô Hạn (admin12345 / admin12345)
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

    # Tài khoản phụ admin@tunetext.local
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

    # Tài khoản admin123 (xh1712006@gmail.com)
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

    # Đảm bảo phiên vĩnh viễn (Session 100 năm) luôn sẵn sàng trong CSDL
    from src.cores.models.session import SessionModel
    from src.utils.security import create_refresh_token
    from datetime import datetime, timedelta, timezone

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

    # 3. Khởi tạo danh sách AI Presets
    count = db.query(AIPreset).count()
    if count == 0:
        for item in DEFAULT_AI_PRESETS:
            preset = AIPreset(**item)
            db.add(preset)
        db.commit()


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
