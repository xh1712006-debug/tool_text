@echo off
title Cloudflare Tunnel Runner
echo ========================================================
echo  KHOI CHAY CLOUDFLARE TUNNEL (KHONG CAN CAI DAT SERVICE)
echo ========================================================

set TOKEN=eyJhIjoiMmI1MGI5ZGJiYjYxY2YyZDg4OTY1MGNhNTViMzVhMTIiLCJ0IjoiNjdlY2M3M2EtMmQwOS00YjI3LWExNzUtMzMzNDFiY2NhMTcyIiwicyI6Ik56bGlabU13TXpndFlqSXhaUzAwTXpCa0xXRXhaV1l0T1RCaVl6Qm1aR1ZqTTJRNCJ9

if not exist "%~dp0cloudflared.exe" (
    echo Dang tai cloudflared.exe...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '%~dp0cloudflared.exe'"
)

echo Dang ket noi tunnel den Cloudflare Network...
"%~dp0cloudflared.exe" tunnel run --token %TOKEN%
pause

