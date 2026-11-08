import asyncio
import base64
import os
import re
import time
import logging
from typing import Dict, Any, List, Optional
import httpx

logger = logging.getLogger("AIStudioService")

# Đường dẫn lưu trữ media mặc định
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DOWNLOADS_DIR = os.path.join(BACKEND_DIR, "downloads")
os.makedirs(DOWNLOADS_DIR, exist_ok=True)


class AIStudioService:
    """
    Dịch vụ quản trị AI Studio nội bộ:
    Kết nối trực tiếp với Cloud GPU Worker (Colab / RunPod / Server) để sinh ảnh và video
    tự động từ danh sách prompt mà không cần ra trang ngoài hoặc mở trình duyệt Chrome.
    """

    # Trạng thái tiến trình Batch toàn cục
    _batch_state: Dict[str, Any] = {
        "is_running": False,
        "stop_requested": False,
        "current_index": 0,
        "total_prompts": 0,
        "folder_name": "prompts_video",
        "current_prompt": "",
        "current_step": "idle",  # 'idle', 'generating_image', 'generating_video', 'completed', 'error'
        "current_image_url": "",
        "current_video_url": "",
        "logs": [],
        "completed_items": [],
        "started_at": 0,
        "error_message": None
    }
    _batch_task: Optional[asyncio.Task] = None

    @classmethod
    def _sanitize_folder(cls, folder_name: str) -> str:
        safe = re.sub(r'[\\/*?:"<>|]', "", folder_name or "prompts_video").strip()
        return safe if safe else "prompts_video"

    @classmethod
    async def test_connection(cls, worker_url: str) -> Dict[str, Any]:
        """Kiểm tra kết nối và cấu hình GPU của Cloud Worker."""
        clean_url = worker_url.strip().rstrip("/")
        if not clean_url:
            return {"connected": False, "message": "Vui lòng nhập đường dẫn Cloud GPU Worker (ví dụ: https://xxx.trycloudflare.com)"}

        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                # Kiểm tra endpoint /health hoặc /info
                res = None
                try:
                    res = await client.get(f"{clean_url}/health")
                except Exception:
                    try:
                        res = await client.get(f"{clean_url}/info")
                    except Exception:
                        res = await client.get(clean_url)

                if res and res.status_code in [200, 201]:
                    try:
                        data = res.json()
                    except Exception:
                        data = {"raw": res.text[:200]}

                    gpu_name = data.get("gpu", data.get("device", "Cloud GPU T4 / A100"))
                    models = data.get("models", ["SDXL-Lightning", "SVD-Video", "FLUX-Schnell", "Muse-Glimmer"])
                    return {
                        "connected": True,
                        "worker_url": clean_url,
                        "gpu": gpu_name,
                        "models": models,
                        "status": "ready",
                        "message": f"Kết nối Cloud GPU thành công! Phần cứng: {gpu_name}"
                    }
                else:
                    return {
                        "connected": False,
                        "worker_url": clean_url,
                        "message": f"Cloud Worker phản hồi mã lỗi {res.status_code if res else 'Unknown'}."
                    }
        except Exception as e:
            logger.warning(f"Lỗi kiểm tra worker {clean_url}: {e}")
            return {
                "connected": False,
                "worker_url": clean_url,
                "message": f"Không thể kết nối đến Cloud GPU Worker: {str(e)}. Hãy đảm bảo Colab/Worker đang chạy."
            }

    @classmethod
    async def generate_single_image(
        cls,
        worker_url: str,
        prompt: str,
        aspect_ratio: str = "16:9",
        steps: int = 4,
        negative_prompt: str = ""
    ) -> Dict[str, Any]:
        """Gửi yêu cầu tạo ảnh đơn lẻ đến Cloud Worker."""
        clean_url = worker_url.strip().rstrip("/")
        async with httpx.AsyncClient(timeout=180.0, follow_redirects=True) as client:
            payload = {
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                "aspect_ratio": aspect_ratio,
                "steps": steps
            }
            res = await client.post(f"{clean_url}/api/generate-image", json=payload)
            if res.status_code != 200:
                raise Exception(f"Worker trả về lỗi {res.status_code}: {res.text[:200]}")
            return res.json()

    @classmethod
    async def generate_single_video(
        cls,
        worker_url: str,
        image_base64: str,
        prompt: str = "",
        num_frames: int = 25,
        fps: int = 8
    ) -> Dict[str, Any]:
        """Gửi ảnh để tạo video chuyển động MP4."""
        clean_url = worker_url.strip().rstrip("/")
        async with httpx.AsyncClient(timeout=300.0, follow_redirects=True) as client:
            payload = {
                "image_base64": image_base64,
                "prompt": prompt,
                "num_frames": num_frames,
                "fps": fps
            }
            res = await client.post(f"{clean_url}/api/generate-video", json=payload)
            if res.status_code != 200:
                raise Exception(f"Worker trả về lỗi {res.status_code}: {res.text[:200]}")
            return res.json()

    @classmethod
    def save_base64_file(cls, base64_str: str, target_path: str) -> None:
        """Giải mã chuỗi base64 và lưu trực tiếp ra file trên máy tính."""
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        # Bỏ header data URI nếu có (data:image/png;base64,...)
        if "," in base64_str:
            base64_str = base64_str.split(",", 1)[1]
        raw_bytes = base64.b64decode(base64_str)
        with open(target_path, "wb") as f:
            f.write(raw_bytes)

    @classmethod
    def start_batch(
        cls,
        worker_url: str,
        prompts: List[str],
        folder_name: str = "prompts_video",
        generate_video: bool = True,
        aspect_ratio: str = "16:9"
    ) -> Dict[str, Any]:
        """Bắt đầu tiến trình tạo hàng loạt ảnh và video ngầm."""
        if cls._batch_state["is_running"]:
            return {
                "started": False,
                "message": "Đang có một tiến trình tạo ảnh/video đang chạy. Vui lòng đợi hoặc bấm dừng trước!"
            }

        safe_folder = cls._sanitize_folder(folder_name)
        target_dir = os.path.join(DOWNLOADS_DIR, safe_folder)
        os.makedirs(target_dir, exist_ok=True)

        cls._batch_state = {
            "is_running": True,
            "stop_requested": False,
            "current_index": 0,
            "total_prompts": len(prompts),
            "folder_name": safe_folder,
            "current_prompt": "",
            "current_step": "starting",
            "current_image_url": "",
            "current_video_url": "",
            "logs": [f"[{time.strftime('%H:%M:%S')}] 🚀 Bắt đầu tiến trình AI Studio cho {len(prompts)} đoạn prompt..."],
            "completed_items": [],
            "started_at": time.time(),
            "error_message": None
        }

        # Khởi chạy coroutine nền
        cls._batch_task = asyncio.create_task(
            cls._run_batch_worker(
                worker_url=worker_url.strip().rstrip("/"),
                prompts=prompts,
                folder_name=safe_folder,
                generate_video=generate_video,
                aspect_ratio=aspect_ratio
            )
        )

        return {
            "started": True,
            "total_prompts": len(prompts),
            "folder_name": safe_folder,
            "message": f"Đã bắt đầu tạo hàng loạt {len(prompts)} đoạn văn bản nội bộ!"
        }

    @classmethod
    async def _run_batch_worker(
        cls,
        worker_url: str,
        prompts: List[str],
        folder_name: str,
        generate_video: bool,
        aspect_ratio: str
    ):
        """Hàm chạy nền xử lý tuần tự từng đoạn văn bản."""
        target_dir = os.path.join(DOWNLOADS_DIR, folder_name)

        try:
            for idx, prompt_text in enumerate(prompts):
                if cls._batch_state["stop_requested"]:
                    cls._log(f"🛑 Người dùng đã bấm dừng tiến trình.")
                    break

                batch_num = idx + 1
                cls._batch_state["current_index"] = batch_num
                cls._batch_state["current_prompt"] = prompt_text
                prefix_log = f"[Đoạn {batch_num}/{len(prompts)}]"

                # BƯỚC 1: TẠO HÌNH ẢNH (TEXT-TO-IMAGE)
                cls._batch_state["current_step"] = "generating_image"
                cls._log(f"🎨 {prefix_log} Đang gửi prompt lên Cloud GPU vẽ hình ảnh 8K...")

                img_filename = f"image{batch_num}.png"
                img_path = os.path.join(target_dir, img_filename)
                img_base64 = None

                try:
                    img_res = await cls.generate_single_image(
                        worker_url=worker_url,
                        prompt=prompt_text,
                        aspect_ratio=aspect_ratio
                    )
                    img_base64 = img_res.get("image_base64") or img_res.get("image")
                    if img_base64:
                        cls.save_base64_file(img_base64, img_path)
                        img_url = f"/downloads/{folder_name}/{img_filename}?t={int(time.time())}"
                        cls._batch_state["current_image_url"] = img_url
                        cls._log(f"✅ {prefix_log} Đã vẽ xong hình ảnh: {img_filename}")
                    else:
                        cls._log(f"⚠️ {prefix_log} Không nhận được dữ liệu ảnh từ Cloud Worker.")
                except Exception as img_err:
                    cls._log(f"❌ {prefix_log} Lỗi tạo ảnh: {str(img_err)}")
                    continue

                if cls._batch_state["stop_requested"]:
                    break

                # BƯỚC 2: TẠO VIDEO TỪ ẢNH (IMAGE-TO-VIDEO) NẾU ĐƯỢC BẬT
                video_url = ""
                if generate_video and img_base64:
                    cls._batch_state["current_step"] = "generating_video"
                    video_filename = f"video{batch_num}.mp4"
                    video_path = os.path.join(target_dir, video_filename)
                    cls._log(f"🎬 {prefix_log} Đang chuyển đổi hình ảnh thành video chuyển động MP4...")

                    try:
                        vid_res = await cls.generate_single_video(
                            worker_url=worker_url,
                            image_base64=img_base64,
                            prompt=prompt_text
                        )
                        vid_base64 = vid_res.get("video_base64") or vid_res.get("video")
                        if vid_base64:
                            cls.save_base64_file(vid_base64, video_path)
                            video_url = f"/downloads/{folder_name}/{video_filename}?t={int(time.time())}"
                            cls._batch_state["current_video_url"] = video_url
                            cls._log(f"🎉 {prefix_log} Đã tạo xong video chất lượng cao: {video_filename}")
                        else:
                            cls._log(f"⚠️ {prefix_log} Không nhận được dữ liệu video từ Cloud Worker.")
                    except Exception as vid_err:
                        cls._log(f"❌ {prefix_log} Lỗi tạo video: {str(vid_err)}")

                # Ghi nhận mục hoàn thành
                cls._batch_state["completed_items"].append({
                    "index": batch_num,
                    "prompt": prompt_text,
                    "image_url": f"/downloads/{folder_name}/{img_filename}",
                    "video_url": video_url if video_url else None,
                    "created_at": time.strftime("%H:%M:%S")
                })

                # Nghỉ ngắn giữa các lượt
                await asyncio.sleep(1)

            cls._batch_state["current_step"] = "completed"
            cls._log(f"🏆 Đã hoàn thành toàn bộ {len(cls._batch_state['completed_items'])}/{len(prompts)} đoạn văn bản! Lưu tại thư mục: {folder_name}")

        except Exception as e:
            logger.error(f"Lỗi toàn cục trong batch worker: {e}", exc_info=True)
            cls._batch_state["error_message"] = str(e)
            cls._batch_state["current_step"] = "error"
            cls._log(f"💥 Lỗi tiến trình: {str(e)}")
        finally:
            cls._batch_state["is_running"] = False

    @classmethod
    def _log(cls, msg: str):
        timestamp = time.strftime("%H:%M:%S")
        entry = f"[{timestamp}] {msg}"
        cls._batch_state["logs"].append(entry)
        if len(cls._batch_state["logs"]) > 200:
            cls._batch_state["logs"].pop(0)
        logger.info(entry)

    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        """Lấy trạng thái tiến trình thời gian thực."""
        return cls._batch_state

    @classmethod
    def stop_batch(cls) -> Dict[str, Any]:
        """Gửi tín hiệu dừng tiến trình."""
        if cls._batch_state["is_running"]:
            cls._batch_state["stop_requested"] = True
            cls._log("⚠️ Đang yêu cầu dừng tiến trình...")
            return {"stopped": True, "message": "Đã gửi tín hiệu dừng tiến trình."}
        return {"stopped": False, "message": "Hiện không có tiến trình nào đang chạy."}

    @classmethod
    def list_gallery(cls, folder_name: str = "prompts_video") -> Dict[str, Any]:
        """Quét và trả về toàn bộ ảnh và video đã tạo trong thư mục."""
        safe_folder = cls._sanitize_folder(folder_name)
        target_dir = os.path.join(DOWNLOADS_DIR, safe_folder)
        if not os.path.exists(target_dir):
            return {"folder_name": safe_folder, "items": []}

        items = []
        files = os.listdir(target_dir)

        # Tìm các video và ảnh tương ứng
        media_map = {}
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            name_no_ext = os.path.splitext(f)[0]
            # Nhận diện image1, video1...
            num_match = re.search(r'\d+', name_no_ext)
            num_key = int(num_match.group()) if num_match else name_no_ext

            if num_key not in media_map:
                media_map[num_key] = {"index": num_key, "image": None, "video": None, "name": name_no_ext}

            filepath = os.path.join(target_dir, f)
            size_mb = round(os.path.getsize(filepath) / (1024 * 1024), 2)
            url = f"/downloads/{safe_folder}/{f}"

            if ext in [".png", ".jpg", ".jpeg", ".webp"]:
                media_map[num_key]["image"] = {"filename": f, "url": url, "size_mb": size_mb}
            elif ext in [".mp4", ".webm", ".mov"]:
                media_map[num_key]["video"] = {"filename": f, "url": url, "size_mb": size_mb}

        # Sắp xếp theo số thứ tự
        sorted_keys = sorted(media_map.keys(), key=lambda k: k if isinstance(k, int) else 999999)
        for k in sorted_keys:
            items.append(media_map[k])

        return {
            "folder_name": safe_folder,
            "folder_path": target_dir,
            "total_items": len(items),
            "items": items
        }
