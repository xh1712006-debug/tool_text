@echo off
chcp 65001 > nul
cd /d "%~dp0\backend"
call run_cloudflared.bat

