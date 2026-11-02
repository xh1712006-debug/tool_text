# Hệ Thống Chỉ Mục Tri Thức AI (AI Knowledge Index & Navigation Map)

> **Dự án**: Tune-Text Platform (Hệ Thống Tinh Chỉnh Văn Bản & Robot Tự Động Gõ Đa Nền Tảng AI)  
> **Cấu trúc**: Monolith Fullstack (FastAPI + Jinja2/Vanilla JS + PostgreSQL 16+ + Chrome Extension MV3)  
> **Mục đích**: Bản đồ điều hướng nhanh cho mọi AI Agent (Antigravity, Claude, Cursor...) khi tiếp cận codebase.

---

## 🗺️ Bản Đồ Điều Hướng Nhanh (Quick Navigation)

| STT | Tài Liệu | Mục Đích & Nội Dung | Đường Dẫn |
|:---:|:---|:---|:---|
| **0** | **Bản đồ chỉ dẫn cho Agent** | Triết lý, quy tắc cốt lõi, lệnh điều phối | [`ANTIGRAVITY.md`](file:///d:/project/project-local/tune-text/ANTIGRAVITY.md) |
| **1** | **Yêu cầu Nghiệp vụ (SRS)** | 100% đặc tả yêu cầu, User Stories, phạm vi | [`PROJECT_REQUIREMENTS.md`](file:///d:/project/project-local/tune-text/PROJECT_REQUIREMENTS.md) |
| **2** | **Cơ sở dữ liệu** | ERD Mermaid, đặc tả 5 bảng trong PostgreSQL | [`docs/cores/01-database.md`](file:///d:/project/project-local/tune-text/docs/cores/01-database.md) |
| **3** | **Kiến trúc Backend** | Mô hình Modular MVC, API RESTful, Pydantic V2 | [`docs/cores/02-backend.md`](file:///d:/project/project-local/tune-text/docs/cores/02-backend.md) |
| **4** | **Giao diện Web Monolith** | Single-page UI, Jinja2, Tailwind, Vanilla JS | [`docs/cores/03-frontend.md`](file:///d:/project/project-local/tune-text/docs/cores/03-frontend.md) |
| **5** | **Tiện ích Chrome Extension** | Kiến trúc Manifest V3, Content Script & Background | [`docs/cores/04-chrome-extension.md`](file:///d:/project/project-local/tune-text/docs/cores/04-chrome-extension.md) |
| **6** | **Xác thực & Bảo mật** | JWT Access/Refresh Token, phân quyền RBAC | [`docs/cores/05-security.md`](file:///d:/project/project-local/tune-text/docs/cores/05-security.md) |
| **7** | **Kiểm thử tự động** | Chiến lược pytest, mock DB, yêu cầu 100% PASS | [`docs/cores/06-testing.md`](file:///d:/project/project-local/tune-text/docs/cores/06-testing.md) |
| **8** | **Triển khai & Vận hành** | Docker Compose, biến môi trường, Cloudflare Tunnel | [`docs/cores/07-deployment.md`](file:///d:/project/project-local/tune-text/docs/cores/07-deployment.md) |
| **9** | **Nghiệp vụ: Tinh chỉnh văn bản** | Làm sạch, sửa dấu câu, tóm tắt, trích xuất tệp | [`docs/features/01-text-tuning.md`](file:///d:/project/project-local/tune-text/docs/features/01-text-tuning.md) |
| **10** | **Nghiệp vụ: Robot AI Prompter** | Robot Selenium & Extension chạy tab bên cạnh | [`docs/features/02-ai-automation.md`](file:///d:/project/project-local/tune-text/docs/features/02-ai-automation.md) |
| **11** | **Hướng dẫn Khởi chạy** | Các bước chạy web, chạy robot, nạp extension | [`docs/walkthroughs/01-getting-started.md`](file:///d:/project/project-local/tune-text/docs/walkthroughs/01-getting-started.md) |

---

## 📂 Sơ Đồ Cây Thư Mục Toàn Dự Án

```text
tune-text/
├── .antigravity/                        # "BỘ NÃO" VẬN HÀNH CỦA AI AGENT
│   ├── rules/                           # Bộ quy tắc lập trình bắt buộc
│   │   ├── comment.md                   # Quy tắc chú thích Tiếng Việt
│   │   └── coding_style.md              # Chuẩn code Python, JS, Chrome Extension
│   └── skills/                          # Chu trình làm việc 4 bước khép kín
│       ├── lifecycles/
│       │   ├── 01-generate.md           # Bước 1: Tạo/Sửa mã nguồn
│       │   ├── 02-review.md             # Bước 2: Tự rà soát code
│       │   ├── 03-test.md               # Bước 3: Chạy pytest 100% PASS
│       │   └── 04-push.md               # Bước 4: Commit & Báo cáo
│       └── workflow.md                  # Điều phối toàn bộ quy trình
├── docs/                                # KHO TRI THỨC KỸ THUẬT CỦA DỰ ÁN
│   ├── cores/                           # 7 Đặc tả nền tảng hệ thống (DB, Backend, UI, Extension...)
│   ├── features/                        # 2 Đặc tả phân hệ nghiệp vụ cụ thể
│   └── walkthroughs/                    # Hướng dẫn chi tiết cho người dùng và dev
├── backend/                             # ỨNG DỤNG BACKEND FASTAPI & WEB FULLSTACK
│   ├── src/                             # Mã nguồn chính theo mô hình Modular MVC
│   │   ├── cores/                       # Phân hệ lõi (Auth, User, Middleware)
│   │   ├── modules/                     # Phân hệ nghiệp vụ (text_tuning, ai_automation)
│   │   ├── templates/                   # Giao diện HTML Jinja2 (index.html)
│   │   ├── static/                      # Tệp tĩnh: css/style.css, js/app.js
│   │   ├── database.py                  # Kết nối PostgreSQL & Base ORM
│   │   ├── config.py                    # Cấu hình Pydantic Settings
│   │   └── main.py                      # FastAPI App chính
│   ├── tests/                           # Bộ kiểm thử tự động pytest (18 tests)
│   ├── rpa_ai_runner.py                 # File thực thi Robot qua Terminal Console
│   └── run.py                           # Khởi chạy máy chủ Uvicorn cổng 8000
├── chrome_extension/                    # TIỆN ÍCH CHROME EXTENSION (CHẠY TAB BÊN CẠNH)
│   ├── manifest.json                    # Khai báo quyền, matches domain AI (MV3)
│   ├── background.js                    # Service Worker điều phối tab và lệnh chạy
│   ├── content_tunetext.js              # Cầu nối giữa Web localhost:8000 và Extension
│   ├── content_ai.js                    # Script nhúng trực tiếp vào ChatGPT/Claude/Gemini
│   └── styles.css                       # Giao diện HUD nổi trên tab AI
├── .env                                 # Biến môi trường cấu hình mật khẩu & token
├── ANTIGRAVITY.md                       # Bản đồ định hướng chính cho AI Agent
├── INDEX.md                             # Mục lục tra cứu toàn diện (file này)
├── PROJECT_REQUIREMENTS.md              # Đặc tả yêu cầu phần mềm (SRS)
├── README.md                            # Giới thiệu tổng quan toàn dự án
├── start_server.bat                     # File chạy nhanh Server Web cổng 8000
└── CAI_DAT_TIEN_ICH_CHROME.bat          # Hướng dẫn nạp Extension vào Chrome
```
