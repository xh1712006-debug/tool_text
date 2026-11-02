@echo off
chcp 65001 > nul
echo ===================================================================
echo   KHỞI CHẠY HỆ THỐNG TUNE-TEXT MONOLITH FULLSTACK (FASTAPI + UI)
echo ===================================================================
echo   Địa chỉ truy cập Web: http://localhost:8000
echo   Tài liệu Swagger API:  http://localhost:8000/docs
echo ===================================================================
cd /d "%~dp0\backend"
..\.venv\Scripts\python.exe run.py
pause

