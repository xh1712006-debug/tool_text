@echo off
chcp 65001 > nul
title Cai Dat Cloudflare Tunnel Service Tu Dong
color 0A

:: Tự động xin quyền Administrator (Run as Administrator)
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [i] Đang yêu cầu quyền Quản trị viên (Administrator)...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"

echo ================================================================
echo     CÀI ĐẶT CLOUDFLARE TUNNEL THÀNH WINDOWS SERVICE TỰ ĐỘNG
echo ================================================================
echo.

set "TOKEN=eyJhIjoiMmI1MGI5ZGJiYjYxY2YyZDg4OTY1MGNhNTViMzVhMTIiLCJ0IjoiNjdlY2M3M2EtMmQwOS00YjI3LWExNzUtMzMzNDFiY2NhMTcyIiwicyI6Ik56bGlabU13TXpndFlqSXhaUzAwTXpCa0xXRXhaV1l0T1RCaVl6Qm1aR1ZqTTJRNCJ9"
if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
        if "%%A"=="CLOUDFLARE_TUNNEL_TOKEN" if not "%%B"=="" set "TOKEN=%%B"
    )
)

if not exist "cloudflared.exe" (
    echo [!] Đang tải cloudflared.exe...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
)

echo [*] Đang cài đặt dịch vụ Cloudflared với Token của bạn...
echo.
cloudflared.exe service install %TOKEN%

if %errorLevel% equ 0 (
    echo.
    echo ================================================================
    echo [✓] CÀI ĐẶT THÀNH CÔNG!
    echo [*] Dịch vụ Cloudflared đã được cài và đang chạy ngầm trong Windows.
    echo [*] Từ nay, mỗi khi bạn bật máy tính, Cloudflare Tunnel sẽ tự động kết nối!
    echo ================================================================
) else (
    echo.
    echo [!] Nếu dịch vụ đã từng cài trước đó, đang khởi động lại dịch vụ...
    net stop Cloudflared >nul 2>&1
    net start Cloudflared >nul 2>&1
    if %errorLevel% equ 0 (
        echo [✓] Dịch vụ Cloudflared đang HOẠT ĐỘNG!
    ) else (
        echo [!] Gợi ý: Nếu muốn gỡ bỏ cài đặt cũ để cài mới, chạy lệnh: cloudflared.exe service uninstall
    )
)

echo.
echo Bạn có thể kiểm tra trạng thái dịch vụ trong Windows Services (services.msc).
echo.
pause
