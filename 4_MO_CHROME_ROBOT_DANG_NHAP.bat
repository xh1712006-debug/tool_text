@echo off
chcp 65001 > nul
title Mo Trinh Duyet Robot De Dang Nhap (Khong Tat May)
echo ===================================================================
echo  MỞ CỬA SỔ CHROME ROBOT ĐỂ ĐĂNG NHẬP SẴN (KHÔNG CẦN OUT MÁY)
echo ===================================================================
echo.
echo Cửa sổ Chrome riêng biệt của Robot sẽ mở lên ngay sau đây.
echo Cửa sổ này HOÀN TOÀN ĐỘC LẬP với trình duyệt bạn đang lướt web,
echo KHÔNG làm mất bất kỳ tab nào hay tắt Chrome đang làm việc của bạn.
echo.
echo Hướng dẫn:
echo 1. Hãy đăng nhập tài khoản Google / ChatGPT / Claude... trên cửa sổ này 1 lần.
echo 2. Sau khi đăng nhập thành công, bạn có thể đóng cửa sổ lại.
echo 3. Mọi dữ liệu đã được lưu vĩnh viễn cho Robot tự động chạy sau này.
echo ===================================================================
cd /d "%~dp0\backend"
..\.venv\Scripts\python.exe -c "import os, sys; sys.path.insert(0, os.getcwd()); from src.modules.ai_automation.services.rpa_chatgpt_service import RPAChatGPTService; RPAChatGPTService.open_login_browser('https://chatgpt.com')"
echo.
pause

