# Thiết kế Kiến trúc Backend Python & API (Backend Architecture & API Design)

Tài liệu này đặc tả kiến trúc Backend, cấu trúc thư mục mã nguồn và chuẩn giao tiếp API dành cho hệ thống Tune-Text Platform.

## 1. Công nghệ Sử dụng (Backend Stack)
- **Ngôn ngữ**: Python 3.12 LTS.
- **Framework API**: FastAPI (Hiệu năng cao, tự động sinh tài liệu Swagger/OpenAPI).
- **ORM / Query Builder**: SQLAlchemy 2.0 (Hỗ trợ Typed Queries và connection pooling).
- **Hệ cơ sở dữ liệu**: PostgreSQL 16+ với driver `psycopg2-binary`.
- **Mã hóa & Xác thực**: `bcrypt` (Băm mật khẩu) + `python-jose` (Chuẩn mã hóa JWT).

---

## 2. Cấu trúc Thư mục theo Mô hình Modular MVC (Directory Structure)

Hệ thống được thiết kế theo mô hình **Modular MVC**:
- **MVC Ngoài (Cores)**: Nằm tại `src/cores/`, quản lý các tài nguyên cốt lõi dùng chung toàn hệ thống (Authentication, User Management, Middlewares, Core Routes).
- **MVC Trong (Modules)**: Nằm tại `src/modules/`, chia ứng dụng thành các phân hệ nghiệp vụ độc lập. Mỗi phân hệ khép kín gồm Controller, Model, Service, Schema và Routes riêng (ví dụ: `text_tuning`).

```text
📂 backend
 ┣ 📂 src
 ┃ ┣ 📂 cores                         # MVC NGOÀI: Các thành phần cốt lõi hệ thống
 ┃ ┃ ┣ 📂 controllers                 # Bộ điều phối xử lý Auth và User
 ┃ ┃ ┃ ┣ 📜 auth_controller.py        # Đăng ký, đăng nhập, cấp lại token
 ┃ ┃ ┃ ┗ 📜 user_controller.py        # Xem profile cá nhân, quản trị danh sách
 ┃ ┃ ┣ 📂 models                      # Các thực thể CSDL cốt lõi
 ┃ ┃ ┃ ┣ 📜 user.py                   # Model bảng users
 ┃ ┃ ┃ ┣ 📜 role.py                   # Model bảng roles (RBAC)
 ┃ ┃ ┃ ┗ 📜 session.py                # Model bảng sessions (Refresh Token)
 ┃ ┃ ┣ 📂 middlewares                 # Lớp bảo vệ và lọc dữ liệu trung gian
 ┃ ┃ ┃ ┣ 📜 auth_middleware.py        # Xác thực JWT Token & Phân quyền RBAC
 ┃ ┃ ┃ ┗ 📜 error_handler.py          # Bắt ngoại lệ và chuẩn hóa cấu trúc lỗi
 ┃ ┃ ┣ 📂 schemas                     # Pydantic schemas cho Auth & User
 ┃ ┃ ┃ ┗ 📜 auth_schema.py            # DTO Request/Response xác thực
 ┃ ┃ ┗ 📜 cores_routes.py             # Router tổng hợp các API cốt lõi
 ┃ ┣ 📂 modules                       # MVC TRONG: Các phân hệ nghiệp vụ độc lập
 ┃ ┃ ┣ 📂 text_tuning                 # Module Tinh chỉnh & Xử lý văn bản
 ┃ ┃ ┃ ┣ 📂 controllers               # Controller xử lý nghiệp vụ Text Tuning
 ┃ ┃ ┃ ┃ ┗ 📜 tuning_controller.py
 ┃ ┃ ┃ ┣ 📂 models                    # Model CSDL của module Text Tuning
 ┃ ┃ ┃ ┃ ┗ 📜 text_task.py            # Model bảng text_tasks
 ┃ ┃ ┃ ┣ 📂 services                  # Logic nghiệp vụ xử lý thuật toán văn bản & file
 ┃ ┃ ┃ ┃ ┣ 📜 tuning_service.py       # Thuật toán chuẩn hóa, làm sạch, tóm tắt
 ┃ ┃ ┃ ┃ ┗ 📜 document_service.py     # Trích xuất Word (.docx), PDF (.pdf), xuất file
 ┃ ┃ ┃ ┣ 📂 schemas                   # Pydantic DTO của module Text Tuning
 ┃ ┃ ┃ ┃ ┗ 📜 tuning_schema.py
 ┃ ┃ ┃ ┗ 📜 tuning_routes.py          # Router phân hệ Text Tuning
 ┃ ┃ ┗ 📂 ai_automation               # Module Tự động hóa RPA Đa Nền Tảng AI (Universal AI Prompter)
 ┃ ┃   ┣ 📂 models                    # Model CSDL cấu hình AI Presets trong PostgreSQL
 ┃ ┃   ┃ ┗ 📜 ai_preset.py            # Model bảng ai_presets (ChatGPT, Claude, Gemini, DeepSeek...)
 ┃ ┃   ┣ 📂 services
 ┃ ┃   ┃ ┗ 📜 rpa_chatgpt_service.py  # Động cơ RPA Universal gõ mô phỏng người thật & Smart Heuristics
 ┃ ┃   ┣ 📂 schemas
 ┃ ┃   ┃ ┗ 📜 rpa_schema.py           # DTO Request/Response điều khiển RPA & Quản lý Presets
 ┃ ┃   ┗ 📜 rpa_routes.py             # Router điều khiển Robot & Presets (/api/v1/rpa)
 ┃ ┣ 📂 templates                     # Giao diện HTML Jinja2 Monolith Fullstack
 ┃ ┃ ┗ 📜 index.html                  # Giao diện Web hợp nhất đa chức năng
 ┃ ┣ 📂 static                        # Tệp tĩnh: CSS, JavaScript tương tác Client
 ┃ ┃ ┣ 📂 css/ 📜 style.css
 ┃ ┃ ┗ 📂 js/  📜 app.js
 ┃ ┣ 📂 utils                         # Các hàm tiện ích dùng chung
 ┃ ┃ ┣ 📜 security.py                 # Tiện ích băm Bcrypt & sinh JWT Token
 ┃ ┃ ┗ 📜 responses.py                # Chuẩn hóa Response JSON thành công/thất bại
 ┃ ┣ 📜 config.py                     # Quản trị cấu hình nạp từ .env qua Pydantic
 ┃ ┣ 📜 database.py                   # Khởi tạo SQLAlchemy Engine & SessionLocal
 ┃ ┗ 📜 main.py                       # Khởi tạo FastAPI App, CORS, Exception Handlers & Templates
 ┣ 📜 rpa_ai_runner.py                # File thực thi RPA độc lập qua giao diện Console/CLI
 ┣ 📜 run_ai_prompter.bat             # File thực thi nhanh 1-click cho người dùng Windows
 ┣ 📜 run_cloudflared.bat             # Khởi chạy đường hầm Cloudflare Tunnel miễn phí
 ┣ 📂 tests                           # Bộ kiểm thử tự động (Unit & Integration Tests)
 ┃ ┣ 📜 conftest.py                   # Fixture khởi tạo TestClient & DB test cô lập
 ┃ ┣ 📜 test_unit.py                  # Unit tests cho Service & Tiện ích
 ┃ ┗ 📜 test_integration.py           # Integration tests cho toàn bộ Endpoint
 ┣ 📜 .env.example                    # Mẫu khai báo biến môi trường
 ┣ 📜 Dockerfile                      # Đóng gói container ứng dụng Python
 ┣ 📜 docker-compose.yml              # Khởi chạy đồng bộ FastAPI + PostgreSQL
 ┣ 📜 requirements.txt                # Danh sách thư viện phụ thuộc
 ┗ 📜 run.py                          # Script khởi chạy máy chủ phát triển
```

