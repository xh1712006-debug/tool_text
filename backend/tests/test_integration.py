import io
from docx import Document


def test_frontend_index_page(client):
    """Kiểm tra Endpoint phục vụ giao diện Web Frontend hợp nhất."""
    response = client.get("/")
    assert response.status_code == 200
    assert "Tune-Text" in response.text
    assert "text/html" in response.headers.get("content-type", "")


def test_health_check(client):
    """Kiểm tra Endpoint kiểm tra sức khỏe hệ thống."""
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    assert json_data["data"]["app_status"] == "healthy"


def test_auth_register_and_login_flow(client):
    """Kiểm tra toàn bộ luồng đăng ký tài khoản, đăng nhập và lấy hồ sơ cá nhân."""
    user_payload = {
        "email": "developer@example.com",
        "password": "SecretPassword123",
        "full_name": "Lập Trình Viên"
    }

    # 1. Đăng ký tài khoản
    reg_response = client.post("/api/v1/auth/register", json=user_payload)
    assert reg_response.status_code == 201
    reg_data = reg_response.json()
    assert reg_data["success"] is True
    assert reg_data["data"]["email"] == user_payload["email"]

    # 2. Đăng ký lại cùng email (Kỳ vọng trả về 409 Conflict)
    duplicate_response = client.post("/api/v1/auth/register", json=user_payload)
    assert duplicate_response.status_code == 409
    assert duplicate_response.json()["success"] is False

    # 3. Đăng nhập sai mật khẩu (Kỳ vọng trả về 401 Unauthorized)
    wrong_login = client.post("/api/v1/auth/login", json={
        "email": user_payload["email"],
        "password": "WrongPassword"
    })
    assert wrong_login.status_code == 401

    # 4. Đăng nhập đúng thông tin
    login_response = client.post("/api/v1/auth/login", json={
        "email": user_payload["email"],
        "password": user_payload["password"]
    })
    assert login_response.status_code == 200
    login_data = login_response.json()
    assert login_data["success"] is True
    assert "access_token" in login_data["data"]
    access_token = login_data["data"]["access_token"]
    refresh_token = login_data["data"]["refresh_token"]

    # 5. Gọi API lấy thông tin cá nhân với Header xác thực
    headers = {"Authorization": f"Bearer {access_token}"}
    profile_response = client.get("/api/v1/users/me", headers=headers)
    assert profile_response.status_code == 200
    profile_data = profile_response.json()
    assert profile_data["success"] is True
    assert profile_data["data"]["email"] == user_payload["email"]

    # 6. Cấp lại AccessToken bằng RefreshToken
    refresh_response = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_response.status_code == 200
    assert "access_token" in refresh_response.json()["data"]


def test_text_tuning_module_crud_and_export_flow(client):
    """Kiểm tra phân hệ nghiệp vụ Text Tuning: Tạo, Tìm kiếm, Xuất Word và Xóa."""
    # 1. Đăng ký và đăng nhập
    client.post("/api/v1/auth/register", json={
        "email": "tuner@example.com",
        "password": "Password123",
        "full_name": "Text Tuner"
    })
    login_res = client.post("/api/v1/auth/login", json={
        "email": "tuner@example.com",
        "password": "Password123"
    })
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Tạo một tác vụ tinh chỉnh văn bản với chế độ formal
    task_payload = {
        "title": "Email gửi đối tác quan trọng",
        "input_text": "chúng tôi ko đồng ý vs phương án này vì chưa dc duyệt",
        "mode": "formal"
    }
    create_res = client.post("/api/v1/tuning/tasks", json=task_payload, headers=headers)
    assert create_res.status_code == 201
    created_task = create_res.json()["data"]
    assert created_task["title"] == task_payload["title"]
    assert "không" in created_task["tuned_text"]
    assert "được" in created_task["tuned_text"]
    task_id = created_task["id"]

    # 3. Tìm kiếm tác vụ theo từ khóa
    search_res = client.get("/api/v1/tuning/tasks?q=đối+tác", headers=headers)
    assert search_res.status_code == 200
    assert search_res.json()["data"]["total"] == 1

    # Tìm từ khóa không tồn tại
    search_empty = client.get("/api/v1/tuning/tasks?q=khongton_tai", headers=headers)
    assert search_empty.status_code == 200
    assert search_empty.json()["data"]["total"] == 0

    # 4. Xuất tác vụ ra tệp Word (.docx)
    export_res = client.get(f"/api/v1/tuning/tasks/{task_id}/export-docx", headers=headers)
    assert export_res.status_code == 200
    assert "application/vnd.openxmlformats" in export_res.headers.get("content-type", "")
    assert len(export_res.content) > 0

    # 5. Xóa tác vụ
    del_res = client.delete(f"/api/v1/tuning/tasks/{task_id}", headers=headers)
    assert del_res.status_code == 200


