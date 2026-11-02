import re
import io
from typing import Optional
from docx import Document
from pypdf import PdfReader
from src.config import settings

# Bảng từ điển chuyển đổi từ viết tắt / teencode tiếng Việt thông dụng
VIETNAMESE_ABBREVIATIONS = {
    r"\bko\b": "không",
    r"\bk\b": "không",
    r"\bkh\b": "không",
    r"\bkhong\b": "không",
    r"\bdc\b": "được",
    r"\bđc\b": "được",
    r"\bduoc\b": "được",
    r"\bvs\b": "với",
    r"\bvới lại\b": "đồng thời",
    r"\bae\b": "anh em",
    r"\bcx\b": "cũng",
    r"\bj\b": "gì",
    r"\bgi\b": "gì",
    r"\bbt\b": "biết",
    r"\bntn\b": "như thế nào",
    r"\bh\b": "giờ",
    r"\bgio\b": "giờ",
    r"\btks\b": "xin cảm ơn",
    r"\bthx\b": "cảm ơn",
    r"\bthanks\b": "cảm ơn",
    r"\bok\b": "đồng ý",
    r"\boke\b": "đồng ý",
    r"\bokay\b": "đồng ý",
    r"\br\b": "rồi",
    r"\broi\b": "rồi",
    r"\bmk\b": "mình",
    r"\bminh\b": "mình",
    r"\bbn\b": "bạn",
    r"\bban\b": "bạn",
    r"\bng\b": "người",
    r"\bnguoi\b": "người"
}


