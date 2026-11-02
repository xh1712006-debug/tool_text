# Thiết kế Cơ sở Dữ liệu PostgreSQL (Database Design)

Tài liệu này đặc tả thiết kế cơ sở dữ liệu của dự án Tune-Text Platform chạy trên **PostgreSQL 16+**, bao gồm sơ đồ quan hệ (ERD), cấu trúc chi tiết các bảng và các quy tắc quản lý dữ liệu.

## 1. Sơ đồ Thực thể Quan hệ (ERD)

Sơ đồ quan hệ giữa các thực thể trong cơ sở dữ liệu PostgreSQL (sử dụng Mermaid):

```mermaid
erDiagram
    ROLES ||--o{ USERS : "has"
    ROLES {
        int id PK "SERIAL"
        string role_name UK "VARCHAR(50)"
        text description "TEXT"
    }
    USERS ||--o{ SESSIONS : "owns"
    USERS ||--o{ TEXT_TASKS : "creates"
    USERS {
        int id PK "SERIAL"
        string email UK "VARCHAR(255)"
        string password_hash "VARCHAR(255)"
        string full_name "VARCHAR(100)"
        int role_id FK "REFERENCES roles(id)"
        timestamptz created_at "TIMESTAMPTZ"
    }
    SESSIONS {
        int id PK "SERIAL"
        string token UK "VARCHAR(512)"
        int user_id FK "REFERENCES users(id) ON DELETE CASCADE"
        timestamptz expires_at "TIMESTAMPTZ"
        timestamptz created_at "TIMESTAMPTZ"
    }
    TEXT_TASKS {
        int id PK "SERIAL"
        string title "VARCHAR(200)"
        text input_text "TEXT"
        text tuned_text "TEXT"
        string status "VARCHAR(50)"
        int user_id FK "REFERENCES users(id) ON DELETE CASCADE"
        timestamptz created_at "TIMESTAMPTZ"
        timestamptz updated_at "TIMESTAMPTZ"
    }
```

---

## 2. Đặc tả Chi tiết các Bảng trong PostgreSQL (Tables Specification)

### 2.1 Bảng: `roles` (Vai trò người dùng)
Quản lý các nhóm quyền truy cập theo chuẩn RBAC (ADMIN, USER).

| Tên trường (Column) | Kiểu PostgreSQL | Ràng buộc (Constraints) | Ghi chú |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | PRIMARY KEY | Khóa chính tự tăng |
| `role_name` | `VARCHAR(50)` | UNIQUE, NOT NULL | Tên vai trò (ADMIN, USER) |
| `description` | `TEXT` | NULL | Mô tả quyền hạn của vai trò |

### 2.2 Bảng: `users` (Tài khoản người dùng)
Lưu trữ thông tin tài khoản và mật khẩu đã băm.

| Tên trường (Column) | Kiểu PostgreSQL | Ràng buộc (Constraints) | Ghi chú |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | PRIMARY KEY | Khóa chính tự tăng |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL, INDEX | Email đăng nhập |
| `password_hash` | `VARCHAR(255)` | NOT NULL | Mật khẩu băm bằng Bcrypt |
| `full_name` | `VARCHAR(100)` | NULL | Họ và tên người dùng |
| `role_id` | `INT` | FOREIGN KEY -> `roles(id)` | Khóa ngoại liên kết vai trò |
| `created_at` | `TIMESTAMPTZ` | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo tài khoản |

### 2.3 Bảng: `sessions` (Phiên làm việc & Refresh Token)
Lưu trữ Refresh Token để kiểm soát phiên đăng nhập và thu hồi token khi cần.

| Tên trường (Column) | Kiểu PostgreSQL | Ràng buộc (Constraints) | Ghi chú |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | PRIMARY KEY | Khóa chính tự tăng |
| `token` | `VARCHAR(512)` | UNIQUE, NOT NULL, INDEX | Chuỗi Refresh Token JWT |
| `user_id` | `INT` | FOREIGN KEY -> `users(id)` ON DELETE CASCADE | Khóa ngoại người sở hữu |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | Thời điểm hết hạn phiên |
| `created_at` | `TIMESTAMPTZ` | DEFAULT CURRENT_TIMESTAMP | Thời điểm cấp phiên |