def test_file_upload_endpoint(client):
    """Kiểm tra Endpoint tải tệp đính kèm và trích xuất nội dung văn bản."""
    # Đăng ký & đăng nhập
    client.post("/api/v1/auth/register", json={
        "email": "uploader@example.com",
        "password": "Password123",
        "full_name": "Uploader"
    })
    login_res = client.post("/api/v1/auth/login", json={
        "email": "uploader@example.com",
        "password": "Password123"
    })
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Giả lập tệp Word để tải lên
    doc = Document()
    doc.add_paragraph("Nội dung hợp đồng kinh tế thử nghiệm.")
    stream = io.BytesIO()
    doc.save(stream)
    stream.seek(0)

    files = {"file": ("contract.docx", stream.read(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
    upload_res = client.post("/api/v1/tuning/extract-file", files=files, headers=headers)
    assert upload_res.status_code == 200
    data = upload_res.json()["data"]
    assert "Nội dung hợp đồng kinh tế thử nghiệm." in data["extracted_text"]


def test_rpa_status_and_validation(client):
    """Kiểm tra Endpoint quản lý Robot RPA ChatGPT (Lấy trạng thái, dừng và kiểm tra dữ liệu đầu vào)."""
    # 1. Đăng ký và đăng nhập
    client.post("/api/v1/auth/register", json={
        "email": "rpa_tester@example.com",
        "password": "Password123",
        "full_name": "RPA Tester"
    })
    login_res = client.post("/api/v1/auth/login", json={
        "email": "rpa_tester@example.com",
        "password": "Password123"
    })
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Kiểm tra lấy trạng thái ban đầu
    status_res = client.get("/api/v1/rpa/status", headers=headers)
    assert status_res.status_code == 200
    status_data = status_res.json()["data"]
    assert status_data["is_running"] is False
    assert status_data["current_index"] == 0

    # 3. Thử gửi yêu cầu rỗng (Kỳ vọng 400 hoặc 422)
    bad_res = client.post("/api/v1/rpa/start", json={
        "target_url": "https://chatgpt.com",
        "prompts_text": "   "
    }, headers=headers)
    assert bad_res.status_code == 400

    # 4. Kiểm tra nút Dừng khẩn cấp
    stop_res = client.post("/api/v1/rpa/stop", headers=headers)
    assert stop_res.status_code == 200
    assert stop_res.json()["data"]["stop_requested"] is True


def test_rpa_presets_management_flow(client):
    """Kiểm tra quản trị danh sách cấu hình nền tảng AI (Presets): Lấy danh sách, tạo mới, chống trùng lặp và xóa."""
    # Đăng nhập lấy token
    client.post("/api/v1/auth/register", json={
        "email": "preset_admin@example.com",
        "password": "Password123",
        "full_name": "Preset Admin"
    })
    login_res = client.post("/api/v1/auth/login", json={
        "email": "preset_admin@example.com",
        "password": "Password123"
    })
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Lấy danh sách preset có sẵn
    presets_res = client.get("/api/v1/rpa/presets")
    assert presets_res.status_code == 200
    presets_data = presets_res.json()["data"]["presets"]
    assert len(presets_data) >= 5
    codes = [p["platform_code"] for p in presets_data]
    assert "chatgpt" in codes
    assert "claude" in codes

    # 2. Tạo một preset AI tùy biến mới
    new_preset_payload = {
        "name": "Hệ thống Chatbot Nội Bộ",
        "platform_code": "internal_bot",
        "target_url": "https://ai.internal-corp.vn",
        "input_selectors": "textarea#input-msg, div.composer",
        "send_btn_selectors": "button#btn-send",
        "stop_btn_selectors": "button#btn-stop",
        "notes": "Hệ thống AI chạy trong mạng LAN công ty"
    }
    create_res = client.post("/api/v1/rpa/presets", json=new_preset_payload, headers=headers)
    assert create_res.status_code == 201
    created_id = create_res.json()["data"]["id"]

    # 3. Tạo trùng mã (Kỳ vọng 409 Conflict)
    duplicate_res = client.post("/api/v1/rpa/presets", json=new_preset_payload, headers=headers)
    assert duplicate_res.status_code == 409

    # 4. Thử xóa preset mặc định (Kỳ vọng 400 Bad Request)
    default_id = presets_data[0]["id"]
    cant_del_res = client.delete(f"/api/v1/rpa/presets/{default_id}", headers=headers)
    assert cant_del_res.status_code == 400

    # 5. Xóa preset tùy biến vừa tạo
    del_res = client.delete(f"/api/v1/rpa/presets/{created_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["data"]["deleted_id"] == created_id


def test_rpa_sync_profile_endpoint(client, monkeypatch):
    """Kiểm tra Endpoint đồng bộ tài khoản Google từ Chrome thật sang Robot."""
    from src.modules.ai_automation.services.rpa_chatgpt_service import RPAChatGPTService
    monkeypatch.setattr(RPAChatGPTService, "sync_chrome_profile", classmethod(lambda cls: True))

    client.post("/api/v1/auth/register", json={
        "email": "sync_tester@example.com",
        "password": "Password123",
        "full_name": "Sync Tester"
    })
    login_res = client.post("/api/v1/auth/login", json={
        "email": "sync_tester@example.com",
        "password": "Password123"
    })
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post("/api/v1/rpa/sync-profile", headers=headers)
    assert res.status_code == 200
    assert res.json()["data"]["synced"] is True


def test_admin12345_infinite_login_flow(client):
    """Kiểm tra tài khoản admin12345 đăng nhập không cần ký tự @ và nhận token vô hạn 100 năm."""
    from src.utils.security import decode_token
    from datetime import datetime, timezone

    # 1. Đăng nhập bằng tên đăng nhập ngắn gọn 'admin12345' và mật khẩu 'admin12345'
    login_res = client.post("/api/v1/auth/login", json={
        "email": "admin12345",
        "password": "admin12345"
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["success"] is True
    access_token = login_data["data"]["access_token"]
    refresh_token = login_data["data"]["refresh_token"]

    # 2. Giải mã và kiểm tra hạn sử dụng > 50 năm
    token_payload = decode_token(access_token)
    assert token_payload is not None
    assert token_payload.get("role") == "ADMIN"
    exp = token_payload.get("exp")
    assert exp > datetime.now(timezone.utc).timestamp() + (50 * 365 * 86400)

    # 3. Sử dụng token truy cập thông tin cá nhân
    headers = {"Authorization": f"Bearer {access_token}"}
    profile_res = client.get("/api/v1/users/me", headers=headers)
    assert profile_res.status_code == 200
    assert "admin12345" in profile_res.json()["data"]["email"]

    # 4. Kiểm tra làm mới token cũng duy trì thời hạn 100 năm
    refresh_res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_res.status_code == 200
    new_token = refresh_res.json()["data"]["access_token"]
    new_payload = decode_token(new_token)
    assert new_payload.get("exp") > datetime.now(timezone.utc).timestamp() + (50 * 365 * 86400)




