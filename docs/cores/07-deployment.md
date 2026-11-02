# Quy trình Đóng gói & Triển khai (Deployment & Operations Guide)

Tài liệu này đặc tả quy trình đóng gói và triển khai hệ thống Tune-Text Platform (FastAPI + PostgreSQL) lên môi trường chạy thật.

## 1. Hạ tầng Triển khai (Deployment Infrastructure)
- **Hệ điều hành**: Linux (Ubuntu 22.04 LTS / Debian) hoặc Windows Server.
- **Công nghệ Container**: `Docker` & `Docker Compose` (Đồng bộ hóa môi trường giữa máy phát triển và máy chủ Production).
- **Cơ sở dữ liệu**: PostgreSQL 16 Alpine.
- **Máy chủ ứng dụng (ASGI Server)**: `Uvicorn` với cấu hình đa luồng (multi-workers) khi chạy trên Production.

---

## 2. Quản lý Biến Môi trường (Environment Variables)

Các biến môi trường được cấu hình tại tệp `.env` ở thư mục gốc của backend:

| Tên biến (Key) | Bắt buộc | Mặc định | Mô tả |
| :--- | :---: | :--- | :--- |
| `PROJECT_NAME` | Không | `"Tune-Text Platform"` | Tên hiển thị của dự án |
| `ENVIRONMENT` | Không | `"development"` | Môi trường (`development` / `production`) |
| `API_V1_PREFIX` | Không | `"/api/v1"` | Tiền tố đường dẫn API |
| `DATABASE_URL` | **Có** | `postgresql+psycopg2://...` | Chuỗi kết nối PostgreSQL |
| `JWT_SECRET` | **Có** | - | Khóa bí mật dùng để ký token JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Không | `30` | Thời hạn của AccessToken (phút) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Không | `7` | Thời hạn của RefreshToken (ngày) |
| `CORS_ORIGINS` | Không | `["*"]` | Danh sách domain được phép gọi API |

---

## 3. Triển khai 1-Click bằng Docker Compose

Hệ thống đã được đóng gói sẵn trong tệp `docker-compose.yml` gồm 2 dịch vụ độc lập:
1. `postgres`: Container CSDL PostgreSQL 16 có healthcheck và lưu trữ persistent volume `pgdata`.
2. `api`: Container FastAPI xây dựng từ `Dockerfile`.

### Lệnh khởi chạy:
```bash
# Di chuyển vào thư mục backend
cd backend

# Khởi chạy toàn bộ hệ thống ở chế độ chạy ngầm (Detached mode)
docker-compose up -d --build
```

### Lệnh kiểm tra trạng thái và logs:
```bash
# Xem trạng thái các container đang chạy
docker-compose ps

# Xem log thời gian thực của ứng dụng
docker-compose logs -f api
```

### Dừng hệ thống:
```bash
docker-compose down
```
