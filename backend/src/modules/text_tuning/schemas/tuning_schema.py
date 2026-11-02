from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class CreateTextTaskRequest(BaseModel):
    """Schema tạo tác vụ tinh chỉnh văn bản mới."""
    title: str = Field(..., max_length=200, description="Tiêu đề tác vụ")
    input_text: str = Field(..., description="Đoạn văn bản gốc cần xử lý/tinh chỉnh")
    mode: Optional[str] = Field("smart_tune", description="Chế độ xử lý: 'smart_tune', 'summarize', 'clean'")


class UpdateTextTaskRequest(BaseModel):
    """Schema cập nhật tác vụ tinh chỉnh văn bản."""
    title: Optional[str] = None
    tuned_text: Optional[str] = None
    status: Optional[str] = None


class TextTaskResponse(BaseModel):
    """Schema trả về thông tin tác vụ tinh chỉnh văn bản."""
    id: int
    title: str
    input_text: str
    tuned_text: Optional[str] = None
    status: str
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