---

## 3. Quy chuẩn Thiết kế API (RESTful Standards)

### Quy tắc đặt tên Endpoint:
- Tiền tố API: `/api/v1`
- Sử dụng danh từ số nhiều cho các tài nguyên:
  - Xác thực: `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/refresh`
  - Người dùng: `/api/v1/users/me`, `/api/v1/users`
  - Tinh chỉnh văn bản:
    - `POST /api/v1/tuning/tasks`: Tạo tác vụ mới theo phong cách (formal, casual, academic, clean, summarize)
    - `GET /api/v1/tuning/tasks?q=...`: Lấy danh sách kèm tìm kiếm từ khóa trong PostgreSQL
    - `GET /api/v1/tuning/tasks/{task_id}`: Xem chi tiết tác vụ
    - `DELETE /api/v1/tuning/tasks/{task_id}`: Xóa tác vụ
    - `POST /api/v1/tuning/extract-file`: Trích xuất văn bản từ tệp đính kèm (.txt, .docx, .pdf)
    - `GET /api/v1/tuning/tasks/{task_id}/export-docx`: Tải văn bản kết quả dạng file Word (.docx)

### Định dạng Phản hồi Chuẩn (Standard Response Format)

#### Phản hồi Thành công (Success Response):
```json
{
  "success": true,
  "message": "Tạo tác vụ và xử lý tinh chỉnh văn bản thành công.",
  "data": {
    "id": 1,
    "title": "Email gửi đối tác",
    "input_text": "văn bản thô cần tinh chỉnh",
    "tuned_text": "Văn bản thô cần tinh chỉnh.",
    "status": "COMPLETED",
    "user_id": 10
  }
}
```

#### Phản hồi Thất bại (Error Response):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu đầu vào không đúng định dạng yêu cầu.",
    "details": [
      {
        "field": "body.email",
        "issue": "value is not a valid email address"
      }
    ]
  }
}
```
