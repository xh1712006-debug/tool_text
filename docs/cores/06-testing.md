# Đặc tả Kiểm thử Tự động (Project Testing Specification)

Tài liệu này quy định chiến lược kiểm thử, cấu hình môi trường, và các quy tắc viết mã kiểm thử (testing) dành cho hệ thống Python + PostgreSQL.

## 1. Chiến lược Kiểm thử (Testing Strategy)

Hệ thống được đảm bảo chất lượng thông qua 2 lớp kiểm thử tự động chính:

- **Kiểm thử Đơn vị (Unit Test)**:
  - Tập trung vào tính chính xác của các thuật toán xử lý văn bản trong `TextTuningService` và các hàm băm mật khẩu/ký token trong `security.py`.
  - Không phụ thuộc vào cơ sở dữ liệu thật, chạy với tốc độ miligiây.
- **Kiểm thử Tích hợp (Integration Test)**:
  - Sử dụng `TestClient` của Starlette/FastAPI để kiểm tra toàn bộ luồng gọi API từ Router -> Middleware -> Controller -> Database.
  - Kiểm tra tính toàn vẹn của chu trình: Đăng ký -> Đăng nhập -> Sinh Token -> Gọi API có bảo vệ -> Thu hồi/Làm mới Token.
  - Sử dụng cơ sở dữ liệu kiểm thử cô lập (In-memory Database) để đảm bảo không ghi đè dữ liệu của môi trường phát triển.

---

## 2. Công cụ Sử dụng (Testing Stack)
- **Framework kiểm thử**: `pytest` (phiên bản 8.0+).
- **HTTP Client kiểm thử**: `httpx` kết hợp `TestClient`.
- **Database giả lập**: SQLite In-Memory với chế độ `StaticPool` chia sẻ kết nối cho phiên test.

---

## 3. Lệnh Chạy Kiểm thử (Execution Commands)

### Chạy kiểm thử trên môi trường Windows PowerShell (Chuẩn dự án):
```powershell
# Từ thư mục gốc dự án d:\project\project-local\tune-text
.\.venv\Scripts\pytest -v
```

### Chạy nhanh chế độ rút gọn:
```powershell
.\.venv\Scripts\pytest -q
```

### Chạy riêng các ca kiểm thử RPA / AI Automation:
```powershell
.\.venv\Scripts\pytest -v -k "rpa"
```

---

## 4. Tiêu chuẩn Vượt qua Kiểm thử (Quality Gates)
- **Tỷ lệ thành công**: **100% PASS** (Tất cả 19 ca kiểm thử bắt buộc phải thành công).
- Không chấp nhận bất kỳ ca test nào bị lỗi (FAIL) hoặc bị bỏ qua (`skip`) khi chưa có sự đồng ý của Kiến trúc sư phần mềm.
