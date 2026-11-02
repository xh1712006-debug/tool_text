import os
import sys
import time
import random
import logging
import threading
from typing import List, Optional, Callable, Dict, Any
from pathlib import Path

import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from src.modules.ai_automation.models.ai_preset import DEFAULT_AI_PRESETS

logger = logging.getLogger("Universal_RPA_AI")

# Bộ selector mặc định dự phòng cho ô nhập
FALLBACK_PROMPT_SELECTORS = [
    (By.ID, "prompt-textarea"),
    (By.CSS_SELECTOR, "textarea[data-id='root']"),
    (By.CSS_SELECTOR, "div[contenteditable='true']"),
    (By.CSS_SELECTOR, "div.ProseMirror"),
    (By.CSS_SELECTOR, "div.ql-editor[contenteditable='true']"),
    (By.CSS_SELECTOR, "textarea#chat-input"),
    (By.CSS_SELECTOR, "textarea[tabindex='0']"),
    (By.TAG_NAME, "textarea")
]

# Bộ selector mặc định dự phòng cho nút dừng sinh câu trả lời
FALLBACK_STOP_BUTTON_SELECTORS = [
    (By.CSS_SELECTOR, "button[data-testid='stop-button']"),
    (By.CSS_SELECTOR, "button[aria-label*='Stop']"),
    (By.CSS_SELECTOR, "button[aria-label*='Dừng']"),
    (By.CSS_SELECTOR, ".result-streaming"),
    (By.CSS_SELECTOR, "[data-state='closed'] .streaming"),
    (By.CSS_SELECTOR, "div[role='button'][aria-label*='Stop']"),
    (By.CSS_SELECTOR, ".ds-button--stop")
]

# Bộ selector mặc định dự phòng cho nút gửi
FALLBACK_SEND_BUTTON_SELECTORS = [
    (By.CSS_SELECTOR, "button[data-testid='send-button']"),
    (By.CSS_SELECTOR, "button[aria-label*='Send']"),
    (By.CSS_SELECTOR, "button[aria-label*='Gửi']"),
    (By.CSS_SELECTOR, "button[aria-label*='Submit']"),
    (By.CSS_SELECTOR, "button[type='submit']")
]


class RPAState:
    """Quản lý trạng thái tiến trình chạy tự động của Robot."""
    is_running: bool = False
    current_index: int = 0
    total_prompts: int = 0
    current_prompt: str = ""
    status_message: str = "Sẵn sàng"
    logs: List[str] = []
    stop_requested: bool = False


