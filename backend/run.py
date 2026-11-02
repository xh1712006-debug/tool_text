import os
import sys

# Nạp thư mục DLL cần thiết trên môi trường Windows
if os.name == "nt" and os.path.exists(r"D:\bin"):
    try:
        os.add_dll_directory(r"D:\bin")
    except Exception:
        pass

# Đảm bảo đường dẫn import hoạt động chính xác từ thư mục gốc backend
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import uvicorn

if __name__ == "__main__":
    """Khởi chạy máy chủ phát triển Uvicorn với chế độ tự nạp lại khi sửa code (reload)."""
    uvicorn.run("src.main:app", host="localhost", port=8000, reload=True)
