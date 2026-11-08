import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
from sqlalchemy import text

from src.config import settings
from src.database import init_db, engine
from src.cores.cores_routes import cores_router
from src.modules.text_tuning.tuning_routes import tuning_router
from src.modules.ai_automation.rpa_routes import rpa_router
from src.cores.middlewares.error_handler import (
    http_exception_handler,
    validation_exception_handler,
    general_exception_handler
)
from src.utils.responses import success_response

# Cấu hình logging
logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s")
logger = logging.getLogger("TuneTextApp")

# Thiết lập đường dẫn tĩnh và khuôn mẫu giao diện (Monolith Fullstack)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
DOWNLOADS_DIR = os.path.join(BASE_DIR, "downloads")
os.makedirs(DOWNLOADS_DIR, exist_ok=True)

templates = Jinja2Templates(directory=TEMPLATES_DIR)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Quản lý vòng đời khởi chạy ứng dụng (Lifespan).
    Khởi tạo bảng cơ sở dữ liệu và tự động tạo sẵn tài khoản quản trị vĩnh viễn (admin12345).
    """
    import time
    logger.info("Đang khởi động hệ thống Backend...")
    max_retries = 5
    for attempt in range(1, max_retries + 1):
        try:
            init_db()
            logger.info("-> Bảng CSDL và tài khoản có sẵn (admin12345) đã được đồng bộ thành công.")
            break
        except Exception as e:
            if attempt == max_retries:
                logger.error(f"Lưu ý: Không thể tự động tạo bảng CSDL sau {max_retries} lần thử: {e}")
            else:
                logger.warning(f"Đang chờ kết nối CSDL PostgreSQL... (Lần {attempt}/{max_retries}): {e}")
                time.sleep(2)

    yield

    logger.info("Đang tắt ứng dụng...")


# Khởi tạo FastAPI App
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Hệ thống Backend Modular MVC chuẩn hóa với FastAPI, SQLAlchemy và PostgreSQL.",
    version="1.0.0",
    lifespan=lifespan
)

# 1. Cấu hình Middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Phục vụ tệp tĩnh (Frontend Assets & Tệp Downloads Media) tích hợp trực tiếp trong cùng hệ thống
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

if os.path.exists(DOWNLOADS_DIR):
    app.mount("/downloads", StaticFiles(directory=DOWNLOADS_DIR), name="downloads")

# 3. Đăng ký các Exception Handlers chuẩn hóa phản hồi lỗi
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# 4. Đăng ký các Router API theo chuẩn Modular MVC
app.include_router(cores_router, prefix=settings.API_V1_PREFIX, tags=["Core Authentication & Users"])
app.include_router(tuning_router, prefix=settings.API_V1_PREFIX, tags=["Text Tuning Module"])
app.include_router(rpa_router, prefix=settings.API_V1_PREFIX, tags=["AI RPA Automation"])


# 5. Giao diện Frontend Trực quan (Monolith Single-Page Application)
@app.get("/", response_class=HTMLResponse, summary="Giao diện Web Frontend")
def index_page(request: Request):
    """Phục vụ trực tiếp giao diện Frontend cho người dùng trên cùng một cổng server."""
    return templates.TemplateResponse(
        request=request, 
        name="index.html", 
        context={"project_name": settings.PROJECT_NAME}
    )


@app.get("/health", summary="Kiểm tra sức khỏe hệ thống")
def health_check():
    db_status = "ok"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"disconnected: {e}"

    return success_response(
        data={
            "app_status": "healthy",
            "database_status": db_status,
            "environment": settings.ENVIRONMENT
        },
        message="Trạng thái hệ thống hoạt động ổn định."
    )


@app.get("/download-extension", summary="Tải file ZIP tiện ích Chrome dành cho máy khác")
@app.get("/api/v1/extension/download", summary="Tải file ZIP tiện ích Chrome dành cho máy khác")
def download_extension():
    """Cung cấp file nén ZIP tiện ích Chrome để người dùng ở máy khác tải về sử dụng ngay lập tức."""
    zip_path = os.path.join(STATIC_DIR, "tune-text-extension.zip")
    if os.path.exists(zip_path):
        return FileResponse(
            path=zip_path,
            filename="tune-text-extension.zip",
            media_type="application/zip"
        )
    raise HTTPException(status_code=404, detail="Chưa tìm thấy file nén tiện ích. Vui lòng liên hệ quản trị viên.")


class CreateVideoFolderRequest(BaseModel):
    folder_name: str


@app.post("/api/v1/storage/create-video-folder", summary="Tạo thư mục lưu trữ video theo tên file prompt")
def create_video_folder(payload: CreateVideoFolderRequest):
    """
    Tự động tạo thư mục cùng tên với tệp prompt để sẵn sàng chứa video được sinh ra.
    """
    import re
    safe_name = re.sub(r'[\\/*?:"<>|]', "", payload.folder_name).strip()
    if not safe_name:
        safe_name = "prompts_video"

    # Tạo thư mục downloads trong backend và root
    target_dir = os.path.join(os.path.dirname(BASE_DIR), "downloads", safe_name)
    os.makedirs(target_dir, exist_ok=True)

    return success_response(
        data={"folder_name": safe_name, "folder_path": target_dir},
        message=f"Đã tạo thư mục lưu trữ video '{safe_name}' thành công!"
    )

