# ⚡ HƯỚNG DẪN KẾT NỐI CLOUD GPU MIỄN PHÍ CHO TUNE-TEXT

Tài liệu này hướng dẫn cách đưa toàn bộ tác vụ AI nặng (chạy mô hình 30B, Llama 3, Muse-Glimmer hoặc sinh hình ảnh/video) lên **GPU Đám Mây Miễn Phí của Google Colab** để máy tính cá nhân của bạn hoàn toàn nhẹ nhàng, mát máy và không bị giật lag!

---

## 🎯 CÁCH 1: DÙNG GOOGLE COLAB (MIỄN PHÍ 100% - KHÔNG CẦN CÀI ĐẶT GÌ TRÊN MÁY)

### Bước 1: Mở Notebook trên Google Colab
1. Truy cập vào trang: [Google Colab](https://colab.research.google.com/)
2. Chọn tab **Upload** và tải tệp `Tune_Text_Colab_GPU_Worker.ipynb` (nằm trong thư mục `cloud_worker/` của dự án này) lên.

### Bước 2: Bật Card Đồ Họa GPU T4 Miễn Phí
1. Trên thanh menu trên cùng của Colab, bấm vào **Runtime** ➔ **Change runtime type** (Thay đổi loại phiên chạy).
2. Ở mục **Hardware accelerator**, chọn **T4 GPU** (hoặc A100 nếu bạn có tài khoản Colab Pro).
3. Bấm **Save** (Lưu).

### Bước 3: Chạy Toàn Bộ Lệnh
1. Nhấn phím tắt `Ctrl + F9` (hoặc bấm **Runtime** ➔ **Run all**).
2. Hệ thống sẽ tự động:
   - Cài đặt Ollama engine trên máy chủ Google.
   - Tải mô hình AI (Llama 3.2, Muse-Glimmer, v.v.).
   - Khởi tạo đường truyền bảo mật Cloudflare Tunnel.

### Bước 4: Lấy URL và Kết Nối vào Tune-Text
Sau khoảng 1-2 phút, ở ô lệnh cuối cùng sẽ xuất hiện dòng chữ:
```text
===================================================================
🎉 ĐÃ KHỞI TẠO CLOUD GPU WORKER THÀNH CÔNG!
===================================================================
👉 ĐƯỜNG DẪN KẾT NỐI CỦA BẠN: https://xxxx-xxxx-xxxx.trycloudflare.com
===================================================================
```
👉 Bạn chỉ cần copy đường link này và dán vào mục **Cloud GPU Worker** trên Tune-Text để hệ thống gọi thẳng sang GPU của Google!

---

## 🚀 CÁCH 2: THUÊ CLOUD GPU SIÊU RẺ THEO GIỜ (RUNPOD / VAST.AI)

Nếu bạn cần chạy hàng chục nghìn prompt hoặc render video liên tục 24/7 với card đồ họa khủng (RTX 3090 / RTX 4090 24GB VRAM):

1. Đăng ký tài khoản tại [RunPod.io](https://www.runpod.io/) (Nạp $5 dùng được khoảng 20 tiếng).
2. Chọn **Deploy** ➔ Tìm template **Ollama** hoặc **Ubuntu 22.04**.
3. Chọn GPU **RTX 3090 (24GB VRAM)** với giá chỉ ~$0.25/giờ (khoảng 6.000đ/tiếng).
4. Mở Web Terminal của RunPod, chạy script có sẵn trong dự án:
   ```bash
   bash run_worker.sh llama3.2
   ```
5. RunPod sẽ in ra đường link Cloudflare Tunnel. Dán link đó vào Tune-Text là bạn đã có một máy trạm AI siêu khủng!

---

## 💡 ƯU ĐIỂM VƯỢT TRỘI SO VỚI CHẠY TRÊN MÁY LOCAL:
- ✅ **Máy cá nhân mát rượi**: CPU/RAM máy tính của bạn không tăng dù chỉ 1%.
- ✅ **Tốc độ siêu nhanh**: Chạy bằng card Tesla T4 / RTX 3090 trên mạng Internet 10Gbps của Data Center.
- ✅ **Làm việc đa nhiệm**: Bạn có thể thoải mái xem phim, chơi game, lướt web trên máy tính mà không bị đơ giật.

