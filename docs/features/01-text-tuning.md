# Đặc Tả Tính Năng: Tinh Chỉnh & Xử Lý Văn Bản (Text Tuning Feature)

Tài liệu này đặc tả nghiệp vụ phân hệ `text_tuning` trong hệ thống Tune-Text Platform.

---

## 1. Mục Đích & Khả Năng (Capabilities)

Module `text_tuning` cung cấp các thuật toán xử lý văn bản tự động không cần mô hình AI nặng nề (chạy bằng thuật toán quy tắc nhanh miligiây):
- **Chuẩn hóa khoảng trắng**: Loại bỏ khoảng trắng thừa, xóa dòng trống liên tiếp.
- **Sửa viết hoa đầu câu**: Tự động viết hoa chữ cái đầu tiên sau các dấu chấm câu (`.`, `!`, `?`).
- **Căn chỉnh dấu câu**: Sửa lỗi khoảng cách trước/sau dấu phẩy, dấu hai chấm, dấu chấm phẩy theo chuẩn ngữ pháp tiếng Việt.
- **Tóm tắt văn bản (Summarization)**: Trích xuất các câu trọng tâm nhất dựa trên tần suất từ khóa.
- **Xử lý tệp đính kèm**:
  - Trích xuất nội dung từ tệp Word (`.docx`), tệp PDF (`.pdf`), hoặc văn bản thuần (`.txt`).
  - Xuất báo cáo kết quả văn bản tinh chỉnh thành tệp Word (`.docx`) sẵn sàng in ấn/sử dụng.

---

## 2. API Endpoints

| Phương thức | Đường dẫn | Chức năng | Quyền hạn |
|:---:|:---|:---|:---:|
| `POST` | `/api/v1/tuning/tasks` | Tạo và thực thi tác vụ tinh chỉnh văn bản | `USER`, `ADMIN` |
| `GET` | `/api/v1/tuning/tasks` | Lấy danh sách lịch sử tác vụ của người dùng | `USER`, `ADMIN` |
| `GET` | `/api/v1/tuning/tasks/{task_id}` | Xem chi tiết văn bản gốc và kết quả | `USER`, `ADMIN` |
| `DELETE` | `/api/v1/tuning/tasks/{task_id}` | Xóa tác vụ khỏi cơ sở dữ liệu | `USER`, `ADMIN` |
| `POST` | `/api/v1/tuning/extract-file` | Trích xuất văn bản từ tệp Word/PDF tải lên | `USER`, `ADMIN` |
| `GET` | `/api/v1/tuning/tasks/{task_id}/export-docx` | Tải xuống tệp .docx của văn bản kết quả | `USER`, `ADMIN` |

---

## 3. Cấu Trúc Mã Nguồn

```text
backend/src/modules/text_tuning/
├── controllers/
│   └── tuning_controller.py      # Tiếp nhận HTTP request & gọi service
├── models/
│   └── text_task.py              # ORM Model text_tasks trong PostgreSQL
├── schemas/
│   └── tuning_schema.py          # Pydantic DTO xác thực dữ liệu đầu vào/ra
├── services/
│   ├── tuning_service.py         # Thuật toán chuẩn hóa, làm sạch, tóm tắt
│   └── document_service.py       # Trích xuất Word, PDF và sinh tệp .docx
└── tuning_routes.py              # Đăng ký router với tiền tố /api/v1/tuning
```

