from fastapi import Request, HTTPException, status
from fastapi.exceptions import RequestValidationError
from src.utils.responses import error_response


async def http_exception_handler(request: Request, exc: HTTPException):
    """
    Bắt các lỗi HTTPException và định dạng lại theo cấu trúc phản hồi chuẩn của hệ thống:
    { "success": false, "error": { "code": "...", "message": "...", "details": [...] } }
    """
    code_map = {
        status.HTTP_400_BAD_REQUEST: "BAD_REQUEST",
        status.HTTP_401_UNAUTHORIZED: "UNAUTHORIZED",
        status.HTTP_403_FORBIDDEN: "FORBIDDEN",
        status.HTTP_404_NOT_FOUND: "NOT_FOUND",
        status.HTTP_409_CONFLICT: "CONFLICT",
        422: "VALIDATION_ERROR"
    }
    error_code = code_map.get(exc.status_code, "ERROR")
    return error_response(
        message=str(exc.detail),
        code=error_code,
        status_code=exc.status_code
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Bắt lỗi dữ liệu đầu vào không hợp lệ từ Pydantic và trích xuất chi tiết từng trường bị lỗi.
    """
    details = []
    for err in exc.errors():
        field = ".".join(str(loc) for loc in err.get("loc", []))
        details.append({
            "field": field,
            "issue": err.get("msg", "Invalid value")
        })

    return error_response(
        message="Dữ liệu đầu vào không đúng định dạng yêu cầu.",
        code="VALIDATION_ERROR",
        details=details,
        status_code=422
    )


async def general_exception_handler(request: Request, exc: Exception):
    """
    Bắt mọi ngoại lệ không mong muốn để ngăn chặn lộ thông tin hệ thống nhạy cảm.
    """
    return error_response(
        message="Hệ thống đã xảy ra sự cố nội bộ ngoài dự kiến. Vui lòng thử lại sau.",
        code="INTERNAL_SERVER_ERROR",
        details=[{"reason": str(exc)}],
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
