# Hướng Dẫn Bắt Đầu Nhanh (Getting Started Walkthrough)

Tài liệu này cung cấp hướng dẫn từng bước để lập trình viên và AI Agent có thể khởi chạy, kiểm thử và phát triển tính năng mới trên hệ thống **Tune-Text Platform** (Python + PostgreSQL).

---

## 1. Yêu cầu Tiên quyết (Prerequisites)
- **Python**: Phiên bản 3.12+ (đã tích hợp môi trường ảo tại `d:\project\project-local\tune-text\.venv`).
- **Cơ sở dữ liệu PostgreSQL**: Đang chạy trên cổng `5432` cục bộ hoặc khởi chạy nhanh qua Docker.

---

## 2. Các Bước Khởi Chạy Nhanh (Quick Start)

### Cách 1: Chạy trực tiếp trên máy cục bộ (Local Development)

1. **Khai báo biến môi trường**:
   Kiểm tra tệp `backend/.env` (được cấu hình mật khẩu PostgreSQL và Cloudflare Tunnel Token của bạn):
   ```env
   POSTGRES_PASSWORD=your_secure_password
   DATABASE_URL=postgresql+psycopg2://postgres:your_secure_password@localhost:5432/tunetext_db
   CLOUDFLARE_TUNNEL_TOKEN=your_cloudflare_tunnel_token
   ```

2. **Khởi chạy Server Web Monolith (Frontend + Backend)**:
   - Cách 1: Nhấp đúp chuột vào tệp `start_server.bat` tại thư mục gốc dự án.
   - Cách 2: Chạy lệnh bằng PowerShell:
   ```powershell
   cd d:\project\project-local\tune-text\backend
   ..\.venv\Scripts\python.exe run.py
   ```
   *Giao diện Web & API lắng nghe tại:* `http://localhost:8000`  
   *Tài liệu Swagger API trực quan:* [http://localhost:8000/docs](http://localhost:8000/docs)

3. **Sử dụng Phân hệ Robot Tự Động Gõ Đa Nền Tảng AI (Universal RPA Prompter)**:
   - **Chế độ 1: Dùng Tiện ích Chrome Extension (Chạy trực tiếp vào tab đang mở - Khuyên Dùng)**:
     - Mở Chrome, vào `chrome://extensions`, bật *"Chế độ cho nhà phát triển"* (Developer mode).
     - Bấm *"Tải tiện ích đã giải nén"* (Load unpacked) và chọn thư mục `d:\project\project-local\tune-text\chrome_extension`.
     - Mở tab ChatGPT (`https://chatgpt.com`) và đăng nhập tài khoản của bạn.
     - Mở tab Tune-Text (`http://localhost:8000`), chọn số vòng lặp và bấm **"Khởi Chạy Robot Tự Động"**.
     - Robot sẽ tự động gõ ngầm vào tab ChatGPT bên cạnh mà không làm phiền bạn làm việc khác.
   - **Chế độ 2: Đồng bộ Nick Google Đã Đăng Nhập Sẵn (Không cần nhập mật khẩu lại)**:
     - Nhấp đúp chuột vào tệp `dong_bo_tai_khoan_google.bat` (hoặc nhấn nút *"Đồng Bộ Nick Google Từ Chrome Thật"* trên giao diện Web).
     - Toàn bộ tài khoản Google, ChatGPT, Claude, Cookie và LocalStorage từ Chrome cá nhân của bạn sẽ được sao chép vào Robot trong 1 giây.
   - **Chế độ 3: Qua Terminal / File Chạy Nhanh**: Nhấp đúp chuột vào `run_ai_prompter.bat`. Chương trình sẽ tự động hỏi đồng bộ nick Google thật, đọc các đoạn văn bản từ `prompts.txt`, mở trình duyệt Chrome với tài khoản thật của bạn, gõ tuần tự từng câu mô phỏng người thật, tự động nhận biết AI trả lời xong và tiếp tục gõ đoạn tiếp theo cho đến khi hết bài.

4. **Kết nối Ra Internet Bằng Cloudflare Tunnel (Miễn phí 100%)**:
   - Nhấp đúp chuột vào tệp `run_cloudflared.bat`.
   - Script sẽ tự động kết nối đường hầm bảo mật với Cloudflare Network bằng Token đã cấp, cho phép truy cập hệ thống từ xa mà không cần mở port modem hay mua IP tĩnh.

---

### Cách 2: Khởi chạy 1-Click bằng Docker Compose

Nếu bạn muốn có sẵn cơ sở dữ liệu PostgreSQL mà không cần cấu hình thủ công:
```bash
cd d:\project\project-local\tune-text\backend
docker-compose up -d --build
```
Hệ thống sẽ tự động khởi tạo container PostgreSQL và container FastAPI Backend.

---

## 3. Chạy Kiểm Thử Tự Động (Run Tests)

Hệ thống đi kèm bộ kiểm thử tự động (Unit Test & Integration Test) cô lập hoàn toàn:

```powershell
cd d:\project\project-local\tune-text\backend
..\.venv\Scripts\pytest.exe -v
```
*Tiêu chuẩn:* Tất cả các ca test phải đạt **100% PASS**.

---

## 4. Hướng Dẫn Mở Rộng Thêm Phân Hệ Nghiệp Vụ Mới (Adding a New Module)

Để bổ sung một phân hệ mới (ví dụ: module quản lý tệp `file_upload` hoặc module báo cáo `reports`), hãy tuân thủ mô hình **Modular MVC**:

1. **Tạo thư mục module**:
   Tạo thư mục `src/modules/<tên_module>/` với cấu trúc con:
   - `controllers/`
   - `models/`
   - `services/`
   - `schemas/`
   - `<tên_module>_routes.py`
2. **Khai báo ORM Model**:
   Kế thừa từ `src.database.Base` và định nghĩa quan hệ với `User` nếu cần.
3. **Đăng ký Router vào App chính**:
   Mở `src/main.py` và bổ sung:
   ```python
   from src.modules.<tên_module>.<tên_module>_routes import my_router
   app.include_router(my_router, prefix=settings.API_V1_PREFIX)
   ```
4. **Viết kiểm thử tự động**:
   Bổ sung test case tương ứng vào `tests/` và chạy `pytest` để đảm bảo hệ thống đạt chuẩn chất lượng 100% PASS.

