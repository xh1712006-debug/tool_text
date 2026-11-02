# Đặc Tả Yêu Cầu Phần Mềm (Software Requirements Specification - SRS)

**Dự án**: Tune-Text Platform (Hệ Thống Tinh Chỉnh & Xử Lý Văn Bản Tự Động)  
**Công nghệ**: Python 3.12 (FastAPI), Cơ sở dữ liệu PostgreSQL 16+  
**Kiến trúc**: Modular MVC  

---

## 1. Giới thiệu (Introduction)

### 1.1 Mục đích (Purpose)
Tài liệu này đặc tả toàn bộ các yêu cầu nghiệp vụ, kiến trúc kỹ thuật và tiêu chuẩn chất lượng cho hệ thống **Tune-Text Platform**. Hệ thống cung cấp API hiệu năng cao phục vụ quản lý người dùng, phân quyền RBAC và xử lý tinh chỉnh/chuẩn hóa văn bản tự động, sẵn sàng tích hợp với các mô hình AI hoặc ứng dụng Frontend.

### 1.2 Phạm vi Sản phẩm (Product Scope)
*   **Trong phạm vi (In-Scope)**:
    *   Hệ thống xác thực người dùng bằng JWT (Access Token ngắn hạn + Refresh Token dài hạn lưu trong PostgreSQL).
    *   Phân quyền người dùng dựa trên vai trò (Role-Based Access Control - RBAC: ADMIN, USER).
    *   Phân hệ nghiệp vụ `text_tuning`: Tiếp nhận văn bản, chuẩn hóa khoảng trắng, định dạng dấu câu, tóm tắt, trích xuất tệp Word/PDF và xuất file .docx.
    *   Phân hệ tự động hóa RPA `ai_automation`: Mở trình duyệt chống phát hiện bot (`undetected-chromedriver`), gõ mô phỏng người thật, tự động nhận biết AI (ChatGPT) trả lời xong hoàn toàn và tiếp tục gõ đoạn văn bản tiếp theo theo vòng lặp tuần tự.
    *   Giao diện người dùng Monolith Fullstack hợp nhất (FastAPI phục vụ HTML Templates & Static Assets song song RESTful API trên cùng 1 ứng dụng).
    *   Kết nối Internet bảo mật miễn phí bằng Cloudflare Tunnel (Token cấu hình sẵn).
    *   Bộ kiểm thử tự động (Unit & Integration Tests) đạt tỷ lệ Pass 100%.
    *   Chi phí vận hành: 100% Miễn Phí (0 VNĐ), bền vững và có thể dùng lâu dài vĩnh viễn.
*   **Ngoài phạm vi (Out-of-Scope)**:
    *   Thanh toán trực tuyến cổng thứ ba trả phí.

### 1.3 Thuật ngữ & Viết tắt (Definitions & Acronyms)
*   **SRS**: Software Requirements Specification.
*   **RBAC**: Role-Based Access Control (Kiểm soát truy cập dựa trên vai trò).
*   **JWT**: JSON Web Token (Chuẩn xác thực phân tán an toàn).
*   **Modular MVC**: Mô hình kiến trúc phân tách MVC ngoài (Cores) và MVC trong (Modules).

---

## 2. Mô tả Tổng quan (Overall Description)

### 2.1 Bối cảnh Hệ thống (Product Perspective)
Hệ thống là một nền tảng Backend độc lập, giao tiếp thông qua chuẩn RESTful JSON API. Hệ thống lưu trữ dữ liệu bền vững trên cơ sở dữ liệu PostgreSQL và có khả năng tích hợp linh hoạt với các Client như Web Browser, Mobile App hoặc các Agent tự động hóa.

### 2.2 Tác nhân & Đối tượng Sử dụng (User Classes & Characteristics)
*   **Quản trị viên (Administrator)**:
    *   Toàn quyền quản trị tài khoản người dùng, giám sát các tác vụ và cấu hình hệ thống.
*   **Người dùng thông thường (End-User / Tuner)**:
    *   Đăng ký tài khoản, đăng nhập, quản lý hồ sơ cá nhân.
    *   Tạo, xem và xóa các tác vụ tinh chỉnh văn bản của chính mình.
*   **Hệ thống / AI Agent**:
    *   Giao tiếp qua API với Access Token để thực thi các tác vụ xử lý hàng loạt.

### 2.3 Ràng buộc & Phụ thuộc (Constraints & Dependencies)
*   **Môi trường**: Python 3.12 LTS.
*   **Cơ sở dữ liệu**: PostgreSQL 16+ với kết nối có hồ bơi (connection pooling).
*   **Bảo mật**: Mật khẩu phải được băm bằng thuật toán `Bcrypt` an toàn, không bao giờ lưu văn bản thuần (plain text).

---

## 3. Yêu cầu Giao diện Ngoại vi (External Interface Requirements)

### 3.1 Giao diện API (RESTful API Interfaces)
*   Tất cả phản hồi API phải tuân thủ nghiêm ngặt 2 định dạng chuẩn:
    *   **Thành công**: `{"success": true, "message": "...", "data": {...}}`
    *   **Thất bại**: `{"success": false, "error": {"code": "...", "message": "...", "details": [...]}}`
