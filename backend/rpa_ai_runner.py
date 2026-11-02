# -*- coding: utf-8 -*-
"""
CHƯƠNG TRÌNH TỰ ĐỘNG HÓA ĐA NỀN TẢNG AI (UNIVERSAL AI RPA RUNNER)
- Hỗ trợ: ChatGPT, Claude, Google Gemini, DeepSeek, Poe, Perplexity, hoặc bất kỳ trang web AI nào
- Hoàn toàn KHÔNG cần huấn luyện mô hình máy học: Sử dụng Smart Semantic Heuristics & Multi-Adapter
- Tự động gõ mô phỏng người thật (Anti-bot bypass)
- Tự động phát hiện khi AI trả lời xong hoàn toàn và tiếp tục gõ đoạn tiếp theo
- Lưu phiên đăng nhập Chrome Profile vĩnh viễn (0 VNĐ)
"""

import os
import sys
import time
import re

# Nạp thư mục DLL cần thiết trên môi trường Windows
if os.name == "nt" and os.path.exists(r"D:\bin"):
    try:
        os.add_dll_directory(r"D:\bin")
    except Exception:
        pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.modules.ai_automation.models.ai_preset import DEFAULT_AI_PRESETS
from src.modules.ai_automation.services.rpa_chatgpt_service import RPAChatGPTService


