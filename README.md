# Tune-Text Platform 🚀🤖

> **Hệ Thống Tinh Chỉnh Văn Bản Tự Động & Robot Tự Động Gõ Đa Nền Tảng AI**  
> *100% Free & Long-term — Vận hành độc lập, bền vững trên PostgreSQL và Chrome Extension.*

---

## 🌟 Tổng Quan Dự Án

**Tune-Text Platform** là giải pháp phần mềm Monolith Fullstack kết hợp:
1. **Phân hệ Tinh chỉnh & Chuẩn hóa Văn bản (Text Tuning)**:
   - Thuật toán chuẩn hóa khoảng trắng, sửa lỗi viết hoa đầu câu, căn chỉnh dấu câu theo ngữ pháp tiếng Việt.
   - Tóm tắt văn bản thông minh theo từ khóa.
   - Trích xuất nội dung từ tệp Word (`.docx`), PDF (`.pdf`), Text (`.txt`) và xuất báo cáo kết quả sang Word (`.docx`).
2. **Phân hệ Robot Tự Động Gõ Đa Nền Tảng AI (Universal AI Prompter)**:
   - **Chế độ Tiện ích Chrome Extension (Khuyên Dùng)**: Kết nối trực tiếp vào tab ChatGPT/Claude/Gemini đang mở sẵn trên trình duyệt thật của bạn. Hỗ trợ chạy ngầm 100% (bạn thoải mái lướt YouTube, Messenger mà robot vẫn tự gõ), lặp theo số lần hoặc theo thời gian.
   - **Chế độ Robot Selenium Console**: Tự động mở trình duyệt với profile đã đồng bộ nick Google thật.
3. **Phân hệ Quản trị & Xác thực Người dùng (Auth & RBAC)**:
   - Bảo mật tài khoản với băm mật khẩu Bcrypt và phân quyền JWT (Access Token + Refresh Token lưu trong PostgreSQL).
4. **Kết nối Ra Mạng Internet Bằng Cloudflare Tunnel**:
   - Truy cập từ xa miễn phí 0 VNĐ không cần mở port modem hay mua IP tĩnh.

---

## 📁 Cấu Trúc Dự Án Chuẩn AI-Native

```text
📦 tune-text
 ┣ 📂 .antigravity            # "Bộ não" vận hành của AI Agent
 ┃ ┣ 📂 rules                 # Các quy tắc lập trình (comment.md, coding_style.md)
 ┃ ┗ 📂 skills                # Chu trình phát triển 4 bước (Generate - Review - Test - Push)
 ┣ 📂 docs                    # Kho tri thức kỹ thuật của dự án (Source of Truth)
 ┃ ┣ 📂 cores                 # 7 Đặc tả kỹ thuật nền tảng (DB, Backend, UI, Extension, Security...)
 ┃ ┣ 📂 features              # 2 Đặc tả chi tiết các phân hệ nghiệp vụ
 ┃ ┗ 📂 walkthroughs          # Hướng dẫn chi tiết cho Developer và Người dùng
 ┣ 📂 backend                 # Ứng dụng Backend FastAPI & Web HTML/Static Assets
 ┣ 📂 chrome_extension        # Tiện ích Chrome Extension Manifest V3 (Chạy tab bên cạnh)
 ┣ 📜 ANTIGRAVITY.md          # Bản đồ định hướng chính cho AI Agent
 ┣ 📜 INDEX.md                # Mục lục tra cứu toàn diện (Knowledge Index)
 ┣ 📜 PROJECT_REQUIREMENTS.md # Đặc tả yêu cầu phần mềm chi tiết (SRS)
 ┗ 📜 README.md               # Giới thiệu tổng quan dự án (tệp này)
```

---

## ⚡ Khởi Chạy Nhanh (Quick Start)

### 1. Khởi chạy Giao diện Web (FastAPI + UI)
- Nhấp đúp chuột vào tệp: `start_server.bat` (hoặc `1_CHAY_GIAO_DIEN_WEB.bat`).
- Mở trình duyệt truy cập: `http://localhost:8000`.
- Tài liệu API tương tác Swagger: `http://localhost:8000/docs`.

### 2. Nạp Tiện Ích Chrome Extension
- Nhấp đúp chuột vào: `CAI_DAT_TIEN_ICH_CHROME.bat` để mở trang quản lý tiện ích.
- Bật **Chế độ cho nhà phát triển** (Developer mode).
- Bấm **Tải tiện ích đã giải nén** và chọn thư mục: `d:\project\project-local\tune-text\chrome_extension`.

### 3. Kiểm Thử Tự Động (Run Tests)
```powershell
cd d:\project\project-local\tune-text
.\.venv\Scripts\pytest -v
```
*(Tiêu chuẩn: Tất cả 18 tests bắt buộc đạt **100% PASS**).*
