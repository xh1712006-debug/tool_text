@echo off
title Cloudflare Tunnel Runner
echo ========================================================
echo  KHOI CHAY CLOUDFLARE TUNNEL (KHONG CAN CAI DAT SERVICE)
echo ========================================================

set "TOKEN="
if exist "%~dp0.env" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%~dp0.env") do (
        if "%%A"=="CLOUDFLARE_TUNNEL_TOKEN" if not "%%B"=="" set "TOKEN=%%B"
    )
)
if "%TOKEN%"=="" if exist "%~dp0..\.env" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%~dp0..\.env") do (
        if "%%A"=="CLOUDFLARE_TUNNEL_TOKEN" if not "%%B"=="" set "TOKEN=%%B"
    )
)

if "%TOKEN%"=="" (
    echo [!] Chua tim thay CLOUDFLARE_TUNNEL_TOKEN trong file .env.
    set /p "TOKEN=👉 Vui long dan Cloudflare Tunnel Token cua ban: "
)

if not exist "%~dp0cloudflared.exe" (
    echo Dang tai cloudflared.exe...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '%~dp0cloudflared.exe'"
)

echo Dang ket noi tunnel den Cloudflare Network...
"%~dp0cloudflared.exe" tunnel run --token %TOKEN%
pause