def main():
    print("========================================================================")
    print("🤖 CHƯƠNG TRÌNH TỰ ĐỘNG GÕ ĐA NỀN TẢNG AI - UNIVERSAL AI RPA (100% FREE)")
    print("========================================================================")
    print("Hệ thống tự động thích ứng với mọi giao diện AI mà KHÔNG CẦN HUẤN LUYỆN!\n")

    # 1. Chọn nền tảng AI mục tiêu
    print("DANH SÁCH NỀN TẢNG AI HỖ TRỢ SẴN:")
    for idx, preset in enumerate(DEFAULT_AI_PRESETS, start=1):
        print(f"  [{idx}] {preset['name']} -> {preset['target_url']}")
    print("  [7] Nhập đường link AI khác bất kỳ (Tự động nhận diện Smart Heuristic)")

    choice = input("\nChọn số nền tảng (Ấn Enter để chọn [1] ChatGPT): ").strip()

    target_url = "https://chatgpt.com"
    platform_code = "chatgpt"

    if choice in ["1", ""]:
        target_url = "https://chatgpt.com"
        platform_code = "chatgpt"
    elif choice == "2":
        target_url = "https://claude.ai/new"
        platform_code = "claude"
    elif choice == "3":
        target_url = "https://gemini.google.com/app"
        platform_code = "gemini"
    elif choice == "4":
        target_url = "https://chat.deepseek.com"
        platform_code = "deepseek"
    elif choice == "5":
        target_url = "https://poe.com"
        platform_code = "poe"
    elif choice == "6":
        target_url = "https://www.perplexity.ai"
        platform_code = "perplexity"
    elif choice == "7":
        user_url = input("Dán đường link website AI mục tiêu vào đây: ").strip()
        target_url = user_url if user_url else "https://chatgpt.com"
        platform_code = "custom"
    else:
        # Nếu nhập trực tiếp URL
        if choice.startswith("http"):
            target_url = choice
            platform_code = "custom"

    # 2. Đọc nguồn văn bản (từ prompts.txt hoặc nhập trực tiếp)
    prompts_file = os.path.join(os.path.dirname(__file__), "prompts.txt")
    if not os.path.exists(prompts_file):
        root_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "prompts.txt")
        if os.path.exists(root_file):
            prompts_file = root_file
    prompts = []

    if os.path.exists(prompts_file):
        with open(prompts_file, "r", encoding="utf-8") as f:
            content = f.read().strip()
            prompts = [p.strip() for p in re.split(r"\n\s*\n+", content) if p.strip()]
        print(f"\n-> Đã đọc tự động {len(prompts)} đoạn văn bản từ tệp 'prompts.txt'.")

    if not prompts:
        print("\nKhông tìm thấy file 'prompts.txt'. Vui lòng dán văn bản vào đây (Gõ 'END' trên dòng mới để kết thúc):")
        lines = []
        while True:
            line = input()
            if line.strip() == "END":
                break
            lines.append(line)
        full_text = "\n".join(lines).strip()
        prompts = [p.strip() for p in re.split(r"\n\s*\n+", full_text) if p.strip()]

    if not prompts:
        print("Không có đoạn văn bản nào để xử lý. Chương trình kết thúc.")
        return

    # Tùy chọn đồng bộ tài khoản Google từ Chrome thật
    sync_choice = input("Đồng bộ nick Google và tài khoản AI từ Chrome thật của bạn? [Y/n] (Ấn Enter để đồng bộ): ").strip().lower()
    if sync_choice in ["", "y", "yes"]:
        RPAChatGPTService.sync_chrome_profile()

    # 3. Cài đặt số lần lặp lại hoặc thời gian chạy
    print("\n------------------------------------------------------------------------")
    print("CHẾ ĐỘ TỰ ĐỘNG LẶP LẠI:")
    print("  [1] Lặp theo số lần (Ví dụ: 3 lần, 5 lần...)")
    print("  [2] Lặp theo thời gian (Ví dụ: chạy liên tục trong 5 phút, 15 phút...)")
    print("  [3] Chạy vô hạn (Lặp liên tục không ngừng cho đến khi bạn bấm dừng)")
    print("------------------------------------------------------------------------")
    mode_input = input("Chọn chế độ (Ấn Enter để chọn [1] Lặp theo số lần): ").strip()

    loop_count = 3
    duration_minutes = 0.0

    if mode_input == "2":
        dur_input = input("Nhập số phút bạn muốn Robot chạy liên tục (Mặc định: 5 phút): ").strip()
        try:
            duration_minutes = float(dur_input) if dur_input else 5.0
        except ValueError:
            duration_minutes = 5.0
        loop_count = 999999  # Chạy lặp liên tục cho đến khi hết thời gian
        print(f"-> Đã chọn: Chạy liên tục trong {duration_minutes} phút.")
    elif mode_input == "3":
        loop_count = 999999
        duration_minutes = 0.0
        print("-> Đã chọn: Chạy vô hạn.")
    else:
        cnt_input = input("Nhập số lần lặp lại (Mặc định: 3 lần): ").strip()
        try:
            loop_count = int(cnt_input) if cnt_input else 3
        except ValueError:
            loop_count = 3
        print(f"-> Đã chọn: Lặp lại đúng {loop_count} lượt.")

    delay_input = input("Thời gian nghỉ sau mỗi lượt (Mặc định: 3.5 giây): ").strip()
    try:
        delay_sec = float(delay_input) if delay_input else 3.5
    except ValueError:
        delay_sec = 3.5

    print(f"\n-> Chuẩn bị tự động gửi {len(prompts)} đoạn văn bản vào: {target_url}")
    print(f"-> Cài đặt: {loop_count if loop_count < 999999 else 'Vô hạn'} lượt | Thời lượng: {duration_minutes if duration_minutes > 0 else 'Không giới hạn'} phút | Nghỉ: {delay_sec}s")
    print("-> Trình duyệt Chrome sẽ mở ra với toàn bộ nick Google và tài khoản AI của bạn!")
    input("\nẤn phím [ENTER] để bắt đầu chạy Robot...")

    # 4. Khởi chạy vòng lặp tự động đa nền tảng
    RPAChatGPTService.run_automation_loop(
        target_url=target_url,
        prompts=prompts,
        platform_code=platform_code,
        loop_count=loop_count,
        duration_minutes=duration_minutes,
        delay_between_prompts=delay_sec
    )

    print("\n✅ Hoàn thành toàn bộ công việc!")
    input("Ấn Enter để thoát.")


if __name__ == "__main__":
    main()