### 2.4 Bảng: `text_tasks` (Tác vụ tinh chỉnh văn bản)
Lưu trữ nội dung văn bản gốc và văn bản sau khi được tinh chỉnh.

| Tên trường (Column) | Kiểu PostgreSQL | Ràng buộc (Constraints) | Ghi chú |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | PRIMARY KEY | Khóa chính tự tăng |
| `title` | `VARCHAR(200)` | NOT NULL | Tiêu đề tác vụ |
| `input_text` | `TEXT` | NOT NULL | Đoạn văn bản gốc đầu vào |
| `tuned_text` | `TEXT` | NULL | Đoạn văn bản sau tinh chỉnh |
| `status` | `VARCHAR(50)` | NOT NULL, DEFAULT 'COMPLETED' | Trạng thái xử lý |
| `user_id` | `INT` | FOREIGN KEY -> `users(id)` ON DELETE CASCADE | Khóa ngoại người tạo |
| `created_at` | `TIMESTAMPTZ` | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo tác vụ |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT CURRENT_TIMESTAMP | Thời điểm cập nhật cuối |

### 2.5 Bảng: `ai_presets` (Cấu hình bộ chọn Đa Nền tảng AI)
Lưu trữ danh sách các nền tảng AI (ChatGPT, Claude, Gemini, DeepSeek...) và các bộ selector tương ứng.

| Tên trường (Column) | Kiểu PostgreSQL | Ràng buộc (Constraints) | Ghi chú |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | PRIMARY KEY | Khóa chính tự tăng |
| `name` | `VARCHAR(100)` | NOT NULL | Tên nền tảng (VD: OpenAI ChatGPT) |
| `platform_code` | `VARCHAR(50)` | UNIQUE, NOT NULL | Mã định danh không dấu (chatgpt, claude) |
| `target_url` | `VARCHAR(255)` | NOT NULL | URL mặc định của trang web AI |
| `input_selectors` | `TEXT` | NOT NULL | Danh sách CSS Selector ô nhập prompt |
| `send_btn_selectors` | `TEXT` | NOT NULL | Danh sách CSS Selector nút gửi |
| `stop_btn_selectors` | `TEXT` | NOT NULL | Danh sách CSS Selector nút dừng phát sinh |
| `notes` | `TEXT` | NULL | Ghi chú hướng dẫn sử dụng |
| `is_built_in` | `BOOLEAN` | DEFAULT FALSE | Đánh dấu cấu hình hệ thống hay người dùng tạo |
| `created_at` | `TIMESTAMPTZ` | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT CURRENT_TIMESTAMP | Thời điểm cập nhật |

---

## 3. Cấu hình Kết nối & Quản lý Schema

### 3.1 Chuỗi kết nối PostgreSQL (Connection String Format):
```text
postgresql+psycopg2://<username>:<password>@<host>:<port>/<dbname>
Ví dụ: postgresql+psycopg2://postgres:postgres@localhost:5432/tunetext_db
```

### 3.2 Quy tắc Quản lý Dữ liệu:
1. **Kiểu Thời gian**: Luôn sử dụng `TIMESTAMPTZ` (Timestamp with Time Zone) để tránh sai lệch múi giờ giữa các máy chủ.
2. **Khóa Ngoại**: Luôn cấu hình hành vi `ON DELETE CASCADE` cho các thực thể con (Sessions, Tasks) để tránh tạo dữ liệu rác mồ côi (orphaned rows) khi xóa người dùng.
3. **Chỉ mục (Indexes)**: Đánh chỉ mục trên các trường thường xuyên tra cứu như `email`, `token`, `user_id`.
