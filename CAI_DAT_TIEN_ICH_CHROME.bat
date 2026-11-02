@echo off
chcp 65001 > nul
title Cai Dat Tien Ich Chrome - Chay Tab Ben Canh
echo ===================================================================
echo  HƯỚNG DẪN CÀI ĐẶT TIỆN ÍCH CHROME (CHẠY TRỰC TIẾP TAB BÊN CẠNH)
echo ===================================================================
echo.
echo 1. Đã tự động sao chép sẵn đường dẫn thư mục vào bộ nhớ tạm:
echo    d:\project\project-local\tune-text\chrome_extension
echo.
echo 2. Đang mở trang chrome://extensions trên trình duyệt Chrome...
powershell -Command "Set-Clipboard -Value 'd:\project\project-local\tune-text\chrome_extension'; Start-Process 'chrome.exe' 'chrome://extensions'"
echo.
echo -------------------------------------------------------------------
echo  CÁC BƯỚC THỰC HIỆN TRÊN MÀN HÌNH CHROME VỪA BẬT:
echo -------------------------------------------------------------------
echo  [Bước 1] Nhìn lên GÓC TRÊN CÙNG BÊN PHẢI:
echo           Gạt công tắc "Chế độ dành cho nhà phát triển" (Developer mode) sang BẬT (màu xanh).
echo.
echo  [Bước 2] Nhìn sang GÓC TRÊN CÙNG BÊN TRÁI:
echo           Bấm nút "Tải tiện ích đã giải nén" (Load unpacked).
echo.
echo  [Bước 3] Khi cửa sổ chọn thư mục hiện lên:
echo           Dán đường dẫn (Ctrl + V) hoặc chọn thư mục:
echo           d:\project\project-local\tune-text\chrome_extension
echo           Rồi bấm "Select Folder" (Chọn thư mục).
echo.
echo ===================================================================
echo  ✅ HOÀN TẤT! Bây giờ bạn quay lại tab Tune-Text bấm chạy là được!
echo ===================================================================
pause

