@echo off
chcp 65001 > nul
title Dong bo tai khoan Google & AI tu Chrome that
echo ===================================================================
echo  ĐỒNG BỘ NICK GOOGLE VÀ TÀI KHOẢN AI TỪ CHROME THẬT SANG ROBOT
echo ===================================================================
echo.
echo Đang sao chép toàn bộ Cookies, LocalStorage và Session đăng nhập
echo từ Google Chrome của bạn sang Profile của Robot...
echo.
cd /d "%~dp0\backend"
..\.venv\Scripts\python.exe -c "import os, sys; sys.path.insert(0, os.getcwd()); from src.modules.ai_automation.services.rpa_chatgpt_service import RPAChatGPTService; RPAChatGPTService.sync_chrome_profile()"
echo.
echo ===================================================================
echo  ✅ ĐỒNG BỘ HOÀN TẤT!
echo  Từ giờ Robot sẽ tự động mở thẳng nick Google, ChatGPT, Claude...
echo  của bạn mà không cần đăng nhập lại từ đầu.
echo ===================================================================
pause

