@echo off
chcp 65001 > nul
title Khoi dong Chrome voi tai khoan Google that
echo ===================================================================
echo  KHỞI ĐỘNG GOOGLE CHROME VỚI PROFILE THẬT (DÙNG NICK ĐĂNG NHẬP SẴN)
echo ===================================================================
echo.
echo [1/2] Đang đóng các cửa sổ Chrome cũ để chuyển sang chế độ điều khiển...
taskkill /F /IM chrome.exe >nul 2>&1
timeout /t 1 >nul

echo [2/2] Đang mở Chrome thật với nick Google của bạn (Cổng điều khiển 9222)...
set CHROME_BIN="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_BIN% (
    set CHROME_BIN="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)
if not exist %CHROME_BIN% (
    set CHROME_BIN="%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
)

start "" %CHROME_BIN% --remote-debugging-port=9222 --restore-last-session

echo.
echo ===================================================================
echo  ✅ ĐÃ MỞ CHROME THÀNH CÔNG VỚI NICK GOOGLE VÀ TÀI KHOẢN AI CỦA BẠN!
echo  Bây giờ Robot trên Web (hoặc file bat) sẽ tự động vào thẳng các
echo  trang AI bằng chính nick thật của bạn mà không cần đăng nhập lại.
echo ===================================================================
timeout /t 3 >nul

