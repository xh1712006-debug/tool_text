# Thiết kế Giao diện Frontend Hợp Nhất (Unified Fullstack Frontend Design)

Tài liệu này đặc tả thiết kế giao diện (UI/UX) và kiến trúc phía Client được **tích hợp trực tiếp (Monolith Fullstack)** trong cùng một ứng dụng FastAPI Backend của dự án Tune-Text Platform.

## 1. Triết lý Thiết kế: Kiến trúc Hợp Nhất (Monolithic Single-Service)
- **Không tách riêng Frontend và Backend**: Giao diện người dùng được phục vụ trực tiếp từ chính máy chủ FastAPI thông qua `Jinja2Templates` và `StaticFiles`.
- **Lợi ích kiến trúc**:
  - **Triệt tiêu lỗi CORS**: Do Frontend và API Backend cùng chạy trên cùng một nguồn gốc (Origin/Domain/Port).
  - **Tối ưu triển khai Cloudflare**: Chỉ cần cấu hình 1 đường hầm Cloudflare Tunnel trỏ tới cổng `8000`, toàn bộ Giao diện Web, REST API và Swagger Docs đều sẵn sàng trên Internet cùng lúc.
  - **Tiết kiệm tài nguyên máy chủ**: Không cần cài đặt Node.js runtime hay chạy tiến trình Web server độc lập thứ hai.

---

## 2. Công nghệ Sử dụng (Frontend Stack)
- **Template Engine**: `Jinja2` (kết hợp với FastAPI `HTMLResponse`).
- **Styling**: `Tailwind CSS` (nạp qua CDN hiện đại) phối hợp với thiết kế hiệu ứng kính mờ (Glassmorphism Dark Mode).
- **Icons**: `Font Awesome 6 Pro/Free CDN`.
- **Phông chữ**: `Plus Jakarta Sans` tối ưu hiển thị tiếng Việt sắc nét.
- **Client State & API Client**: Vanilla JavaScript hiện đại (Fetch API kết hợp `localStorage` lưu trữ JWT Token).

---

## 3. Cấu trúc Thư mục Frontend trong Backend
```text
📂 backend
 ┣ 📂 src
 ┃ ┣ 📂 templates                  # Các tệp HTML Template Jinja2
 ┃ ┃ ┗ 📜 index.html               # Trang Single Page Application (SPA) chính
 ┃ ┣ 📂 static                     # Tệp tĩnh được phục vụ tại /static
 ┃ ┃ ┣ 📂 css
 ┃ ┃ ┃ ┗ 📜 style.css              # Tùy biến Glassmorphism, Scrollbar, Typography
 ┃ ┃ ┗ 📂 js
 ┃ ┃   ┗ 📜 app.js                 # Xử lý tương tác, gọi API, xác thực và lưu token
```

---

## 4. Các Khu vực Giao diện Chính (UI Components)

1. **Header Điều hướng (Navigation Header)**:
   - Logo thương hiệu và huy hiệu trạng thái công nghệ.
   - Huy hiệu giám sát tình trạng kết nối CSDL PostgreSQL thời gian thực.
   - Nút liên kết trực tiếp tới Swagger Docs (`/docs`).
   - Khu vực trạng thái tài khoản: Nút Đăng nhập/Đăng ký khi chưa đăng nhập, hoặc Avatar/Tên/Vai trò/Nút đăng xuất khi đã xác thực.
2. **Khung Làm việc Tinh chỉnh Văn bản (Text Tuning Playground)**:
   - Ô nhập tiêu đề tác vụ kèm các nút nạp nhanh văn bản mẫu (Email, Báo cáo).
   - Bộ chọn chế độ xử lý 3 trong 1: `Smart Tune` (thông minh), `Clean` (làm sạch), `Summarize` (tóm tắt).
   - Hai khung soạn thảo song song: Văn bản gốc bên trái và Kết quả sau xử lý bên phải.
   - Bộ đếm số lượng ký tự và số từ thời gian thực.
   - Nút sao chép 1-click có thông báo Toast tiện lợi.
3. **Bảng Lịch sử Tác vụ (Task History Table)**:
   - Hiển thị danh sách các tác vụ mà người dùng đã lưu trữ trong PostgreSQL.
   - Hỗ trợ xem lại nội dung cũ và xóa tác vụ.
4. **Bàn làm việc Tự động hóa RPA ChatGPT (AI Robot Auto-Prompter)**:
   - Ô nhập đường dẫn trang web AI (mặc định: `https://chatgpt.com`).
   - Khung nhập danh sách các đoạn văn bản/prompts cần gõ tự động (mỗi đoạn cách nhau 1 dòng trống).
   - **Tùy chọn Chế độ Lặp Đa Năng**:
     - *Lặp theo số lần*: Người dùng nhập số vòng lặp (1, 3, 5...) và thời gian nghỉ giữa các lượt.
     - *Lặp theo thời gian*: Chạy liên tục trong X phút (ví dụ: 5 phút, 15 phút, 30 phút).
     - *Chạy vô hạn*: Lặp liên tục không ngừng cho đến khi người dùng bấm dừng.
   - **Tích hợp Tiện ích Chrome Extension (Chạy trực tiếp vào Tab AI bên cạnh)**:
     - Huy hiệu nhận diện phiên bản: `Đã kết nối Tab bên cạnh (v1.0.4)`.
     - Nút nạp lại 1-click: `🔄 Nạp lại Extension`.
     - Chế độ chạy ngầm hoàn toàn: Tự động gõ vào tab bên cạnh mà không cướp focus màn hình, người dùng thoải mái lướt web, nghe nhạc, chat Messenger.
   - Nút **Khởi Chạy Robot Tự Động** và nút **Dừng Robot Khẩn Cấp**.
   - Bảng theo dõi tiến độ thời gian thực (Real-time Progress Bar) hiển thị số câu đã gửi, trạng thái hiện tại (Đang gõ, Đang chờ ChatGPT trả lời, Đang nghỉ giữa các prompt).
   - Hộp nhật ký hoạt động (Terminal Console Logs) nạp thời gian thực.
5. **Hộp thoại Xác thực (Authentication Modal)**:
   - Hỗ trợ chuyển đổi mượt mà giữa 2 tab: Đăng nhập và Đăng ký.
   - Tự động nạp mã xác thực `access_token` vào `localStorage` và cập nhật giao diện không cần tải lại trang.
