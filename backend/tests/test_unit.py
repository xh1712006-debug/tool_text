import io
from docx import Document
from src.utils.security import hash_password, verify_password, create_access_token, decode_token
from src.modules.text_tuning.services.tuning_service import TextTuningService


def test_password_hashing():
    """Kiểm tra tính đúng đắn của hàm băm và đối chiếu mật khẩu."""
    password = "MySecurePassword123"
    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_token_generation_and_decoding():
    """Kiểm tra quy trình tạo và giải mã Access Token."""
    user_id = 99
    role = "ADMIN"
    token = create_access_token(subject=user_id, role=role)

    payload = decode_token(token)
    assert payload is not None
    assert payload.get("sub") == str(user_id)
    assert payload.get("role") == role
    assert payload.get("type") == "access"


def test_infinite_jwt_token_generation():
    """Kiểm tra sinh token vô hạn với thời hạn 100 năm (36.500 ngày)."""
    from datetime import timedelta, datetime, timezone
    user_id = 1
    role = "ADMIN"
    expires_delta = timedelta(days=36500)
    token = create_access_token(subject=user_id, role=role, expires_delta=expires_delta)

    payload = decode_token(token)
    assert payload is not None
    assert payload.get("sub") == str(user_id)
    assert payload.get("role") == role
    exp_timestamp = payload.get("exp")
    # Kiểm tra thời hạn lớn hơn 50 năm trong tương lai
    assert exp_timestamp > datetime.now(timezone.utc).timestamp() + (50 * 365 * 86400)



def test_text_tuning_service_formal_mode():
    """Kiểm tra chế độ Trang trọng: Sửa từ viết tắt 'ko', 'dc', 'vs' và căn chỉnh câu."""
    raw_input = "chúng tôi ko đồng ý vs phương án này vì chưa dc duyệt"
    tuned = TextTuningService.process_text(raw_input, mode="formal")

    assert "không" in tuned
    assert "với" in tuned
    assert "được" in tuned
    assert tuned.endswith(".")


def test_text_tuning_service_casual_mode():
    """Kiểm tra chế độ Thân thiện."""
    raw_input = "hôm nay rảnh ko ae đi cafe nhé"
    tuned = TextTuningService.process_text(raw_input, mode="casual")

    assert "không" in tuned
    assert "anh em" in tuned


def test_text_tuning_service_academic_mode():
    """Kiểm tra chế độ Học thuật."""
    raw_input = "kết quả khảo sát cho thấy hiệu quả tăng cao\nphương pháp này tối ưu hơn"
    tuned = TextTuningService.process_text(raw_input, mode="academic")

    assert "\n\n" in tuned


def test_text_tuning_service_clean_mode():
    """Kiểm tra chế độ làm sạch dấu câu và khoảng trắng."""
    raw_input = "  chỉ   xóa   khoảng trắng ,,, và dấu thừa ... "
    cleaned = TextTuningService.process_text(raw_input, mode="clean")

    assert "   " not in cleaned
    assert ",," not in cleaned


def test_file_extraction_txt():
    """Kiểm tra trích xuất nội dung từ tệp .txt."""
    sample_bytes = "Nội dung kiểm thử trích xuất từ file text".encode("utf-8")
    extracted = TextTuningService.extract_text_from_file(sample_bytes, "document.txt")
    assert extracted == "Nội dung kiểm thử trích xuất từ file text"


def test_file_extraction_docx():
    """Kiểm tra trích xuất nội dung từ tệp .docx."""
    doc = Document()
    doc.add_paragraph("Đoạn văn bản kiểm thử Word.")
    stream = io.BytesIO()
    doc.save(stream)
    stream.seek(0)

    extracted = TextTuningService.extract_text_from_file(stream.read(), "sample.docx")
    assert "Đoạn văn bản kiểm thử Word." in extracted


def test_file_extraction_paragraphs_spacing():
    """Kiểm tra trích xuất tệp Word có nhiều đoạn tự động cách nhau bằng 1 dòng trống (\\n\\n)."""
    doc = Document()
    doc.add_paragraph("Đoạn 1: newsprint and archival map surfaces...")
    doc.add_paragraph("Đoạn 2: A prominent halftone cutout of an ancient bronze...")
    stream = io.BytesIO()
    doc.save(stream)
    stream.seek(0)

    extracted = TextTuningService.extract_text_from_file(stream.read(), "google_doc.docx")
    assert "\n\n" in extracted
    parts = extracted.split("\n\n")
    assert len(parts) == 2
    assert parts[0].startswith("Đoạn 1")
    assert parts[1].startswith("Đoạn 2")


def test_ai_presets_list_and_target_url_routing(client):
    """Kiểm tra API presets trả về danh sách các nền tảng AI hợp lệ (Claude, Gemini, DeepSeek, ChatGPT...)."""
    res = client.get("/api/v1/rpa/presets")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    presets = data["data"]["presets"]
    assert len(presets) >= 6
    codes = [p["platform_code"] for p in presets]
    assert "chatgpt" in codes
    assert "claude" in codes
    assert "gemini" in codes
    assert "deepseek" in codes


def test_rpa_batch_size_grouping():
    """Kiểm tra thuật toán gom nhóm gộp nhiều đoạn prompt theo Batch Size."""
    import re
    raw_text = "Đoạn 1: Prompt A\n\nĐoạn 2: Prompt B\n\nĐoạn 3: Prompt C\n\nĐoạn 4: Prompt D\n\nĐoạn 5: Prompt E"
    prompts = [p.strip() for p in re.split(r"\n\s*\n+", raw_text) if p.strip()]
    assert len(prompts) == 5

    # Test gộp 2 đoạn/lần
    batch_size = 2
    batched = []
    for i in range(0, len(prompts), batch_size):
        chunk = prompts[i:i + batch_size]
        batched.append("\n\n".join(chunk))

    assert len(batched) == 3
    assert batched[0] == "Đoạn 1: Prompt A\n\nĐoạn 2: Prompt B"
    assert batched[1] == "Đoạn 3: Prompt C\n\nĐoạn 4: Prompt D"
    assert batched[2] == "Đoạn 5: Prompt E"

