# Hướng Dẫn Vận Hành AI Agent cho Dự Án Tune-Text Platform

> **Chào AI Agent**: Bạn đang làm việc trong dự án **Tune-Text Platform**.  
> Toàn bộ bộ não vận hành, quy tắc viết code, chu trình kiểm thử, và tài liệu đặc tả kiến trúc đều được đặt trực tiếp tại thư mục gốc của dự án.

---

## ⚡ Các Điểm Cần Đọc Ngay Khi Bắt Đầu

1. **Bản đồ chỉ dẫn và Mục lục tra cứu**: [`INDEX.md`](file:///d:/project/project-local/tune-text/INDEX.md)
2. **Yêu cầu Nghiệp vụ (SRS)**: [`PROJECT_REQUIREMENTS.md`](file:///d:/project/project-local/tune-text/PROJECT_REQUIREMENTS.md)
3. **Quy tắc chú thích (Comment Tiếng Việt, Code Tiếng Anh)**: [`.antigravity/rules/comment.md`](file:///d:/project/project-local/tune-text/.antigravity/rules/comment.md)
4. **Quy chuẩn lập trình Python, JavaScript & Extension**: [`.antigravity/rules/coding_style.md`](file:///d:/project/project-local/tune-text/.antigravity/rules/coding_style.md)
5. **Quy trình 4 bước chuẩn (Generate - Review - Test - Push)**: [`.antigravity/skills/workflow.md`](file:///d:/project/project-local/tune-text/.antigravity/skills/workflow.md)

---

## 🛠️ Lệnh Kiểm Thử Bắt Buộc Trước Khi Hoàn Thành Nhiệm Vụ

Mọi thay đổi mã nguồn bắt buộc phải vượt qua toàn bộ bộ kiểm thử tự động (**18 passed**):

```powershell
cd d:\project\project-local\tune-text
.\.venv\Scripts\pytest -v
```

Tuyệt đối không bàn giao kết quả nếu kiểm thử chưa đạt **100% PASS**.
