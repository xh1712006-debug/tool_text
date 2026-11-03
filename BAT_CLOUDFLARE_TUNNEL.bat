@echo off
chcp 65001 > nul
title Tune-Text Cloudflare Tunnel
color 0A

cd /d "%~dp0"

:: 1. Tự động đọc CLOUDFLARE_TUNNEL_TOKEN và CLOUDFLARE_TUNNEL_DOMAIN từ file .env (Bảo mật tuyệt đối, không lưu token vào file script)
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

echo ================================================================
echo       TUNE-TEXT - DANG KET NOI CLOUDFLARE TUNNEL (24/7)
echo ================================================================
if not "%CUSTOM_DOMAIN%"=="" (
    echo [*] Link truy cap truc tiep: https://%CUSTOM_DOMAIN%
) else (
    echo [*] Link truy cap: Theo domain ban da cau hinh tren Cloudflare Dashboard
)
echo [*] Dang ket noi Cloudflare Edge...
echo.
echo (Luu y: Giu nguyen cua so nay de web luon hoat dong online. Nhan Ctrl + C de dung)
echo.

if "%TOKEN%"=="" (
    echo [!] Chua tim thay CLOUDFLARE_TUNNEL_TOKEN trong file .env.
    set /p "TOKEN=👉 Vui long dan Cloudflare Tunnel Token cua ban: "
)

cloudflared.exe tunnel run --token %TOKEN%

pause