*   Tài liệu trực quan tương tác tự động sinh qua Swagger UI tại `/docs` và ReDoc tại `/redoc`.

---

## 4. Yêu cầu Chức năng (Functional Requirements)

### 4.1 Phân hệ Lõi: Xác thực & Tài khoản (Core Auth & Account)
*   `[US-AUTH-01]`: Người dùng có thể đăng ký tài khoản mới bằng Email và Mật khẩu.
*   `[US-AUTH-02]`: Người dùng có thể đăng nhập để nhận Access Token và Refresh Token.
*   `[US-AUTH-03]`: Người dùng có thể sử dụng Refresh Token để gia hạn Access Token mới mà không cần đăng nhập lại.
*   `[US-AUTH-04]`: Người dùng có thể truy vấn thông tin hồ sơ của chính mình qua token xác thực (`GET /api/v1/users/me`).
*   `[US-AUTH-05]`: Quản trị viên (ADMIN) có thể xem danh sách toàn bộ người dùng trong hệ thống (`GET /api/v1/users`).

### 4.2 Phân hệ Nghiệp vụ: Tinh chỉnh Văn bản (Text Tuning Module)
*   `[US-TUNE-01]`: Người dùng có thể gửi đoạn văn bản thô để hệ thống chuẩn hóa khoảng trắng, sửa lỗi viết hoa đầu câu và căn chỉnh dấu câu (`POST /api/v1/tuning/tasks`).
*   `[US-TUNE-02]`: Người dùng có thể xem danh sách lịch sử các văn bản đã tinh chỉnh của mình (`GET /api/v1/tuning/tasks`).
*   `[US-TUNE-03]`: Người dùng có thể xem chi tiết văn bản gốc và văn bản sau tinh chỉnh theo mã ID (`GET /api/v1/tuning/tasks/{task_id}`).
*   `[US-TUNE-04]`: Người dùng có thể xóa tác vụ tinh chỉnh văn bản của mình (`DELETE /api/v1/tuning/tasks/{task_id}`).
*   `[US-TUNE-05]`: Người dùng có thể trích xuất văn bản từ tệp Word (.docx), PDF (.pdf) hoặc Text (.txt) và xuất báo cáo kết quả sang Word (.docx).

### 4.3 Phân hệ Nghiệp vụ: Tự động hóa RPA AI (ChatGPT Auto-Prompter Module)
*   `[US-RPA-01]`: Tiếp nhận URL AI Web mục tiêu (mặc định: `https://chatgpt.com`) và danh sách các đoạn văn bản/câu prompt cần gửi.
*   `[US-RPA-02]`: Điều khiển Chrome tự động với `undetected-chromedriver`, lưu giữ phiên đăng nhập vĩnh viễn trong User Data Profile.
*   `[US-RPA-03]`: Giả lập gõ phím người thật (Anti-bot typing) với độ trễ ngẫu nhiên từ 0.04 - 0.12s mỗi ký tự và gửi lệnh bằng Enter hoặc nút Send.
*   `[US-RPA-04]`: Tự động nhận diện thời điểm AI đang sinh phản hồi qua Stop Button / Streaming element; chờ đến khi AI hoàn tất 100% câu trả lời trước khi chuyển sang đoạn tiếp theo.
*   `[US-RPA-05]`: Cung cấp API giám sát tiến độ thời gian thực (`GET /api/v1/rpa/status`) và cơ chế dừng khẩn cấp (`POST /api/v1/rpa/stop`).
*   `[US-RPA-06]`: Hỗ trợ 3 chế độ lặp đa năng: Lặp theo số lần (1, 3, 5...), lặp theo thời lượng (5 phút, 15 phút...), hoặc chạy vô hạn cho đến khi người dùng bấm dừng.
*   `[US-RPA-07]`: Cung cấp Tiện ích Chrome Extension Manifest V3 cho phép robot tự động kết nối và gõ thẳng vào tab AI đang mở sẵn bên cạnh mà không mở cửa sổ trình duyệt mới, hỗ trợ chạy ngầm 100% khi người dùng chuyển sang tab khác.

---

## 5. Yêu cầu Phi chức năng (Non-functional Requirements)

### 5.1 Độ tin cậy & Kiểm thử (Reliability & Testing)
*   Bộ kiểm thử tự động (Unit Test & Integration Test) phải bao phủ cả Happy Path và Sad Path.
*   Tỷ lệ vượt qua kiểm thử bắt buộc đạt **100% Pass** trước khi đóng gói hoặc triển khai.

### 5.2 Bảo mật (Security)
*   Mã hóa mật khẩu: Thuật toán Bcrypt với hệ số salt an toàn.
*   Bảo vệ Token: Khóa bí mật JWT Secret nạp qua biến môi trường.
*   Phòng chống SQL Injection: 100% truy vấn qua ORM SQLAlchemy Parameterized Queries.
*   Phân quyền RBAC tại tầng Middleware chặn các truy cập trái phép.

### 5.3 Hiệu năng (Performance)
*   Khung xử lý bất đồng bộ (Asynchronous ASGI) của FastAPI đảm bảo thời gian phản hồi API trung bình dưới 50ms cho các tác vụ chuẩn.
