@echo off
chcp 65001 > nul
title Tune-Text - Cloudflare Tunnel Runner
color 0B

echo ================================================================
echo        TUNE-TEXT PLATFORM - KHOI CHAY CLOUDFLARE TUNNEL
echo   (Chia sẻ ứng dụng ra Internet an toàn, bảo mật, miễn phí 100%%)
echo ================================================================
echo.

cd /d "%~dp0"

:: 1. Kiểm tra file cloudflared.exe
if not exist "cloudflared.exe" (
    if exist "backend\cloudflared.exe" (
        copy /y "backend\cloudflared.exe" "cloudflared.exe" > nul
    ) else (
        echo [!] Chua tim thay file cloudflared.exe.
        echo [*] Dang tu dong tai phien ban moi nhat tu Cloudflare Official...
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
        if not exist "cloudflared.exe" (
            echo [X] Khong the tai cloudflared.exe. Vui long kiem tra ket noi mang!
            pause
            exit /b 1
        )
        echo [V] Da tai xong cloudflared.exe thanh cong!
        echo.
    )
)

:: 2. Đọc CLOUDFLARE_TUNNEL_TOKEN và CLOUDFLARE_TUNNEL_DOMAIN từ file .env (Bảo mật tuyệt đối, không hardcode token trong code)
set "TOKEN="
set "CUSTOM_DOMAIN="

if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
        if "%%A"=="CLOUDFLARE_TUNNEL_TOKEN" if not "%%B"=="" set "TOKEN=%%B"
        if "%%A"=="CLOUDFLARE_TUNNEL_DOMAIN" if not "%%B"=="" set "CUSTOM_DOMAIN=%%B"
    )
)
if "%TOKEN%"=="" if exist "backend\.env" (
    for /f "usebackq tokens=1,* delims==" %%A in ("backend\.env") do (
        if "%%A"=="CLOUDFLARE_TUNNEL_TOKEN" if not "%%B"=="" set "TOKEN=%%B"
        if "%%A"=="CLOUDFLARE_TUNNEL_DOMAIN" if not "%%B"=="" set "CUSTOM_DOMAIN=%%B"
    )
)

echo CHỌN CHẾ ĐỘ CHẠY CLOUDFLARE TUNNEL:
echo.
echo   [1] Chạy Quick Tunnel (KHÔNG CẦN TÀI KHOẢN, tự cấp link HTTPS dùng ngay)
echo   [2] Chạy Tunnel Trực Tiếp bằng Token của bạn (Xem nhật ký kết nối trực tiếp)
echo   [3] Cài đặt Thành Windows Service (Tự chạy ngầm 24/7 khi bật máy)
echo   [4] Gỡ bỏ Windows Service (Nếu không muốn chạy ngầm nữa)
echo   [5] Thoát
echo.
set /p CHOICE="👉 Nhập lựa chọn của bạn [1-5] (Mặc định: 2): "

if "%CHOICE%"=="" set CHOICE=2
if "%CHOICE%"=="1" goto QUICK_TUNNEL
if "%CHOICE%"=="2" goto TOKEN_TUNNEL
if "%CHOICE%"=="3" goto INSTALL_SERVICE
if "%CHOICE%"=="4" goto UNINSTALL_SERVICE
if "%CHOICE%"=="5" exit /b 0
goto TOKEN_TUNNEL

:QUICK_TUNNEL
cls
echo ================================================================
echo   DANG KHOI CHAY QUICK TUNNEL CHO UNG DUNG (http://localhost:8000)
echo ================================================================
echo.
echo [*] Cloudflare se cung cap 1 duong link HTTPS (vi du: https://xxxx.trycloudflare.com).
echo [*] Ban co the gui link do cho ban be hoac mo tren dien thoai de su dung.
echo [*] Luu y: Giu nguyen cua so nay khi dang dung. Nhan Ctrl + C de dung.
echo.
cloudflared.exe tunnel --url http://localhost:8000
pause
exit /b 0

:TOKEN_TUNNEL
cls
echo ================================================================
echo   KHOI CHAY TUNNEL BANG TOKEN CLOUDFLARE (Cua ban)
echo ================================================================
echo.
if "%TOKEN%"=="" (
    echo [!] Chua tim thay CLOUDFLARE_TUNNEL_TOKEN trong file .env.
    set /p "TOKEN=👉 Vui long dan Cloudflare Tunnel Token cua ban: "
)
if not "%CUSTOM_DOMAIN%"=="" (
    echo [*] Link truy cap truc tiep: https://%CUSTOM_DOMAIN%
)
echo [*] Dang ket noi toi Cloudflare Edge Network...
echo [*] Nhan Ctrl + C de dung bat cu luc nao.
echo.
cloudflared.exe tunnel run --token %TOKEN%
pause
exit /b 0

:INSTALL_SERVICE
cls
call "CAI_DAT_SERVICE_CLOUDFLARE.bat"
exit /b 0

:UNINSTALL_SERVICE
cls
echo ================================================================
echo   GO BO CLOUDFLARE WINDOWS SERVICE
echo ================================================================
echo.
powershell -Command "Start-Process cmd.exe -ArgumentList '/c cloudflared.exe service uninstall & pause' -Verb RunAs"
exit /b 0
