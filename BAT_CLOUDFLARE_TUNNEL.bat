@echo off
chcp 65001 > nul
title Tune-Text Cloudflare Tunnel
color 0A

cd /d "%~dp0"

echo ================================================================
echo       TUNE-TEXT - DANG KET NOI CLOUDFLARE TUNNEL (24/7)
echo ================================================================
echo [*] Link truy cap truc tiep: https://text.nextdev.name.vn
echo [*] Dang ket noi Cloudflare Edge...
echo.
echo (Luu y: Giu nguyen cua so nay de web luon hoat dong online. Nhan Ctrl + C de dung)
echo.

set "TOKEN=eyJhIjoiMmI1MGI5ZGJiYjYxY2YyZDg4OTY1MGNhNTViMzVhMTIiLCJ0IjoiNjdlY2M3M2EtMmQwOS00YjI3LWExNzUtMzMzNDFiY2NhMTcyIiwicyI6Ik56bGlabU13TXpndFlqSXhaUzAwTXpCa0xXRXhaV1l0T1RCaVl6Qm1aR1ZqTTJRNCJ9"
if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
        if "%%A"=="CLOUDFLARE_TUNNEL_TOKEN" if not "%%B"=="" set "TOKEN=%%B"
    )
)

cloudflared.exe tunnel run --token %TOKEN%

pause
