from typing import List, Optional
from pydantic import BaseModel, Field


class StartRPARequest(BaseModel):
    """Schema yêu cầu bắt đầu chu trình tự động hóa gõ vào ChatGPT hoặc bất kỳ nền tảng AI nào."""
    target_url: str = Field("https://chatgpt.com", description="Đường dẫn đến trang AI (ChatGPT, Claude, Gemini, DeepSeek, Poe...)")
    prompts_text: str = Field(..., description="Toàn bộ nội dung văn bản. Có thể phân tách bằng dòng trống hoặc ký tự ngăn cách.")
    split_mode: Optional[str] = Field("paragraph", description="'paragraph' (theo đoạn văn) hoặc 'line' (từng dòng)")
    delay_between_prompts: Optional[float] = Field(4.0, description="Số giây nghỉ giữa mỗi lần gửi")
    loop_count: Optional[int] = Field(1, description="Số lần lặp lại chu kỳ gửi toàn bộ danh sách prompt")
    duration_minutes: Optional[float] = Field(0.0, description="Thời gian chạy tối đa tính bằng phút (0 = không giới hạn)")
    platform_code: Optional[str] = Field("custom", description="Mã nền tảng (chatgpt, claude, gemini, deepseek, poe, custom...)")
    custom_input_selector: Optional[str] = Field(None, description="CSS selector tùy chỉnh cho ô nhập liệu")
    custom_send_selector: Optional[str] = Field(None, description="CSS selector tùy chỉnh cho nút gửi")
    custom_stop_selector: Optional[str] = Field(None, description="CSS selector tùy chỉnh cho nút dừng")


class RPAStatusResponse(BaseModel):
    """Schema trả về trạng thái tiến độ thời gian thực của Robot."""
    is_running: bool
    current_index: int
    total_prompts: int
    current_prompt: Optional[str] = ""
    status_message: str
    logs: List[str]


class AIPresetCreateRequest(BaseModel):
    """Schema tạo cấu hình nền tảng AI mới vào PostgreSQL."""
    name: str = Field(..., description="Tên định danh nền tảng AI")
    platform_code: str = Field(..., description="Mã duy nhất viết thường không dấu")
    target_url: str = Field(..., description="Đường dẫn website AI")
    input_selectors: str = Field(..., description="Danh sách CSS selector ô nhập liệu")
    send_btn_selectors: str = Field(..., description="CSS selector nút gửi")
    stop_btn_selectors: str = Field(..., description="CSS selector phát hiện sinh câu trả lời")
    notes: Optional[str] = Field(None, description="Ghi chú về AI này")


class AIPresetUpdateRequest(BaseModel):
    """Schema cập nhật cấu hình nền tảng AI."""
    name: Optional[str] = None
    target_url: Optional[str] = None
    input_selectors: Optional[str] = None
    send_btn_selectors: Optional[str] = None
    stop_btn_selectors: Optional[str] = None
    notes: Optional[str] = None
