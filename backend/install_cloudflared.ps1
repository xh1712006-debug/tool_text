# Script tự động tải và cài đặt Cloudflare Tunnel Service trên Windows
$token = "eyJhIjoiMmI1MGI5ZGJiYjYxY2YyZDg4OTY1MGNhNTViMzVhMTIiLCJ0IjoiNjdlY2M3M2EtMmQwOS00YjI3LWExNzUtMzMzNDFiY2NhMTcyIiwicyI6Ik56bGlabU13TXpndFlqSXhaUzAwTXpCa0xXRXhaV1l0T1RCaVl6Qm1aR1ZqTTJRNCJ9"
$cloudflaredPath = Join-Path $PSScriptRoot "cloudflared.exe"

Write-Host "=== CÀI ĐẶT CLOUDFLARE TUNNEL SERVICE ===" -ForegroundColor Cyan

# 1. Tải cloudflared.exe nếu chưa có
if (-not (Test-Path $cloudflaredPath)) {
    Write-Host "Đang tải cloudflared.exe từ Cloudflare..." -ForegroundColor Yellow
    $url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    Invoke-WebRequest -Uri $url -OutFile $cloudflaredPath
    Write-Host "Đã tải xong cloudflared.exe!" -ForegroundColor Green
} else {
    Write-Host "Tìm thấy cloudflared.exe cục bộ." -ForegroundColor Green
}

# 2. Cài đặt Service (Yêu cầu quyền Administrator)
Write-Host "Đang thực hiện cài đặt Cloudflare Service với Token của bạn..." -ForegroundColor Yellow
try {
    Start-Process -FilePath $cloudflaredPath -ArgumentList "service install $token" -Wait -NoNewWindow
    Write-Host "Cài đặt Cloudflare Service hoàn tất thành công!" -ForegroundColor Green
    Write-Host "Kiểm tra trạng thái Service: Get-Service cloudflared" -ForegroundColor Cyan
} catch {
    Write-Host "Lỗi khi cài đặt service (Vui lòng mở PowerShell bằng quyền Run as Administrator): $_" -ForegroundColor Red
}

