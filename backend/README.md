# Tune-Text Backend Platform 🚀

Hệ thống Backend chuẩn hóa bằng **Python 3.12 (FastAPI)** và **PostgreSQL** theo kiến trúc **Modular MVC**, tuân thủ nguyên tắc phát triển AI-Native của khung **AIgent**.

## 📌 Tính Năng Cốt Lõi
- **Kiến trúc Modular MVC**: Phân tách rõ ràng giữa MVC lõi (`src/cores/`) và các module nghiệp vụ độc lập (`src/modules/`).
- **Bảo mật chuẩn Quốc tế**: Băm mật khẩu bằng `Bcrypt`, xác thực Token `JWT` (AccessToken ngắn hạn + RefreshToken dài hạn lưu trong CSDL PostgreSQL).
- **Phân quyền RBAC**: Quản lý truy cập theo vai trò (`ADMIN`, `USER`) chặt chẽ qua FastAPI Dependencies.
- **Phân hệ Nghiệp vụ Tinh chỉnh Văn bản (`text_tuning`)**: Tự động chuẩn hóa văn bản, làm sạch khoảng trắng thừa, định dạng cấu trúc câu.
- **Kiểm thử Tự động 100% Pass**: Sử dụng `pytest` kiểm thử toàn bộ luồng từ Unit Test đến Integration Test.
- **Sẵn sàng Container**: Có sẵn `Dockerfile` và `docker-compose.yml` tích hợp PostgreSQL 16.

---

## 🛠️ Hướng Dẫn Chạy Cục Bộ (Local)

### 1. Kích hoạt môi trường và cài đặt thư viện
```powershell
# Chạy với venv đã tạo sẵn:
..\.venv\Scripts\python.exe run.py
```

### 2. Chạy bộ kiểm thử (Testing)
```powershell
..\.venv\Scripts\pytest.exe -v
```

### 3. Xem tài liệu Swagger API
Truy cập trình duyệt: [http://localhost:8000/docs](http://localhost:8000/docs)

