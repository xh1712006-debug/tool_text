# Đặc Tả Tính Năng: Robot Tự Động Gõ Đa Nền Tảng AI (AI Automation Feature)

Tài liệu này đặc tả phân hệ `ai_automation` gồm 2 chế độ: Robot Selenium/UC và Tiện ích Chrome Extension.

---

## 1. Mục Đích & Khả Năng (Capabilities)

Hệ thống cho phép tự động nhập hàng loạt đoạn văn bản/prompts vào các dịch vụ AI (ChatGPT, Claude, Gemini, DeepSeek, Poe, Perplexity...) theo chu kỳ tuần tự:
- **Tự nhận diện ô nhập liệu**: Sử dụng thuật toán Semantic Heuristics quét qua nhiều loại thẻ HTML (textarea, contenteditable, ProseMirror).
- **Gõ mô phỏng người thật**: Tốc độ gõ phím ngẫu nhiên từ 0.04 - 0.12s mỗi ký tự để tránh bị hệ thống AI phát hiện là bot.
- **Tự động chờ AI trả lời xong**: Nhận diện trạng thái phát sinh câu trả lời qua nút Stop / Streaming Indicator. Khi AI phản hồi xong hoàn toàn mới chuyển sang đoạn tiếp theo.
- **3 Chế độ vòng lặp**:
  - *Lặp theo số lần*: Chạy đúng N lượt (ví dụ: 3 lượt, 5 lượt) kèm thời gian nghỉ giữa các lượt.
  - *Lặp theo thời gian*: Chạy liên tục trong X phút (ví dụ: 15 phút, 30 phút).
  - *Chạy vô hạn*: Lặp liên tục không giới hạn cho đến khi người dùng bấm dừng.
- **Hỗ trợ Tải tệp lên (.docx, .pdf, .txt) & Tự động cách dòng**:
  - Người dùng có thể tải lên trực tiếp tệp Word (.docx) tải về từ Google Docs, tệp PDF, hoặc kéo thả tệp vào ô soạn thảo.
  - Hệ thống tự động trích xuất các đoạn văn bản và căn chỉnh mỗi đoạn cách nhau đúng 1 dòng trống (`\n\n`) để robot nhận diện và gửi tuần tự từng đoạn một.
  - Có nút "Tự Động Cách Dòng" và bộ đếm số lượng đoạn văn bản thời gian thực.

---

## 2. So Sánh 2 Chế Độ Thực Thi

| Tiêu chí | Chế độ Chrome Extension (MV3) | Chế độ Robot Console (Selenium/UC) |
|:---|:---|:---|
| **Vị trí chạy** | Trực tiếp trong tab Chrome đang mở | Mở cửa sổ Chrome riêng biệt |
| **Đăng nhập** | Sử dụng 100% nick đang đăng nhập | Cần đồng bộ profile hoặc đăng nhập lần đầu |
| **Chạy ngầm** | 100% ngầm, người dùng dùng tab khác thoải mái | Chiếm cửa sổ trình duyệt |
| **Phù hợp** | Sử dụng hàng ngày trên máy cá nhân | Chạy hàng loạt trên máy chủ VPS / Docker |

---

## 3. Cấu Trúc Mã Nguồn

```text
backend/src/modules/ai_automation/
├── models/
│   └── ai_preset.py              # Model ai_presets lưu cấu hình selector các web AI
├── schemas/
│   └── rpa_schema.py             # DTO điều khiển RPA và quản lý Presets
├── services/
│   └── rpa_chatgpt_service.py    # Động cơ tự động hóa Selenium/UC & Smart Heuristics
├── rpa_routes.py                 # Router điều khiển robot (/api/v1/rpa)
chrome_extension/
├── manifest.json                 # Manifest V3 (tabs, scripting, storage)
├── background.js                 # Service worker điều phối tab
├── content_tunetext.js           # Content script trên localhost:8000
└── content_ai.js                 # Content script trên ChatGPT/Claude/Gemini
```

