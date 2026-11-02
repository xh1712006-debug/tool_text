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

:: 1. Kiểm tra và tự động tải cloudflared.exe nếu chưa có
if not exist "cloudflared.exe" (
    if exist "backend\cloudflared.exe" (
        copy /y "backend\cloudflared.exe" "cloudflared.exe" > nul
    ) else (
        echo [!] Chua tim thay file cloudflared.exe.
        echo [*] Dang tu dong tai phien ban moi nhat tu Cloudflare Official...
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe', 'cloudflared.exe')"
        if not exist "cloudflared.exe" (
            echo [X] Khong the tai cloudflared.exe. Vui long kiem tra ket noi mang!
            pause
            exit /b 1
        )
        echo [V] Da tai xong cloudflared.exe thanh cong!
        echo.
    )
)

:: 2. Đọc CLOUDFLARE_TUNNEL_TOKEN từ file .env nếu có
set TOKEN=
if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
        if "%%A"=="CLOUDFLARE_TUNNEL_TOKEN" set TOKEN=%%B
    )
)

echo CHỌN CHẾ ĐỘ CHẠY CLOUDFLARE TUNNEL:
echo.
echo   [1] Chạy Quick Tunnel Miễn Phí (KHÔNG CẦN TÀI KHOẢN, tự cấp link HTTPS dùng ngay)
echo   [2] Chạy Tunnel Cố Định theo Token trong .env (Domain riêng từ Cloudflare Zero Trust)
echo   [3] Cài đặt Cloudflare thành Windows Service (Tự chạy ngầm khi bật máy)
echo   [4] Thoát
echo.
set /p CHOICE="👉 Nhập lựa chọn của bạn [1-4] (Mặc định: 1): "

if "%CHOICE%"=="" set CHOICE=1
if "%CHOICE%"=="1" goto QUICK_TUNNEL
if "%CHOICE%"=="2" goto TOKEN_TUNNEL
if "%CHOICE%"=="3" goto INSTALL_SERVICE
if "%CHOICE%"=="4" exit /b 0
goto QUICK_TUNNEL

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
echo   KHOI CHAY TUNNEL CO DINH THEO TOKEN TRONG FILE .env
echo ================================================================
echo.
if "%TOKEN%"=="" (
    echo [!] Chua tim thay CLOUDFLARE_TUNNEL_TOKEN trong file .env.
    set /p TOKEN="👉 Vui long dan Token cua Cloudflare vao day: "
)

if "%TOKEN%"=="" (
    echo [X] Token trong! Khong the khoi chay.
    pause
    exit /b 1
)

echo [*] Dang ket noi toi Cloudflare Edge Network...
cloudflared.exe tunnel run --token %TOKEN%
pause
exit /b 0

:INSTALL_SERVICE
cls
echo ================================================================
echo   CAI DAT CLOUDFLARE TUNNEL THANH WINDOWS SERVICE TU KHOI DONG
echo ================================================================
echo.
if "%TOKEN%"=="" (
    set /p TOKEN="👉 Vui long dan CLOUDFLARE_TUNNEL_TOKEN tu Cloudflare Dashboard: "
)

if "%TOKEN%"=="" (
    echo [X] Token khong hop le.
    pause
    exit /b 1
)

echo [*] Dang cai dat Service... (Yeu cau quyen Run as Administrator)
cloudflared.exe service install %TOKEN%
if %ERRORLEVEL% EQU 0 (
    echo [V] Da cai dat Windows Service thanh cong!
    echo [*] Dich vu se tu dong khoi chay moi khi may tinh bat len.
) else (
    echo [X] Loi cai dat. Vui long click chuot phai vao file bat va chon 'Run as administrator'!
)
pause
exit /b 0

