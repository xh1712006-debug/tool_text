import json
import logging
from typing import Dict, Any, List, Optional
import httpx

logger = logging.getLogger("TuneTextApp.CloudWorker")


class CloudWorkerService:
    """
    Dịch vụ điều phối và kết nối với Cloud GPU Worker (Ollama, vLLM, llama.cpp, Google Colab Tunnel, RunPod).
    Cho phép hệ thống Tune-Text chạy các mô hình AI mã nguồn mở nặng (30B, Llama 3, Muse-Glimmer)
    hoàn toàn trên GPU Đám Mây mà máy tính cá nhân không bị đơ giật hay quá tải.
    """

    @staticmethod
    def _clean_url(url: str) -> str:
        """Chuẩn hóa đường dẫn worker URL."""
        if not url:
            return ""
        clean = url.strip().rstrip("/")
        if not (clean.startswith("http://") or clean.startswith("https://")):
            clean = f"https://{clean}"
        return clean

    @classmethod
    async def test_connection(cls, worker_url: str) -> Dict[str, Any]:
        """
        Kiểm tra trạng thái kết nối tới Cloud GPU Worker và lấy danh sách mô hình.
        Tự động hỗ trợ cả chuẩn Ollama API (/api/tags) và chuẩn OpenAI / vLLM (/v1/models).
        """
        target = cls._clean_url(worker_url)
        if not target:
            return {"online": False, "message": "Đường dẫn Cloud Worker không hợp lệ."}

        async with httpx.AsyncClient(timeout=8.0, verify=False) as client:
            # 1. Thử theo chuẩn Ollama (/api/tags)
            try:
                res = await client.get(f"{target}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name") for m in data.get("models", [])]
                    return {
                        "online": True,
                        "type": "ollama",
                        "target_url": target,
                        "models": models,
                        "message": f"Kết nối thành công tới Ollama Cloud Worker ({len(models)} mô hình sẵn sàng)."
                    }
            except Exception:
                pass

            # 2. Thử theo chuẩn OpenAI / vLLM (/v1/models)
            try:
                res = await client.get(f"{target}/v1/models")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("id") for m in data.get("data", [])]
                    return {
                        "online": True,
                        "type": "vllm_openai",
                        "target_url": target,
                        "models": models,
                        "message": f"Kết nối thành công tới vLLM / OpenAI Cloud Worker ({len(models)} mô hình)."
                    }
            except Exception:
                pass

        return {
            "online": False,
            "target_url": target,
            "message": "Không thể kết nối tới Cloud Worker. Vui lòng kiểm tra lại URL hoặc trạng thái Colab/RunPod."
        }

    @classmethod
    async def generate_text(
        cls,
        worker_url: str,
        prompt: str,
        model: Optional[str] = None,
        system_prompt: str = ""
    ) -> Dict[str, Any]:
        """
        Gửi yêu cầu sinh văn bản / prompt trực tiếp tới Cloud Worker.
        """
        target = cls._clean_url(worker_url)
        if not target:
            raise ValueError("Chưa cấu hình đường dẫn Cloud Worker.")

        async with httpx.AsyncClient(timeout=180.0, verify=False) as client:
            # 1. Thử gửi theo chuẩn Ollama
            try:
                ollama_payload = {
                    "model": model or "llama3.2",
                    "prompt": prompt,
                    "system": system_prompt,
                    "stream": False
                }
                res = await client.post(f"{target}/api/generate", json=ollama_payload)
                if res.status_code == 200:
                    data = res.json()
                    return {
                        "success": True,
                        "response": data.get("response", ""),
                        "model": data.get("model", model),
                        "total_duration": data.get("total_duration")
                    }
            except Exception as e:
                logger.warning(f"Ollama endpoint lỗi, thử OpenAI format: {e}")

            # 2. Thử gửi theo chuẩn vLLM / OpenAI Compatible
            try:
                openai_payload = {
                    "model": model or "default",
                    "messages": [
                        {"role": "system", "content": system_prompt or "You are a helpful AI assistant."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7
                }
                res = await client.post(f"{target}/v1/chat/completions", json=openai_payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    return {
                        "success": True,
                        "response": content,
                        "model": data.get("model", model)
                    }
            except Exception as e:
                logger.error(f"Lỗi toàn bộ kết nối Cloud Worker: {e}")
                raise RuntimeError(f"Lỗi khi gửi yêu cầu tới Cloud Worker: {str(e)}")

