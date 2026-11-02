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

### 3. Khởi Chạy Cloudflare Tunnel (Truy cập từ xa qua Internet)
- Nhấp đúp chuột vào: `6_CHAY_CLOUDFLARE_TUNNEL.bat` (hoặc `run_cloudflared.bat`).
- Xem chi tiết hướng dẫn tại mục [🌐 Hướng Dẫn Cloudflare Tunnel](#-hướng-dẫn-kết-nối-internet-bằng-cloudflare-tunnel-miễn-phí-100) bên dưới.

### 4. Kiểm Thử Tự Động (Run Tests)
```powershell
cd d:\project\project-local\tune-text
.\.venv\Scripts\pytest -v
```
*(Tiêu chuẩn: Tất cả 20 tests bắt buộc đạt **100% PASS**).*

---

## 🌐 Hướng Dẫn Kết Nối Internet Bằng Cloudflare Tunnel (Miễn Phí 100%)

Cloudflare Tunnel giúp bạn chia sẻ trang web Tune-Text (`http://localhost:8000`) ra ngoài Internet an toàn qua kết nối mã hóa HTTPS mà **không cần mở cổng Modem (NAT/Port Forwarding)** và **không lộ địa chỉ IP thật**.

### 🚀 Cách 1: Chạy Quick Tunnel (Nhanh nhất - Không cần tài khoản)
Thích hợp khi bạn muốn dùng ngay, test thử trên điện thoại hoặc gửi cho bạn bè:
1. Bật máy chủ giao diện web trước (`start_server.bat` hoặc `1_CHAY_GIAO_DIEN_WEB.bat`).
2. Nhấp đúp chuột vào file: **`6_CHAY_CLOUDFLARE_TUNNEL.bat`** (hoặc `run_cloudflared.bat`).
3. Nhập số **`1`** (hoặc nhấn Enter).
   - *Nếu máy tính chưa có `cloudflared.exe`, file script sẽ tự động tải bản chính thức từ Cloudflare về cho bạn.*
4. Màn hình sẽ hiện ra đường link dạng:
   ```text
   https://xxxx-xxxx-xxxx.trycloudflare.com
   ```
5. Bạn copy đường link đó gửi sang điện thoại hoặc trình duyệt khác để đăng nhập và sử dụng hệ thống bình thường!

> [!NOTE]
> Giữ nguyên cửa sổ `6_CHAY_CLOUDFLARE_TUNNEL.bat` khi đang sử dụng. Khi muốn tắt, nhấn `Ctrl + C` hoặc đóng cửa sổ.

---

### 🔒 Cách 2: Dùng Tunnel Cố Định Với Token (Domain riêng bền vững)
Thích hợp nếu bạn có tên miền riêng hoặc muốn đường link không bao giờ bị đổi:
1. Đăng ký tài khoản miễn phí tại [Cloudflare Zero Trust](https://one.dash.cloudflare.com/).
2. Vào mục **Networks** > **Tunnels** > Bấm **Create a tunnel**.
3. Chọn loại **Cloudflared**, đặt tên Tunnel (ví dụ: `tune-text-tunnel`).
4. Tại bước cài đặt, Cloudflare sẽ hiển thị đoạn lệnh có chứa Token dài dạng:
   `eyJhIjoi...`
5. Mở file `.env` của dự án và điền Token vào:
   ```env
   CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoieHh4eHh4eHh...
   ```
6. Cấu hình Tab **Public Hostname** trên Cloudflare Dashboard:
   - **Subdomain / Domain**: ví dụ `tunetext.yourdomain.com`
   - **Service Type**: `HTTP`
   - **URL**: `localhost:8000`
7. Chạy `6_CHAY_CLOUDFLARE_TUNNEL.bat` và chọn **`[2]`**. Hệ thống sẽ tự động kết nối và bạn có thể truy cập qua domain riêng của mình.

---

### ⚙️ Cách 3: Cài đặt Thành Windows Service (Tự chạy ngầm khi bật máy)
Nếu bạn muốn hệ thống luôn sẵn sàng 24/7 mà không cần phải mở cửa sổ dòng lệnh:
1. Nhấp chuột phải vào file **`6_CHAY_CLOUDFLARE_TUNNEL.bat`** -> chọn **Run as administrator** (Chạy với quyền Quản trị viên).
2. Chọn **`[3]`** (Cài đặt Cloudflare thành Windows Service).
3. Sau khi cài đặt hoàn tất, Tunnel sẽ tự động chạy nền trong Services của Windows mỗi khi mở máy tính.

---

## 📌 Các File Khởi Chạy Nhanh Đã Được Tối Ưu

| Tên File | Chức Năng |
| :--- | :--- |
| `start_server.bat` / `1_CHAY_GIAO_DIEN_WEB.bat` | Khởi chạy máy chủ FastAPI & Web UI tại `localhost:8000` |
| `CAI_DAT_TIEN_ICH_CHROME.bat` | Mở nhanh trang cài đặt Chrome Extension |
| `6_CHAY_CLOUDFLARE_TUNNEL.bat` / `run_cloudflared.bat` | Khởi chạy Cloudflare Tunnel để kết nối ra Internet |
| `run.py` | Điểm vào chính của ứng dụng Backend |
| `pytest` | Chạy 20 unit tests kiểm tra toàn bộ luồng hoạt động |
