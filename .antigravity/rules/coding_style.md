# Quy chuẩn Mã Nguồn (Coding Style & Architectural Guidelines)

Tài liệu này định nghĩa các tiêu chuẩn lập trình dành riêng cho hệ thống **Tune-Text Platform**.

---

## 1. Tiêu chuẩn Python (Backend)

- **Phiên bản**: Python 3.12 LTS.
- **Tuân thủ chuẩn**: PEP 8 (sử dụng 4 khoảng trắng thụt đầu dòng, snake_case cho hàm và biến, PascalCase cho tên Class).
- **Type Annotations**:
  - Bắt buộc khai báo kiểu dữ liệu cho toàn bộ tham số hàm và kiểu trả về (ví dụ: `def process(text: str) -> Dict[str, Any]:`).
- **ORM SQLAlchemy 2.0**:
  - Sử dụng cú pháp mới `select()`, `execute()` thay vì cú pháp cũ của bản 1.x.
  - Sử dụng `Mapped[...]` và `mapped_column(...)` khi định nghĩa Model.
- **Pydantic V2**:
  - Sử dụng `from pydantic import BaseModel, ConfigDict, Field`.
  - Không sử dụng `class Config: orm_mode = True` cũ, thay bằng `model_config = ConfigDict(from_attributes=True)`.
- **FastAPI**:
  - Tách bạch rõ ràng: `Router` (nhận request) -> `Controller` (điều phối) -> `Service` (xử lý logic nghiệp vụ).
  - Chuẩn hóa đầu ra với helper `success_response(...)` và `error_response(...)` trong `src/utils/responses.py`.

---

## 2. Tiêu chuẩn JavaScript & Giao diện (Frontend)

- **Không dùng build step nặng nề**: Sử dụng Vanilla JavaScript hiện đại (ES6+) kết hợp HTML Templates Jinja2 để tối ưu hóa hiệu năng và triệt tiêu lỗi CORS.
- **DOM Manipulation**:
  - Luôn kiểm tra sự tồn tại của phần tử trước khi gán thuộc tính (`const el = document.getElementById(...); if (el) { ... }`).
- **Quản lý Cache**:
  - Khi cập nhật `app.js` hoặc `style.css`, luôn tăng tham số version (`?v=YYYYMMDD_HHMM`) trong `index.html` để tránh trình duyệt của người dùng bị dính cache cũ.

---

## 3. Tiêu chuẩn Tiện ích Chrome Extension (Manifest V3)

- **Phiên bản Manifest**: Manifest V3 (MV3).
- **Content Scripts**:
  - Phải bọc toàn bộ code trong hàm IIFE tự thực thi: `(() => { ... })()` để tránh lỗi `Identifier has already been declared` khi nạp lại.
  - Hỗ trợ chạy ngầm: Không phụ thuộc vào `document.hasFocus()` hay `offsetParent` vì tab có thể đang ở chế độ background khi người dùng mở YouTube/Messenger.
  - Dùng `DataTransfer` paste event hoặc `InputEvent` dự phòng khi `document.execCommand` không khả dụng trong tab ngầm.
- **Truyền nhận dữ liệu (Messaging)**:
  - Đồng bộ cả 2 dạng tên biến: `camelCase` (ví dụ `loopCount`) và `snake_case` (ví dụ `loop_count`) để đảm bảo không bị mất dữ liệu giữa các phiên bản.

---

## 4. Quy tắc Không Làm Vỡ (Anti-Breakage Rule)

- Mọi thay đổi mã nguồn trước khi bàn giao cho người dùng **BẮT BUỘC** phải chạy lệnh:
  ```powershell
  cd d:\project\project-local\tune-text
  .\.venv\Scripts\pytest -q
  ```
  Tất cả **18 tests** phải đạt 100% PASS.

