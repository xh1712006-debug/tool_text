# 🎨 HƯỚNG DẪN SỬ DỤNG AI STUDIO TRỰC TIẾP (TỰ ĐỘNG TẠO ẢNH & VIDEO NỘI BỘ)

Hệ thống **AI Studio Nội Bộ** của Tune-Text cho phép bạn tạo Hình ảnh 8K và Video chuyển động MP4 tuần tự từ danh sách prompt mà:
- **KHÔNG** cần truy cập các trang web bên ngoài (Muse, Runway, Pika...).
- **KHÔNG** bị kiểm duyệt hay thông báo *"Yêu cầu tạo video bị từ chối"*.
- **KHÔNG** cần bật VPN hay lo bị chặn IP / Captcha.
- **KHÔNG** tốn 1% CPU hay RAM của máy tính bạn (chạy 100% trên Cloud GPU miễn phí).

---

## 🚀 BƯỚC 1: KHỞI ĐỘNG CLOUD GPU MIỄN PHÍ TRÊN GOOGLE COLAB

1. Mở trình duyệt và truy cập [Google Colab](https://colab.research.google.com/).
2. Bấm **Upload (Tải lên)** và chọn tệp:
   ```
   tune-text/cloud_worker/Tune_Text_AI_Studio_Worker.ipynb
   ```
3. Đảm bảo Colab đang dùng GPU miễn phí:
   - Menu **Runtime (Thời gian chạy)** ➔ **Change runtime type (Đổi loại thời gian chạy)** ➔ Chọn **T4 GPU** ➔ Bấm **Save**.
4. Chạy toàn bộ sổ tay:
   - Menu **Runtime** ➔ Bấm **Run all** (hoặc phím tắt `Ctrl + F9`).
5. Cuộn xuống ô cuối cùng, bạn sẽ thấy đường dẫn Cloudflare Tunnel miễn phí:
   ```text
   ===================================================================
   🎉 CHÚC MỪNG BẠN! CLOUD GPU WORKER ĐÃ HOẠT ĐỘNG HOÀN TOÀN!
   🔗 Đường dẫn kết nối Tune-Text: https://xxxx-xxxx-xxxx.trycloudflare.com
   ===================================================================
   ```
6. **Sao chép đường dẫn `https://...trycloudflare.com` này**.

---

## 🎬 BƯỚC 2: KẾT NỐI VÀ CHẠY TRÊN TUNE-TEXT

1. Mở trang chủ Tune-Text tại [http://localhost:8000](http://localhost:8000).
2. Bấm vào Tab: **"3. AI Studio Trực Tiếp (Tạo Ảnh & Video Nội Bộ)"**.
3. Dán đường dẫn Cloudflare vừa sao chép vào ô **"Đường dẫn Cloud GPU Worker"** ➔ Bấm nút **"Kiểm Tra Kết Nối GPU"**.
   - Biểu tượng chuyển sang **màu xanh** và hiện `Tesla T4 (15.8 GB VRAM) - Sẵn Sàng`.
4. Chọn cấu hình mong muốn:
   - **Quy trình**: `Trọn Gói: Prompt ➔ Ảnh 8K ➔ Video MP4` hoặc `Chỉ Tạo Hình Ảnh`.
   - **Tỉ lệ khung hình**: `16:9 Ngang` (YouTube/Phim), `9:16 Dọc` (TikTok/Reels), hoặc `1:1 Vuông`.
   - **Thư mục lưu trữ**: Ví dụ `promt1` (Hệ thống sẽ lưu video thành `video1.mp4`, `video2.mp4`...).
5. Nạp danh sách Prompt:
   - Bấm **"Lấy từ Tab RPA"** nếu bạn đã có danh sách ở Tab 2, HOẶC
   - Bấm **"Tải Tệp Lên"** và chọn tệp `promt1.txt`.
6. Bấm nút: **"🚀 Khởi Chạy AI Studio (Không Cần Web Ngoài)"**.

---

## 📺 BƯỚC 3: THEO DÕI & TẢI KẾT QUẢ

1. **Khung Giám Sát Thời Gian Thực:**
   - Hệ thống hiển thị thanh tiến độ `[Đoạn 1/34]`.
   - **Bên trái:** Hiển thị ngay lập tức bức ảnh 8K vừa vẽ xong.
   - **Bên phải:** Hiển thị trình phát Video MP4 vừa kết xuất xong chuyển động mượt mà.
2. **Thư Viện Media Tích Hợp:**
   - Bấm nút **"Xem Thư Viện Media Đã Tạo"** để xem lại toàn bộ các video đã sinh ra.
   - Có sẵn nút **"Tải Video (.mp4)"** và **"Ảnh gốc"** cho từng đoạn.
   - Toàn bộ video và ảnh cũng được lưu trực tiếp vào thư mục:
     ```
     backend/downloads/{tên_thư_mục}/
     ```

