@echo off
chcp 65001 > nul
title Universal AI Prompter Runner
echo ===================================================================
echo  KHỞI CHẠY ROBOT TỰ ĐỘNG GÕ ĐA NỀN TẢNG AI (RPA AUTO-PROMPTER)
echo ===================================================================

set "PATH=D:\bin;%PATH%"
cd /d "%~dp0"

if exist "..\.venv\Scripts\python.exe" (
    "..\.venv\Scripts\python.exe" rpa_ai_runner.py
) else (
    python rpa_ai_runner.py
)

pause

