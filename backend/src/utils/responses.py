from typing import Any, Optional
from fastapi.responses import JSONResponse


def success_response(
    data: Any = None, 
    message: str = "Success", 
    status_code: int = 200
) -> JSONResponse:
    """
    Chuẩn hóa cấu trúc phản hồi thành công theo đặc tả tại docs/cores/02-backend.md.
    Giúp Frontend luôn nhận được định dạng dữ liệu đồng nhất.
    """
    content = {
        "success": True,
        "message": message,
        "data": data
    }
    return JSONResponse(status_code=status_code, content=content)


def error_response(
    message: str, 
    code: str = "BAD_REQUEST", 
    details: Optional[Any] = None, 
    status_code: int = 400
) -> JSONResponse:
    """
    Chuẩn hóa cấu trúc phản hồi lỗi theo đặc tả tại docs/cores/02-backend.md.
    Hỗ trợ chi tiết lỗi để lập trình viên hoặc client dễ debug.
    """
    content = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details or []
        }
    }
    return JSONResponse(status_code=status_code, content=content)

