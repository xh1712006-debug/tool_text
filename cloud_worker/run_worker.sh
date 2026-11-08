#!/usr/bin/env bash
# ===================================================================
#   TUNE-TEXT CLOUD GPU WORKER (RUNPOD / VAST.AI / UBUNTU GPU VPS)
# ===================================================================
set -e

MODEL_NAME=${1:-"llama3.2"}
PORT=${2:-"11434"}

echo "=== ĐANG KHỞI TẠO TUNE-TEXT GPU WORKER (MÔ HÌNH: ${MODEL_NAME}) ==="

# 1. Cài đặt Ollama nếu chưa có
if ! command -v ollama &> /dev/null; then
    echo "-> Đang cài đặt Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
fi

# 2. Cài đặt Cloudflared nếu chưa có
if ! command -v cloudflared &> /dev/null; then
    echo "-> Đang tải Cloudflare Tunnel..."
    wget -q -nc https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /usr/local/bin/cloudflared
    chmod +x /usr/local/bin/cloudflared
fi

# 3. Chạy Ollama ngầm
echo "-> Khởi động dịch vụ Ollama trên cổng ${PORT}..."
OLLAMA_HOST=0.0.0.0:${PORT} ollama serve &
sleep 3

# 4. Tải mô hình AI
echo "-> Đang tải mô hình ${MODEL_NAME}..."
ollama pull ${MODEL_NAME}

# 5. Mở tunnel ra ngoài Internet
echo "-> Khởi tạo Cloudflare Tunnel..."
cloudflared tunnel --url http://localhost:${PORT}
