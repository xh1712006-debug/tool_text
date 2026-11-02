@echo off
chcp 65001 > nul
cd /d "%~dp0\.."
call start_chrome_with_account.bat

