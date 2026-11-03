@echo off
chcp 65001 > nul
title Tune-Text Platform - Docker Manager
color 0B

cd /d "%~dp0"

echo ================================================================
echo        TUNE-TEXT PLATFORM - TRÌNH ĐIỀU KHIỂN DOCKER
echo   (Đóng gói độc lập, chạy mượt mà trên mọi hệ điều hành)
echo ================================================================
echo.

:: Kiểm tra Docker
docker --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [X] Chưa phát hiện Docker trên máy tính hoặc Docker Desktop chưa bật!
    echo [*] Vui lòng mở ứng dụng Docker Desktop rồi chạy lại file này.
    pause
    exit /b 1
)

echo CHỌN CHẾ ĐỘ CHẠY DOCKER:
echo.
echo   [1] Khởi chạy Tune-Text (PostgreSQL 16 + Web UI) - Khuyên Dùng
echo   [2] Khởi chạy Tune-Text + Kèm Cloudflare Tunnel (Online 24/7)
echo   [3] Tải lại mã mới và Build lại Image (Rebuild)
echo   [4] Xem trạng thái các Container đang chạy
echo   [5] Dừng toàn bộ hệ thống Docker (Stop)
echo   [6] Thoát
echo.
set /p CHOICE="👉 Nhập lựa chọn của bạn [1-6] (Mặc định: 1): "

if "%CHOICE%"=="" set CHOICE=1
if "%CHOICE%"=="1" goto START_APP
if "%CHOICE%"=="2" goto START_ALL
if "%CHOICE%"=="3" goto REBUILD
if "%CHOICE%"=="4" goto STATUS
if "%CHOICE%"=="5" goto STOP_ALL
if "%CHOICE%"=="6" exit /b 0
goto START_APP

:START_APP
cls
echo ================================================================
echo   ĐANG KHỞI CHẠY TUNE-TEXT VỚI DOCKER...
echo ================================================================
docker compose up -d postgres api
if %errorLevel% equ 0 (
    echo.
    echo ================================================================
    echo [✓] KHỞI CHẠY DOCKER THÀNH CÔNG!
    echo [*] Địa chỉ Web: http://localhost:8000
    echo [*] Swagger API: http://localhost:8000/docs
    echo ================================================================
)
pause
exit /b 0

:START_ALL
cls
echo ================================================================
echo   ĐANG KHỞI CHẠY TUNE-TEXT + CLOUDFLARE TUNNEL...
echo ================================================================
docker compose --profile tunnel up -d
if %errorLevel% equ 0 (
    echo.
    echo ================================================================
    echo [✓] ĐÃ KHỞI CHẠY TOÀN BỘ HỆ THỐNG VÀ ĐƯỜNG HẦM CLOUDFLARE!
    echo [*] Địa chỉ Web Local: http://localhost:8000
    echo ================================================================
)
pause
exit /b 0

:REBUILD
cls
echo ================================================================
echo   ĐANG BUILD LẠI DOCKER IMAGE MỚI NHẤT...
echo ================================================================
docker compose build --no-cache
docker compose up -d postgres api
echo.
echo [✓] Đã cập nhật xong Image mới nhất!
pause
exit /b 0

:STATUS
cls
echo ================================================================
echo   TRẠNG THÁI CÁC CONTAINER TUNE-TEXT:
echo ================================================================
docker compose ps
echo.
pause
exit /b 0

:STOP_ALL
cls
echo ================================================================
echo   ĐANG DỪNG HỆ THỐNG DOCKER...
echo ================================================================
docker compose down
echo.
echo [✓] Đã dừng toàn bộ container an toàn.
pause
exit /b 0
