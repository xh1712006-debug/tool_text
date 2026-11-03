@echo off
chcp 65001 > nul
title Tune-Text Platform - Docker Manager
color 0B

cd /d "%~dp0"

echo ================================================================
echo        TUNE-TEXT PLATFORM - TRÌNH ĐIỀU KHIỂN DOCKER
echo   (Đóng gói độc lập, kèm Cơ sở Dữ liệu & Cloudflare Tunnel)
echo ================================================================
echo.

:: 1. Kiểm tra Docker
docker --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [X] Chưa phát hiện Docker trên máy tính hoặc Docker Desktop chưa bật!
    echo [*] Vui lòng mở ứng dụng Docker Desktop rồi chạy lại file này.
    pause
    exit /b 1
)

:: 2. Xác định file .env
set "ENV_ARG="
if exist ".env" (
    set "ENV_ARG=--env-file .env"
) else if exist "backend\.env" (
    set "ENV_ARG=--env-file backend\.env"
)

echo CHỌN CHẾ ĐỘ CHẠY DOCKER:
echo.
echo   [1] Khởi chạy Tune-Text (PostgreSQL 16 + Web UI) - Khuyên Dùng
echo   [2] Khởi chạy Tune-Text + Kèm Cloudflare Tunnel (Online 24/7)
echo   [3] Tải lại mã mới và Build lại Image (Rebuild)
echo   [4] Xem trạng thái các Container đang chạy (Status)
echo   [5] Xem Log thời gian thực của Web UI (Logs)
echo   [6] Dừng toàn bộ hệ thống Docker (Stop)
echo   [7] Thoát
echo.
set /p CHOICE="👉 Nhập lựa chọn của bạn [1-7] (Mặc định: 1): "

if "%CHOICE%"=="" set CHOICE=1
if "%CHOICE%"=="1" goto START_APP
if "%CHOICE%"=="2" goto START_ALL
if "%CHOICE%"=="3" goto REBUILD
if "%CHOICE%"=="4" goto STATUS
if "%CHOICE%"=="5" goto LOGS
if "%CHOICE%"=="6" goto STOP_ALL
if "%CHOICE%"=="7" exit /b 0
goto START_APP

:START_APP
cls
echo ================================================================
echo   ĐANG KHỞI CHẠY TUNE-TEXT VỚI DOCKER...
echo ================================================================
docker compose %ENV_ARG% up -d postgres api
if %errorLevel% equ 0 (
    echo.
    echo ================================================================
    echo [✓] KHỞI CHẠY DOCKER THÀNH CÔNG!
    echo [*] Cơ sở Dữ liệu: Đã nạp sẵn dữ liệu ban đầu từ docker-entrypoint-initdb.d
    echo [*] Địa chỉ Web:   http://localhost:8000
    echo [*] Swagger API:   http://localhost:8000/docs
    echo ================================================================
)
pause
exit /b 0

:START_ALL
cls
echo ================================================================
echo   ĐANG KHỞI CHẠY TUNE-TEXT + CLOUDFLARE TUNNEL...
echo ================================================================
docker compose %ENV_ARG% --profile tunnel up -d
if %errorLevel% equ 0 (
    echo.
    echo ================================================================
    echo [✓] ĐÃ KHỞI CHẠY TOÀN BỘ HỆ THỐNG VÀ ĐƯỜNG HẦM CLOUDFLARE!
    echo [*] Địa chỉ Web Local:     http://localhost:8000
    echo [*] Truy cập Online 24/7: Theo domain Cloudflare Tunnel bạn đã cấu hình
    echo ================================================================
)
pause
exit /b 0

:REBUILD
cls
echo ================================================================
echo   ĐANG BUILD LẠI DOCKER IMAGE MỚI NHẤT...
echo ================================================================
docker compose %ENV_ARG% build --no-cache
docker compose %ENV_ARG% up -d postgres api
echo.
echo [✓] Đã cập nhật xong Image mới nhất!
pause
exit /b 0

:STATUS
cls
echo ================================================================
echo   TRẠNG THÁI CÁC CONTAINER TUNE-TEXT:
echo ================================================================
docker compose %ENV_ARG% ps
echo.
pause
exit /b 0

:LOGS
cls
echo ================================================================
echo   LOGS THỜI GIAN THỰC (Nhấn Ctrl + C để thoát):
echo ================================================================
docker compose %ENV_ARG% logs -f api
exit /b 0

:STOP_ALL
cls
echo ================================================================
echo   ĐANG DỪNG CÁC DỊCH VỤ DOCKER...
echo ================================================================
docker compose %ENV_ARG% down
echo [✓] Đã dừng toàn bộ dịch vụ. Dữ liệu PostgreSQL được lưu trữ an toàn trong Docker Volume.
pause
exit /b 0