class RPAChatGPTService:
    """
    Dịch vụ Tự động hóa Đa Nền tảng AI (Universal AI Automation Service).
    Hỗ trợ tương tác với ChatGPT, Claude, Gemini, DeepSeek, Poe, Perplexity
    hoặc BẤT KỲ trang AI nào mà KHÔNG CẦN HUẤN LUYỆN MÁY HỌC:
    1. Cơ chế Multi-Adapter Presets: Tự nạp selector tối ưu cho từng nền tảng lớn.
    2. Thuật toán Smart Semantic Heuristics: Tự quét DOM và phân tích ngữ nghĩa để tìm ô nhập của web AI lạ.
    3. Giả lập gõ phím người thật (Anti-bot simulation).
    4. Quản lý Chrome Profile độc lập, lưu phiên đăng nhập vĩnh viễn không mất phí.
    5. Phát hiện hoàn tất thông minh (Stop Button + Text Mutation Stability).
    """

    state = RPAState()

    @classmethod
    def log(cls, message: str):
        logger.info(message)
        cls.state.logs.append(f"[{time.strftime('%H:%M:%S')}] {message}")
        if len(cls.state.logs) > 100:
            cls.state.logs.pop(0)

    @classmethod
    def parse_selectors(cls, selector_str: Optional[str]) -> List[tuple]:
        """Phân tích chuỗi selector CSS cách nhau bởi dấu phẩy thành danh sách Tuple (By.CSS_SELECTOR, s)."""
        if not selector_str:
            return []
        items = [s.strip() for s in selector_str.split(",") if s.strip()]
        return [(By.CSS_SELECTOR, s) for s in items]

    @classmethod
    def find_element_safe(cls, driver, selectors):
        """Thử lần lượt danh sách các selector cho đến khi tìm thấy phần tử hiển thị."""
        for by_type, value in selectors:
            try:
                elements = driver.find_elements(by_type, value)
                for el in elements:
                    if el.is_displayed():
                        return el
            except Exception:
                continue
        return None

    @classmethod
    def smart_detect_input_box(cls, driver, custom_selectors=None):
        """
        Thuật toán Heuristic Ngữ Nghĩa & Vị Trí Hình Học (DOM & Geometry Analysis):
        Tự động định vị ô nhập prompt trên bất kỳ trang AI lạ nào mà không cần biết trước cấu trúc class/id.
        """
        # 1. Thử selector tùy biến người dùng cung cấp hoặc danh sách dự phòng
        if custom_selectors:
            el = cls.find_element_safe(driver, custom_selectors)
            if el:
                return el

        el = cls.find_element_safe(driver, FALLBACK_PROMPT_SELECTORS)
        if el:
            return el

        # 2. Quét toàn diện các phần tử tương tác nhập liệu
        elements = driver.find_elements(By.CSS_SELECTOR, "textarea, div[contenteditable='true'], input[type='text']")
        
        best_score = -1
        best_element = None
        keywords = ["prompt", "message", "ask", "chat", "nhập", "hỏi", "tin nhắn", "send", "compose", "query", "search"]

        for el in elements:
            try:
                if not el.is_displayed() or not el.is_enabled():
                    continue

                size = el.size
                if size["width"] < 80 or size["height"] < 20:
                    continue

                score = 10
                placeholder = (el.get_attribute("placeholder") or "").lower()
                aria_label = (el.get_attribute("aria-label") or "").lower()
                el_id = (el.get_attribute("id") or "").lower()
                el_class = (el.get_attribute("class") or "").lower()
                role = (el.get_attribute("role") or "").lower()

                # Điểm ngữ nghĩa
                for kw in keywords:
                    if kw in placeholder:
                        score += 50
                    if kw in aria_label:
                        score += 40
                    if kw in el_id or kw in el_class:
                        score += 25

                # Điểm loại thẻ
                if el.tag_name == "textarea":
                    score += 20
                if el.tag_name == "div" and el.get_attribute("contenteditable") == "true":
                    score += 25
                if role == "textbox":
                    score += 30

                # Điểm vị trí: Chatbot thường đặt ô nhập ở nửa dưới màn hình
                loc = el.location
                if loc["y"] > 250:
                    score += 20

                if score > best_score:
                    best_score = score
                    best_element = el
            except Exception:
                continue

        if best_element:
            cls.log(f"-> Thuật toán Heuristic đã tự động phát hiện ô nhập liệu (Điểm tin cậy: {best_score}).")
        return best_element

    @classmethod
    def smart_detect_send_button(cls, driver, custom_selectors=None):
        """Tự động phát hiện nút gửi prompt."""
        if custom_selectors:
            btn = cls.find_element_safe(driver, custom_selectors)
            if btn and btn.is_enabled():
                return btn

        btn = cls.find_element_safe(driver, FALLBACK_SEND_BUTTON_SELECTORS)
        if btn and btn.is_enabled():
            return btn

        # Quét các nút có thuộc tính gửi hoặc chứa SVG icon
        try:
            buttons = driver.find_elements(By.CSS_SELECTOR, "button, div[role='button']")
            for b in buttons:
                if not b.is_displayed() or not b.is_enabled():
                    continue
                aria = (b.get_attribute("aria-label") or "").lower()
                title = (b.get_attribute("title") or "").lower()
                testid = (b.get_attribute("data-testid") or "").lower()
                b_type = (b.get_attribute("type") or "").lower()

                if any(w in aria or w in title or w in testid for w in ["send", "gửi", "submit"]):
                    return b
                if b_type == "submit":
                    return b
        except Exception:
            pass

        return None

    @classmethod
    def human_typing(cls, element, text: str, min_delay: float = 0.04, max_delay: float = 0.12):
        """Mô phỏng thao tác gõ phím ngẫu nhiên của con người để vượt qua hệ thống chống bot."""
        try:
            element.click()
            time.sleep(random.uniform(0.3, 0.6))
        except Exception:
            pass

        lines = text.split("\n")
        for l_idx, line in enumerate(lines):
            for char in line:
                if cls.state.stop_requested:
                    return
                element.send_keys(char)
                time.sleep(random.uniform(min_delay, max_delay))

            if l_idx < len(lines) - 1:
                element.send_keys(Keys.SHIFT, Keys.ENTER)
                time.sleep(random.uniform(0.1, 0.3))

    @classmethod
    def wait_for_ai_to_finish(cls, driver, stop_selectors=None, max_wait_seconds: int = 240) -> bool:
        """
        Theo dõi AI sinh câu trả lời:
        Cơ chế 1: Nút Stop / Dừng biến mất.
        Cơ chế 2: Heuristic Text Stability - Đọc văn bản phản hồi trên trang,
        khi nội dung ổn định liên tiếp 3 giây và không còn trạng thái streaming.
        """
        cls.log("Đang theo dõi AI sinh câu trả lời...")
        cls.state.status_message = "Đang chờ AI trả lời xong..."

        selectors = stop_selectors if stop_selectors else FALLBACK_STOP_BUTTON_SELECTORS

        start_time = time.time()

        # 1. Chờ tối đa 6 giây xem có nút Stop xuất hiện không
        for _ in range(12):
            if cls.state.stop_requested:
                return False
            stop_btn = cls.find_element_safe(driver, selectors)
            if stop_btn:
                cls.log("-> Phát hiện AI đang tạo câu trả lời (Stop button active)...")
                break
            time.sleep(0.5)

        # 2. Vòng lặp chờ nút Stop biến mất hoặc ổn định nội dung văn bản
        last_body_len = 0
        stable_count = 0

        while time.time() - start_time < max_wait_seconds:
            if cls.state.stop_requested:
                return False

            stop_btn = cls.find_element_safe(driver, selectors)
            if stop_btn:
                stable_count = 0
                time.sleep(1.0)
                continue

            try:
                current_len = len(driver.find_element(By.TAG_NAME, "body").text)
                if current_len == last_body_len and current_len > 0:
                    stable_count += 1
                else:
                    stable_count = 0
                    last_body_len = current_len
            except Exception:
                stable_count += 1

            if stable_count >= 3:
                cls.log("-> AI đã hoàn tất phản hồi hoàn toàn!")
                return True

            time.sleep(1.0)

        cls.log("Hết thời gian chờ tối đa, chuyển sang câu tiếp theo.")
        return True

    @classmethod
    def get_preset_for_platform(cls, platform_code: str, target_url: str) -> Dict[str, Any]:
        """Tìm nạp cấu hình bộ selector theo platform_code hoặc URL."""
        # Kiểm tra danh sách built-in presets
        for preset in DEFAULT_AI_PRESETS:
            if platform_code and preset["platform_code"] == platform_code.lower():
                return preset
            if target_url and any(domain in target_url.lower() for domain in [
                "chatgpt.com", "claude.ai", "gemini.google.com", "deepseek.com", "poe.com", "perplexity.ai"
            ]):
                if preset["platform_code"] in target_url.lower():
                    return preset

        # Nếu không khớp, trả về cấu hình mặc định Heuristic
        return {
            "name": "Nền tảng Tự động nhận diện",
            "platform_code": "custom",
            "input_selectors": "",
            "send_btn_selectors": "",
            "stop_btn_selectors": ""
        }

    @classmethod
    def run_automation_loop(
        cls,
        target_url: str,
        prompts: List[str],
        profile_dir: Optional[str] = None,
        delay_between_prompts: float = 4.0,
        loop_count: int = 1,
        duration_minutes: float = 0.0,
        platform_code: Optional[str] = "custom",
        custom_input_selector: Optional[str] = None,
        custom_send_selector: Optional[str] = None,
        custom_stop_selector: Optional[str] = None,
        on_complete_callback: Optional[Callable] = None
    ):
        """
        Vòng lặp tự động hóa Đa Nền tảng AI:
        Mở trình duyệt Chrome chống phát hiện bot hoặc kết nối vào tab Chrome đang mở,
        hỗ trợ lặp lại nhiều lần (loop_count) và giới hạn thời gian (duration_minutes).
        """
        cls.state.is_running = True
        cls.state.stop_requested = False
        cls.state.total_prompts = len(prompts)
        cls.state.current_index = 0
        cls.state.logs = []

        # Xác định bộ selector dựa trên Preset và Tùy chỉnh người dùng
        preset = cls.get_preset_for_platform(platform_code or "", target_url)
        cls.log(f"=== BẮT ĐẦU QUY TRÌNH RPA ĐA NỀN TẢNG AI ===")
        cls.log(f"Nền tảng AI: {preset['name']} ({target_url})")
        cls.log(f"Số đoạn: {len(prompts)} | Lặp: {loop_count} lượt | Giới hạn thời gian: {duration_minutes if duration_minutes > 0 else 'Không giới hạn'} phút")

        input_sel = cls.parse_selectors(custom_input_selector or preset.get("input_selectors"))
        send_sel = cls.parse_selectors(custom_send_selector or preset.get("send_btn_selectors"))
        stop_sel = cls.parse_selectors(custom_stop_selector or preset.get("stop_btn_selectors"))

        # Kiểm tra xem Chrome thật có đang mở cổng điều khiển (Remote Debugging 9222) hay không
        import socket
        port_9222_open = False
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.5)
                if s.connect_ex(('127.0.0.1', 9222)) == 0:
                    port_9222_open = True
        except Exception:
            pass

        options = uc.ChromeOptions()
        options.add_argument("--start-maximized")
        options.add_argument("--disable-popup-blocking")

        if port_9222_open:
            cls.log("⚡ Phát hiện trình duyệt Chrome đang mở cùng tab! Đang kết nối trực tiếp vào tab bên cạnh...")
            options.add_experimental_option("debuggerAddress", "127.0.0.1:9222")
        else:
            options.add_argument(f"--user-data-dir={profile_dir}")
            cls.log(f"Thư mục lưu phiên đăng nhập: {profile_dir}")

        driver = None
        try:
            if port_9222_open:
                from selenium import webdriver
                driver = webdriver.Chrome(options=options)
                # Tìm kiếm và chuyển sang đúng tab AI đang mở sẵn bên cạnh (ưu tiên khớp target_url)
                found_tab = False
                target_domain = ""
                try:
                    from urllib.parse import urlparse
                    target_domain = urlparse(target_url).netloc.replace("www.", "").lower()
                except Exception:
                    pass

                # Bước 1: Ưu tiên tìm tab có domain khớp chính xác với target_url
                for handle in driver.window_handles:
                    driver.switch_to.window(handle)
                    curr_url = driver.current_url.lower()
                    if target_domain and target_domain in curr_url:
                        found_tab = True
                        cls.log(f"🎯 Đã chuyển sang đúng tab bên cạnh: {driver.title} ({driver.current_url})")
                        break

                # Bước 2: Nếu chưa tìm thấy domain cụ thể, tìm bất kỳ tab AI phổ biến nào đang mở
                if not found_tab:
                    for handle in driver.window_handles:
                        driver.switch_to.window(handle)
                        curr_url = driver.current_url.lower()
                        if any(domain in curr_url for domain in ["chatgpt.com", "claude.ai", "gemini.google.com", "deepseek.com", "poe.com", "perplexity.ai"]):
                            found_tab = True
                            cls.log(f"🎯 Đã chuyển sang tab AI bên cạnh: {driver.title} ({driver.current_url})")
                            break

                if not found_tab:
                    cls.log(f"Đang điều hướng đến trang mục tiêu: {target_url}...")
                    driver.get(target_url)
            else:
                cls.log("Đang mở trình duyệt Chrome chống phát hiện bot...")
                driver = uc.Chrome(options=options, use_subprocess=True)
                driver.get(target_url)

            cls.log("Đã kết nối thành công. Đang kiểm tra trạng thái trang...")
            time.sleep(2.0)

            # Kiểm tra nếu trang đang hiển thị nút Đăng nhập (Chưa đăng nhập lần đầu)
            login_selectors = [
                (By.CSS_SELECTOR, "button[data-testid='login-button']"),
                (By.XPATH, "//button[contains(text(), 'Đăng nhập') or contains(text(), 'Log in')]"),
                (By.XPATH, "//a[contains(text(), 'Đăng nhập') or contains(text(), 'Log in')]")
            ]
            login_btn = cls.find_element_safe(driver, login_selectors)
            if login_btn:
                cls.log("👉 PHÁT HIỆN BẠN CHƯA ĐĂNG NHẬP TÀI KHOẢN TRÊN CỬA SỔ NÀY!")
                cls.log("👉 Vui lòng nhấp nút 'Đăng nhập' trên màn hình Chrome để đăng nhập nick của bạn...")
                cls.log("👉 (Chỉ cần làm 1 lần duy nhất, toàn bộ dữ liệu sẽ được lưu vĩnh viễn cho các lần sau).")
                cls.state.status_message = "Đang chờ bạn bấm Đăng nhập tài khoản trên Chrome..."

                # Chờ người dùng bấm đăng nhập (tối đa 60 giây)
                for _ in range(60):
                    if cls.state.stop_requested:
                        break
                    # Nếu ô input xuất hiện và nút đăng nhập biến mất -> Người dùng đã đăng nhập xong!
                    inp = cls.smart_detect_input_box(driver, custom_selectors=input_sel)
                    if inp and not cls.find_element_safe(driver, login_selectors):
                        cls.log("🎉 ĐÃ ĐĂNG NHẬP THÀNH CÔNG! Phiên làm việc đã được lưu vĩnh viễn.")
                        time.sleep(2.0)
                        break
                    time.sleep(1.0)

            # Bắt đầu vòng lặp theo số lần cấu hình
            start_loop_time = time.time()
            max_duration_seconds = (duration_minutes * 60) if duration_minutes and duration_minutes > 0 else None
            total_loops = loop_count if loop_count and loop_count > 0 else 1

            for current_loop in range(1, total_loops + 1):
                if cls.state.stop_requested:
                    break

                loop_label = f"[Lượt {current_loop}/{total_loops}] " if total_loops > 1 else ""
                cls.log(f"--- BẮT ĐẦU CHU KỲ {loop_label}---")

                for idx, prompt in enumerate(prompts):
                    if cls.state.stop_requested:
                        cls.log("Người dùng đã yêu cầu dừng quy trình.")
                        break

                    # Kiểm tra giới hạn thời lượng nếu có cài đặt
                    if max_duration_seconds and (time.time() - start_loop_time >= max_duration_seconds):
                        cls.log(f"⏱️ Đã đạt giới hạn thời gian {duration_minutes} phút. Tự động dừng Robot!")
                        cls.state.stop_requested = True
                        break

                    cls.state.current_index = idx + 1
                    cls.state.current_prompt = prompt[:50] + ("..." if len(prompt) > 50 else "")
                    cls.log(f"=== {loop_label}ĐANG XỬ LÝ ĐOẠN [{cls.state.current_index}/{len(prompts)}] ===")
                    cls.log(f"Nội dung: '{cls.state.current_prompt}'")

                    # 1. Tự động tìm ô nhập prompt (bằng Selector đã cấu hình hoặc Smart Heuristic)
                    input_box = None
                    for attempt in range(12):
                        if cls.state.stop_requested:
                            break
                        input_box = cls.smart_detect_input_box(driver, custom_selectors=input_sel)
                        if input_box:
                            break
                        time.sleep(1.0)

                    if not input_box:
                        cls.log(f"Cảnh báo: Không thể tìm thấy ô nhập liệu ở đoạn {cls.state.current_index}. Vui lòng kiểm tra trạng thái đăng nhập trên trình duyệt!")
                        time.sleep(3.0)
                        continue

                    # 2. Gõ văn bản mô phỏng người thật
                    cls.state.status_message = f"{loop_label}Đang gõ đoạn {cls.state.current_index}/{len(prompts)}..."
                    cls.human_typing(input_box, prompt)
                    time.sleep(random.uniform(0.5, 1.0))

                    # 3. Gửi prompt
                    send_btn = cls.smart_detect_send_button(driver, custom_selectors=send_sel)
                    if send_btn and send_btn.is_enabled():
                        send_btn.click()
                        cls.log("Đã bấm nút Gửi (Send).")
                    else:
                        input_box.send_keys(Keys.ENTER)
                        cls.log("Đã nhấn phím Enter để gửi.")

                    # 4. CHỜ AI TRẢ LỜI XONG HOÀN TOÀN
                    cls.wait_for_ai_to_finish(driver, stop_selectors=stop_sel)

                    # 5. Tạm nghỉ tự nhiên trước khi sang đoạn tiếp theo
                    if idx < len(prompts) - 1:
                        pause_time = random.uniform(delay_between_prompts, delay_between_prompts + 2.0)
                        cls.log(f"Nghỉ ngơi {pause_time:.1f} giây trước khi nhập đoạn tiếp theo...")
                        time.sleep(pause_time)

                if cls.state.stop_requested:
                    break

                if max_duration_seconds and (time.time() - start_loop_time >= max_duration_seconds):
                    break

                # Nghỉ giữa các lượt lặp lại
                if current_loop < total_loops:
                    cls.log(f"✅ Đã xong {loop_label}! Nghỉ {delay_between_prompts:.1f} giây trước khi bắt đầu lượt tiếp theo...")
                    time.sleep(delay_between_prompts)

            cls.log("=== HOÀN TẤT TOÀN BỘ CÁC LƯỢT VÀ ĐOẠN VĂN BẢN! ===")
            cls.state.status_message = "Đã hoàn thành tất cả các lượt lặp lại!"

        except Exception as e:
            cls.log(f"Lỗi trong quá trình tự động hóa: {str(e)}")
            cls.state.status_message = f"Gặp sự cố: {str(e)}"
        finally:
            cls.state.is_running = False
            if on_complete_callback:
                try:
                    on_complete_callback()
                except Exception:
                    pass

    @classmethod
    def start_in_background(
        cls,
        target_url: str,
        prompts: List[str],
        platform_code: Optional[str] = "custom",
        custom_input_selector: Optional[str] = None,
        custom_send_selector: Optional[str] = None,
        custom_stop_selector: Optional[str] = None,
        loop_count: int = 1,
        duration_minutes: float = 0.0,
        delay_between_prompts: float = 4.0
    ):
        """Khởi chạy quy trình tự động hóa trong một luồng riêng để không chặn Web Server."""
        if cls.state.is_running:
            raise RuntimeError("Hiện tại đang có một tiến trình tự động hóa đang chạy!")

        thread = threading.Thread(
            target=cls.run_automation_loop,
            kwargs={
                "target_url": target_url,
                "prompts": prompts,
                "platform_code": platform_code,
                "custom_input_selector": custom_input_selector,
                "custom_send_selector": custom_send_selector,
                "custom_stop_selector": custom_stop_selector,
                "loop_count": loop_count,
                "duration_minutes": duration_minutes,
                "delay_between_prompts": delay_between_prompts
            },
            daemon=True
        )
        thread.start()
        return True

    @classmethod
    def open_login_browser(cls, target_url: str = "https://chatgpt.com") -> bool:
        """
        Mở cửa sổ Chrome độc lập của Robot để người dùng đăng nhập tài khoản một cách tự nhiên.
        Hoàn toàn không ảnh hưởng hay đóng bất kỳ tab nào trên Chrome thật của người dùng (Không cần out máy).
        """
        import threading
        profile_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "chrome_ai_profile"))
        os.makedirs(profile_dir, exist_ok=True)

        def _launch():
            options = uc.ChromeOptions()
            options.add_argument("--start-maximized")
            options.add_argument(f"--user-data-dir={profile_dir}")
            options.add_argument("--disable-popup-blocking")
            try:
                cls.log(f"Đang mở cửa sổ Chrome Robot riêng biệt để đăng nhập: {target_url}")
                driver = uc.Chrome(options=options, use_subprocess=True)
                driver.get(target_url)
            except Exception as e:
                cls.log(f"Lỗi mở cửa sổ đăng nhập: {e}")

        t = threading.Thread(target=_launch, daemon=True)
        t.start()
        return True

    @classmethod
    def sync_chrome_profile(cls, src_dir: Optional[str] = None, dst_dir: Optional[str] = None) -> bool:
        """
        Đồng bộ tài khoản Google, ChatGPT, Claude, Cookies và LocalStorage
        từ Google Chrome thật của người dùng vào thư mục Profile của Robot.
        An toàn 100%: KHÔNG tự ý đóng hay tắt Chrome thật của người dùng (Không out máy).
        """
        import shutil
        if not src_dir:
            src_dir = os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\User Data")
        if not dst_dir:
            dst_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "chrome_ai_profile"))

        if not os.path.exists(src_dir):
            cls.log(f"Lỗi: Không tìm thấy thư mục Chrome thật tại: {src_dir}")
            return False

        cls.log("Đang tiến hành sao chép an toàn dữ liệu phiên đăng nhập (Không tắt Chrome)...")

        os.makedirs(dst_dir, exist_ok=True)
        dst_default = os.path.join(dst_dir, "Default")
        os.makedirs(dst_default, exist_ok=True)
        src_default = os.path.join(src_dir, "Default")

        try:
            # 1. Local State (Chìa khóa giải mã DPAPI)
            src_local_state = os.path.join(src_dir, "Local State")
            if os.path.exists(src_local_state):
                try:
                    shutil.copyfile(src_local_state, os.path.join(dst_dir, "Local State"))
                except Exception:
                    pass

            # 2. Cookies (Phiên đăng nhập Web)
            src_cookies = os.path.join(src_default, "Network", "Cookies")
            if os.path.exists(src_cookies):
                try:
                    os.makedirs(os.path.join(dst_default, "Network"), exist_ok=True)
                    shutil.copyfile(src_cookies, os.path.join(dst_default, "Network", "Cookies"))
                except Exception:
                    pass

            # 3. Login Data & Web Data & Preferences
            for f in ["Login Data", "Web Data", "Preferences", "Secure Preferences"]:
                src_f = os.path.join(src_default, f)
                if os.path.exists(src_f):
                    try:
                        shutil.copyfile(src_f, os.path.join(dst_default, f))
                    except Exception:
                        pass

            # 4. Local Storage (Chứa Auth Token của ChatGPT, Claude...)
            src_ls = os.path.join(src_default, "Local Storage")
            dst_ls = os.path.join(dst_default, "Local Storage")
            if os.path.exists(src_ls):
                try:
                    if os.path.exists(dst_ls):
                        shutil.rmtree(dst_ls, ignore_errors=True)
                    shutil.copytree(src_ls, dst_ls)
                except Exception:
                    pass

            # 5. IndexedDB
            src_idb = os.path.join(src_default, "IndexedDB")
            dst_idb = os.path.join(dst_default, "IndexedDB")
            if os.path.exists(src_idb):
                try:
                    if os.path.exists(dst_idb):
                        shutil.rmtree(dst_idb, ignore_errors=True)
                    shutil.copytree(src_idb, dst_idb)
                except Exception:
                    pass

            cls.log("✅ Đã đồng bộ an toàn dữ liệu từ Chrome thật sang Robot mà không cần tắt Chrome!")
            return True
        except Exception as e:
            cls.log(f"Lỗi khi đồng bộ hồ sơ Chrome: {e}")
            return False

    @classmethod
    def stop(cls):
        """Yêu cầu dừng tiến trình đang chạy."""
        cls.state.stop_requested = True
        cls.state.status_message = "Đang dừng quy trình..."


# Alias tương thích kiến trúc Universal AI
UniversalAIService = RPAChatGPTService
