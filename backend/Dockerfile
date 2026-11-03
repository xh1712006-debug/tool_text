FROM python:3.12-slim

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Cài đặt các gói phụ thuộc hệ thống cần thiết cho psycopg2 và compiler
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Sao chép và cài đặt các thư viện Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Sao chép toàn bộ mã nguồn vào container
COPY . .

# Mở cổng 8000
EXPOSE 8000

# Lệnh khởi chạy FastAPI với uvicorn
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]

