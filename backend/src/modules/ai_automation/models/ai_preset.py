import json
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from src.database import Base


class AIPreset(Base):
    """
    Model quản lý cấu hình nhận diện các nền tảng AI Web trong PostgreSQL.
    Cho phép hệ thống tương tác với bất kỳ con AI nào (ChatGPT, Claude, Gemini, DeepSeek, Poe...)
    mà không cần huấn luyện lại mô hình.
    """
    __tablename__ = "ai_presets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    platform_code = Column(String(50), unique=True, index=True, nullable=False)
    target_url = Column(String(255), nullable=False)
    input_selectors = Column(Text, nullable=False)
    send_btn_selectors = Column(Text, nullable=False)
    stop_btn_selectors = Column(Text, nullable=False)
    notes = Column(Text, nullable=True)
    is_built_in = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    def to_dict(self):
        """Chuyển đổi thành từ điển phục vụ Serialization."""
        return {
            "id": self.id,
            "name": self.name,
            "platform_code": self.platform_code,
            "target_url": self.target_url,
            "input_selectors": self.input_selectors,
            "send_btn_selectors": self.send_btn_selectors,
            "stop_btn_selectors": self.stop_btn_selectors,
            "notes": self.notes,
            "is_built_in": self.is_built_in,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


# Danh sách cấu hình mặc định sẵn có của các nền tảng AI phổ biến
DEFAULT_AI_PRESETS = [
    {
        "name": "OpenAI ChatGPT",
        "platform_code": "chatgpt",
        "target_url": "https://chatgpt.com",
        "input_selectors": "#prompt-textarea, textarea[data-id='root'], div[contenteditable='true'], textarea",
        "send_btn_selectors": "button[data-testid='send-button'], button[aria-label*='Send'], button[aria-label*='Gửi']",
        "stop_btn_selectors": "button[data-testid='stop-button'], button[aria-label*='Stop'], button[aria-label*='Dừng'], .result-streaming",
        "notes": "Hỗ trợ ChatGPT Free, Plus, Team. Tự động phát hiện streaming.",
        "is_built_in": True
    },
    {
        "name": "Anthropic Claude",
        "platform_code": "claude",
        "target_url": "https://claude.ai/new",
        "input_selectors": "div[contenteditable='true'], div.ProseMirror, textarea",
        "send_btn_selectors": "button[aria-label*='Send'], button[aria-label*='Gửi'], button:has(svg)",
        "stop_btn_selectors": "button[aria-label*='Stop'], button[aria-label*='Dừng']",
        "notes": "Hỗ trợ Claude 3.5 Sonnet / Haiku. Nhận diện ProseMirror Rich Text Editor.",
        "is_built_in": True
    },
    {
        "name": "Google Gemini",
        "platform_code": "gemini",
        "target_url": "https://gemini.google.com/app",
        "input_selectors": "div.ql-editor[contenteditable='true'], textarea[aria-label*='prompt'], div[contenteditable='true'], textarea",
        "send_btn_selectors": "button[aria-label*='Send prompt'], button.send-button, button[mattooltip*='Send']",
        "stop_btn_selectors": "button[aria-label*='Stop response'], button[aria-label*='Dừng']",
        "notes": "Hỗ trợ Gemini Pro / Advanced với Quill Editor.",
        "is_built_in": True
    },
    {
        "name": "DeepSeek Chat",
        "platform_code": "deepseek",
        "target_url": "https://chat.deepseek.com",
        "input_selectors": "textarea#chat-input, textarea, div[contenteditable='true']",
        "send_btn_selectors": "div[role='button']:has(svg), button:has(svg), button[type='submit']",
        "stop_btn_selectors": "div[role='button'][aria-label*='Stop'], .ds-button--stop, button[aria-label*='Stop']",
        "notes": "Hỗ trợ DeepSeek V3 và DeepSeek R1.",
        "is_built_in": True
    },
    {
        "name": "Poe AI",
        "platform_code": "poe",
        "target_url": "https://poe.com",
        "input_selectors": "textarea[class*='ChatMessageInput'], div[contenteditable='true'], textarea",
        "send_btn_selectors": "button[class*='ChatMessageSendButton'], button[aria-label*='Send']",
        "stop_btn_selectors": "button[class*='ChatMessageStopButton'], button[aria-label*='Stop']",
        "notes": "Hỗ trợ tất cả các bot tổng hợp trên hệ thống Poe.",
        "is_built_in": True
    },
    {
        "name": "Perplexity AI",
        "platform_code": "perplexity",
        "target_url": "https://www.perplexity.ai",
        "input_selectors": "textarea[placeholder*='Ask'], div[contenteditable='true'], textarea",
        "send_btn_selectors": "button[aria-label*='Submit'], button[type='submit']",
        "stop_btn_selectors": "button[aria-label*='Stop']",
        "notes": "Hỗ trợ công cụ tìm kiếm và đối thoại AI Perplexity.",
        "is_built_in": True
    }
]

