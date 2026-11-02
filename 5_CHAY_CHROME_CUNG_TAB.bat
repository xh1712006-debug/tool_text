@echo off
chcp 65001 > nul
title Chay Chrome Cung Tab (Dieu Khien Truc Tiep Tab Ben Canh)
echo ===================================================================
echo  KHỞI ĐỘNG CHROME CHẾ ĐỘ CÙNG TAB (ĐIỀU KHIỂN TRỰC TIẾP TAB BÊN CẠNH)
echo ===================================================================
echo.
echo Đang mở trình duyệt Chrome với:
echo  - Tab 1: Tune-Text Platform (http://localhost:8000)
echo  - Tab 2: ChatGPT (https://chatgpt.com)
echo.
echo Cổng điều khiển 9222 được bật sẵn để Robot kết nối thẳng vào
echo tab ChatGPT bên cạnh mà không bao giờ mở trình duyệt mới!
echo ===================================================================
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 "http://localhost:8000" "https://chatgpt.com"

