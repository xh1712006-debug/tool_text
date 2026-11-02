import sys
import os

# Nạp thư mục DLL cần thiết trên môi trường Windows (cho sqlite3 và postgresql)
if os.name == "nt" and os.path.exists(r"D:\bin"):
    try:
        os.add_dll_directory(r"D:\bin")
    except Exception:
        pass

# Đảm bảo thư mục backend nằm trong sys.path để import 'src' không bị lỗi
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.database import Base, get_db
from src.main import app

# Sử dụng SQLite in-memory cho môi trường kiểm thử tự động
# StaticPool đảm bảo cùng 1 kết nối bộ nhớ trong suốt phiên chạy test
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    """Tạo mới cấu trúc bảng trước mỗi ca test và hủy dữ liệu sau khi xong."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        from src.database import seed_initial_data
        seed_initial_data(session)
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Giả lập HTTP Client với dependency get_db được trỏ sang cơ sở dữ liệu kiểm thử."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