class TextTuningService:
    """
    Dịch vụ xử lý và tinh chỉnh văn bản tiếng Việt thông minh (100% Miễn phí & Offline).
    Tối ưu hóa dấu câu, sửa từ viết tắt, định dạng phong cách văn bản bền vững lâu dài.
    """

    @staticmethod
    def process_text(raw_text: str, mode: str = "smart_tune") -> str:
        """
        Chuẩn hóa toàn diện văn bản theo các chế độ phong cách khác nhau.
        Không phát sinh chi phí, xử lý tức thì bằng bộ phân tích NLP quy tắc.
        """
        if not raw_text:
            return ""

        # 1. Chuẩn hóa khoảng trắng cơ bản
        cleaned = re.sub(r"[ \t]+", " ", raw_text)
        cleaned = re.sub(r"\n\s*\n+", "\n\n", cleaned).strip()

        # 2. Xử lý dấu câu chuẩn tiếng Việt: Không có khoảng trắng trước dấu, luôn có khoảng trắng sau dấu
        cleaned = re.sub(r"\s+([,.:;!?])", r"\1", cleaned)
        cleaned = re.sub(r"([,.:;!?])(?=[^\s\d\n])", r"\1 ", cleaned)
        # Loại bỏ dấu câu lặp vô nghĩa (ví dụ: '..' hoặc ',,')
        cleaned = re.sub(r"\.{2,}", "...", cleaned)
        cleaned = re.sub(r",+", ",", cleaned)

        # 3. Phân nhánh theo từng chế độ nghiệp vụ
        if mode == "clean":
            # Chế độ làm sạch cơ bản: chỉ sửa khoảng trắng và dấu câu
            return cleaned

        elif mode == "formal":
            # Chế độ Trang trọng / Công việc:
            # - Sửa toàn bộ từ viết tắt/teencode
            # - Viết hoa chữ cái đầu câu
            # - Đảm bảo cuối đoạn có dấu chấm câu
            text_formal = cleaned
            for pattern, replacement in VIETNAMESE_ABBREVIATIONS.items():
                text_formal = re.sub(pattern, replacement, text_formal, flags=re.IGNORECASE)

            lines = text_formal.split("\n")
            tuned_lines = []
            for line in lines:
                line_str = line.strip()
                if line_str:
                    line_str = line_str[0].upper() + line_str[1:]
                    if line_str[-1] not in [".", "!", "?", ":", ";"]:
                        line_str += "."
                    tuned_lines.append(line_str)
            return "\n".join(tuned_lines)

        elif mode == "casual":
            # Chế độ Thân thiện / Mạng xã hội:
            # Sửa từ ngữ gãy gọn, giữ tính tự nhiên, căn chỉnh nhịp câu
            text_casual = cleaned
            for pattern, replacement in VIETNAMESE_ABBREVIATIONS.items():
                text_casual = re.sub(pattern, replacement, text_casual, flags=re.IGNORECASE)

            # Viết hoa đầu câu
            sentences = re.split(r"([.!?]\s*)", text_casual)
            rebuilt = []
            for s in sentences:
                if s and not re.match(r"^[.!?]\s*$", s):
                    s = s.strip()
                    if s:
                        s = s[0].upper() + s[1:]
                rebuilt.append(s)
            return "".join(rebuilt)

        elif mode == "academic":
            # Chế độ Học thuật / Báo cáo:
            # Cấu trúc rõ ràng, sửa từ viết tắt, định dạng logic
            text_acad = cleaned
            for pattern, replacement in VIETNAMESE_ABBREVIATIONS.items():
                text_acad = re.sub(pattern, replacement, text_acad, flags=re.IGNORECASE)

            lines = text_acad.split("\n")
            tuned_lines = []
            for idx, line in enumerate(lines):
                line_str = line.strip()
                if line_str:
                    line_str = line_str[0].upper() + line_str[1:]
                    if line_str[-1] not in [".", "!", "?", ":", ";"]:
                        line_str += "."
                    tuned_lines.append(line_str)
            return "\n\n".join(tuned_lines)

        elif mode == "summarize":
            # Chế độ Tóm tắt ý chính
            sentences = re.split(r"(?<=[.!?])\s+", cleaned)
            valid_sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
            if len(valid_sentences) <= 2:
                summary_text = " ".join(valid_sentences)
            else:
                # Chọn câu đầu và câu có độ dài hợp lý
                summary_text = f"{valid_sentences[0]} {valid_sentences[-1]}"
            return f"[TÓM TẮT SÚC TÍCH]:\n- {summary_text}"

        else:
            # Chế độ 'smart_tune' mặc định
            text_smart = cleaned
            for pattern, replacement in VIETNAMESE_ABBREVIATIONS.items():
                text_smart = re.sub(pattern, replacement, text_smart, flags=re.IGNORECASE)

            lines = text_smart.split("\n")
            tuned_lines = []
            for line in lines:
                line_str = line.strip()
                if line_str:
                    line_str = line_str[0].upper() + line_str[1:]
                    if line_str[-1] not in [".", "!", "?", ":", ";"]:
                        line_str += "."
                    tuned_lines.append(line_str)
            return "\n".join(tuned_lines)

    @staticmethod
    def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
        """
        Trích xuất văn bản từ tệp tin tải lên (.txt, .docx, .pdf).
        Tự động phân tách mỗi đoạn (paragraph) cách nhau đúng 1 dòng trống (\n\n).
        Hoàn toàn xử lý cục bộ, bảo mật và miễn phí 100%.
        """
        name_lower = filename.lower()
        if name_lower.endswith(".txt"):
            try:
                raw_text = file_bytes.decode("utf-8")
            except UnicodeDecodeError:
                raw_text = file_bytes.decode("latin-1", errors="ignore")
            paragraphs = [p.strip() for p in re.split(r"\n\s*\n+", raw_text) if p.strip()]
            return "\n\n".join(paragraphs)

        elif name_lower.endswith(".docx"):
            file_stream = io.BytesIO(file_bytes)
            doc = Document(file_stream)
            paragraphs = [p.text.strip() for p in doc.paragraphs if p.text and p.text.strip()]
            return "\n\n".join(paragraphs)

        elif name_lower.endswith(".pdf"):
            file_stream = io.BytesIO(file_bytes)
            reader = PdfReader(file_stream)
            text_blocks = []
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    parts = [p.strip() for p in re.split(r"\n\s*\n+", page_text) if p.strip()]
                    text_blocks.extend(parts)
            return "\n\n".join(text_blocks)

        else:
            raise ValueError(f"Định dạng tệp '{filename}' không được hỗ trợ. Vui lòng chọn file .txt, .docx hoặc .pdf.")

    @staticmethod
    def create_docx_file(text_content: str, title: str = "Tuned Text") -> io.BytesIO:
        """
        Tạo tệp Word (.docx) từ văn bản kết quả để người dùng tải về miễn phí.
        """
        doc = Document()
        doc.add_heading(title, level=1)
        for paragraph in text_content.split("\n\n"):
            if paragraph.strip():
                doc.add_paragraph(paragraph.strip())
        output_stream = io.BytesIO()
        doc.save(output_stream)
        output_stream.seek(0)
        return output_stream
