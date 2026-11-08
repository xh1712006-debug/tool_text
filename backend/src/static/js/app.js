// Ứng dụng Quản trị & Tinh chỉnh Văn bản Tune-Text (100% Free & Long-term)
const API_BASE = "/api/v1";

const state = {
    token: localStorage.getItem("tunetext_token") || null,
    refreshToken: localStorage.getItem("tunetext_refresh_token") || null,
    user: JSON.parse(localStorage.getItem("tunetext_user") || "null"),
    tasks: [],
    searchQuery: ""
};

// Thông báo Toast nhanh
function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    const bgClass = type === "success" ? "bg-emerald-600" : (type === "error" ? "bg-rose-600" : "bg-indigo-600");
    const icon = type === "success" ? "fa-circle-check" : (type === "error" ? "fa-circle-xmark" : "fa-info");

    toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-2xl transition-all duration-300 transform translate-y-2 opacity-0 ${bgClass}`;
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.remove("translate-y-2", "opacity-0");
    });

    setTimeout(() => {
        toast.classList.add("opacity-0", "translate-y-2");
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Cập nhật giao diện theo trạng thái đăng nhập
function updateAuthUI() {
    const guestArea = document.getElementById("guestAuthArea");
    const userArea = document.getElementById("userAuthArea");
    const userNameSpan = document.getElementById("userNameSpan");
    const userRoleSpan = document.getElementById("userRoleSpan");
    const loginWarning = document.getElementById("loginWarning");

    if (state.token && state.user) {
        guestArea.classList.add("hidden");
        userArea.classList.remove("hidden");
        userNameSpan.textContent = state.user.full_name || state.user.email.split("@")[0];
        userRoleSpan.textContent = state.user.role || "USER";
        loginWarning.classList.add("hidden");
        loadUserTasks();
    } else {
        guestArea.classList.remove("hidden");
        userArea.classList.add("hidden");
        loginWarning.classList.remove("hidden");
        state.tasks = [];
        renderTasksTable();
    }
}

// Lưu thông tin phiên xác thực (Tokens & User Profile)
function saveAuthSession(accessToken, refreshToken, user) {
    state.token = accessToken;
    if (refreshToken) state.refreshToken = refreshToken;
    if (user) state.user = user;
    if (accessToken) localStorage.setItem("tunetext_token", accessToken);
    if (refreshToken) localStorage.setItem("tunetext_refresh_token", refreshToken);
    if (user) localStorage.setItem("tunetext_user", JSON.stringify(user));
    updateAuthUI();
}

// Gọi API với Bearer Token & Tự động gia hạn khi hết hạn (Silent Refresh)
async function fetchAPI(endpoint, options = {}) {
    const headers = options.headers || {};
    if (state.token) {
        headers["Authorization"] = `Bearer ${state.token}`;
    }
    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    let response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    // Nếu gặp lỗi 401 (AccessToken hết hạn) và có RefreshToken, thử tự động cấp lại token
    if (response.status === 401 && state.refreshToken) {
        try {
            const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refresh_token: state.refreshToken })
            });
            const refreshJson = await refreshRes.json();
            if (refreshJson.success && refreshJson.data?.access_token) {
                state.token = refreshJson.data.access_token;
                localStorage.setItem("tunetext_token", state.token);
                headers["Authorization"] = `Bearer ${state.token}`;

                // Gửi lại yêu cầu ban đầu với token mới cấp
                response = await fetch(`${API_BASE}${endpoint}`, {
                    ...options,
                    headers
                });
            }
        } catch (e) {
            console.warn("Làm mới token tự động thất bại:", e);
        }
    }

    // Nếu vẫn 401 sau khi thử refresh: Xóa token cũ và mở modal đăng nhập
    if (response.status === 401) {
        logout();
        openAuthModal();
        throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại!");
    }

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || data.detail || "Đã xảy ra lỗi kết nối");
    }
    return data;
}

// Đăng nhập tài khoản VIP Token Vô Hạn (100 Năm)
async function loginInfiniteAccount() {
    sessionStorage.removeItem("tunetext_manual_logout");
    try {
        // Ưu tiên gọi endpoint kích hoạt phiên vĩnh viễn trực tiếp
        const res = await fetch(`${API_BASE}/auth/permanent-session`);
        const json = await res.json();
        if (json.success && json.data) {
            saveAuthSession(json.data.access_token, json.data.refresh_token, json.data.user);
            showToast("👑 Đã đăng nhập tài khoản VIP admin12345! Token vô hạn (100 năm)!", "success");
            closeAuthModal();
            return;
        }
        showToast("Lỗi đăng nhập: " + (json.message || "Không xác định"), "error");
    } catch (err) {
        showToast("Lỗi kết nối: " + err.message, "error");
    }
}

// Tự động kích hoạt phiên đăng nhập vĩnh viễn cho máy chủ (Out-of-the-box)
async function autoLoginPermanentAdmin() {
    if (sessionStorage.getItem("tunetext_manual_logout") === "true") {
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/auth/permanent-session`);
        if (res.ok) {
            const json = await res.json();
            if (json.success && json.data) {
                saveAuthSession(json.data.access_token, json.data.refresh_token, json.data.user);
                showToast("⚡ Đã kích hoạt tài khoản Quản Trị Viên vĩnh viễn (admin12345)!", "success");
            }
        }
    } catch (e) {
        console.warn("Không thể tự động kích hoạt phiên vĩnh viễn:", e);
    }
}

// Đăng nhập nhanh tài khoản mẫu (Demo 1-Click)
async function loginDemoAccount() {
    const email = "demo@tunetext.local";
    const password = "Password123";
    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const json = await res.json();
        if (json.success) {
            saveAuthSession(json.data.access_token, json.data.refresh_token, json.data.user);
            showToast("Đã đăng nhập tài khoản dùng thử!", "success");
            closeAuthModal();
            return;
        }

        // Nếu chưa có tài khoản, tự động đăng ký
        const regRes = await fetch(`${API_BASE}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, full_name: "Khách Dùng Thử" })
        });
        const regJson = await regRes.json();
        if (regJson.success) {
            const loginRes2 = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            const loginJson2 = await loginRes2.json();
            if (loginJson2.success) {
                saveAuthSession(loginJson2.data.access_token, loginJson2.data.refresh_token, loginJson2.data.user);
                showToast("Đã tạo và đăng nhập tài khoản dùng thử!", "success");
                closeAuthModal();
            }
        }
    } catch (err) {
        showToast("Lỗi đăng nhập nhanh: " + err.message, "error");
    }
}

// Đăng nhập
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const errorBox = document.getElementById("authErrorBox");

    try {
        errorBox.classList.add("hidden");
        const res = await fetchAPI("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });

        saveAuthSession(res.data.access_token, res.data.refresh_token, res.data.user);
        showToast("Đăng nhập thành công!", "success");
        closeAuthModal();
    } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove("hidden");
    }
}

// Đăng ký
async function handleRegister(e) {
    e.preventDefault();
    const fullName = document.getElementById("regFullName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;
    const errorBox = document.getElementById("authErrorBox");

    try {
        errorBox.classList.add("hidden");
        await fetchAPI("/auth/register", {
            method: "POST",
            body: JSON.stringify({ email, password, full_name: fullName })
        });

        showToast("Đăng ký thành công! Đang tự động đăng nhập...", "success");

        const loginRes = await fetchAPI("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });

        saveAuthSession(loginRes.data.access_token, loginRes.data.refresh_token, loginRes.data.user);
        closeAuthModal();
    } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove("hidden");
    }
}

// Đăng xuất
function logout() {
    state.token = null;
    state.refreshToken = null;
    state.user = null;
    localStorage.removeItem("tunetext_token");
    localStorage.removeItem("tunetext_refresh_token");
    localStorage.removeItem("tunetext_user");
    sessionStorage.setItem("tunetext_manual_logout", "true");
    updateAuthUI();
    showToast("Đã đăng xuất tài khoản.");
}

// Tinh chỉnh văn bản
async function handleTuneText() {
    if (!state.token) {
        openAuthModal();
        showToast("Vui lòng đăng nhập trước khi tinh chỉnh văn bản!", "info");
        return;
    }

    const title = document.getElementById("taskTitle").value.trim() || "Văn bản tinh chỉnh nhanh";
    const inputText = document.getElementById("inputText").value.trim();
    const mode = document.querySelector('input[name="tuneMode"]:checked')?.value || "formal";
    const btn = document.getElementById("tuneBtn");

    if (!inputText) {
        showToast("Vui lòng nhập hoặc tải tệp văn bản cần tinh chỉnh!", "error");
        return;
    }

    try {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang xử lý...</span>`;

        const res = await fetchAPI("/tuning/tasks", {
            method: "POST",
            body: JSON.stringify({ title, input_text: inputText, mode })
        });

        const tunedText = res.data.tuned_text;
        document.getElementById("outputText").value = tunedText;
        document.getElementById("outputStats").textContent = `${tunedText.length} ký tự | ${tunedText.trim().split(/\s+/).length} từ`;

        // Bật nút tải về
        document.getElementById("exportDocxBtn").setAttribute("data-task-id", res.data.id);
        document.getElementById("exportActionsGroup").classList.remove("hidden");

        showToast("Tinh chỉnh văn bản thành công!", "success");
        loadUserTasks();
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> <span>Tinh chỉnh văn bản ngay</span>`;
    }
}

// Xử lý tải tệp (.txt, .docx, .pdf)
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!state.token) {
        openAuthModal();
        showToast("Vui lòng đăng nhập để nạp tệp tin!", "info");
        event.target.value = "";
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const uploadIndicator = document.getElementById("uploadIndicator");
    uploadIndicator.classList.remove("hidden");

    try {
        const res = await fetchAPI("/tuning/extract-file", {
            method: "POST",
            body: formData
        });

        document.getElementById("taskTitle").value = `Tài liệu: ${file.name}`;
        document.getElementById("inputText").value = res.data.extracted_text;
        updateInputStats();
        showToast(`Đã nạp văn bản từ tệp '${file.name}' thành công!`, "success");
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        uploadIndicator.classList.add("hidden");
        event.target.value = "";
    }
}

// Tải tệp Word (.docx)
function downloadTunedDocx() {
    const taskId = document.getElementById("exportDocxBtn").getAttribute("data-task-id");
    if (!taskId) {
        showToast("Chưa có tác vụ nào để xuất Word!", "error");
        return;
    }
    // Tải trực tiếp bằng token
    const url = `${API_BASE}/tuning/tasks/${taskId}/export-docx`;
    fetch(url, {
        headers: { "Authorization": `Bearer ${state.token}` }
    })
    .then(res => res.blob())
    .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `tuned_document_${taskId}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast("Đang tải tệp Word (.docx)...", "success");
    })
    .catch(() => showToast("Lỗi khi tải tệp Word", "error"));
}

// Tải tệp văn bản thuần (.txt)
function downloadTunedTxt() {
    const output = document.getElementById("outputText").value;
    if (!output) {
        showToast("Chưa có văn bản kết quả để tải về!", "error");
        return;
    }
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tuned_text.txt";
    a.click();
    showToast("Đã tải tệp .txt về máy!", "success");
}

// Tải lịch sử tác vụ (kèm tìm kiếm)
let searchDebounceTimeout = null;
function handleSearchInput(e) {
    clearTimeout(searchDebounceTimeout);
    state.searchQuery = e.target.value.trim();
    searchDebounceTimeout = setTimeout(() => {
        loadUserTasks();
    }, 300);
}

async function loadUserTasks() {
    if (!state.token) return;
    try {
        const endpoint = state.searchQuery 
            ? `/tuning/tasks?q=${encodeURIComponent(state.searchQuery)}&limit=15` 
            : `/tuning/tasks?limit=15`;
        const res = await fetchAPI(endpoint);
        state.tasks = res.data.tasks || [];
        renderTasksTable();
    } catch (err) {
        console.error("Lỗi tải lịch sử tác vụ:", err);
    }
}

// Hiển thị danh sách tác vụ ra bảng
function renderTasksTable() {
    const tbody = document.getElementById("tasksTableBody");
    const emptyState = document.getElementById("emptyTasksState");

    if (!state.tasks || state.tasks.length === 0) {
        tbody.innerHTML = "";
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");
    tbody.innerHTML = state.tasks.map(t => {
        const dateStr = t.created_at ? new Date(t.created_at).toLocaleString("vi-VN") : "Mới đây";
        return `
            <tr class="border-b border-slate-700/50 hover:bg-slate-800/40 transition">
                <td class="py-3 px-4 font-mono text-xs text-indigo-400">#${t.id}</td>
                <td class="py-3 px-4 font-medium text-slate-200">${escapeHtml(t.title)}</td>
                <td class="py-3 px-4 text-xs text-slate-400">${dateStr}</td>
                <td class="py-3 px-4">
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <i class="fa-solid fa-check text-[10px]"></i> Đã lưu
                    </span>
                </td>
                <td class="py-3 px-4 text-right space-x-1.5">
                    <button onclick="viewTaskDetail(${t.id})" class="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition" title="Xem lại">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    <button onclick="downloadTaskDocxDirect(${t.id})" class="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition" title="Tải Word (.docx)">
                        <i class="fa-solid fa-file-word"></i>
                    </button>
                    <button onclick="deleteTask(${t.id})" class="text-xs px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition" title="Xóa">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

// Tải Word từ danh sách
function downloadTaskDocxDirect(taskId) {
    const url = `${API_BASE}/tuning/tasks/${taskId}/export-docx`;
    fetch(url, { headers: { "Authorization": `Bearer ${state.token}` } })
    .then(res => res.blob())
    .then(blob => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `tuned_task_${taskId}.docx`;
        a.click();
        showToast("Đang tải tệp Word...", "success");
    });
}

// Xem chi tiết tác vụ
function viewTaskDetail(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    document.getElementById("taskTitle").value = task.title;
    document.getElementById("inputText").value = task.input_text;
    document.getElementById("outputText").value = task.tuned_text || "";
    document.getElementById("exportDocxBtn").setAttribute("data-task-id", task.id);
    document.getElementById("exportActionsGroup").classList.remove("hidden");
    updateInputStats();
    window.scrollTo({ top: 300, behavior: "smooth" });
    showToast(`Đã nạp tác vụ #${taskId} vào khung làm việc.`);
}

// Xóa tác vụ
async function deleteTask(taskId) {
    if (!confirm("Bạn có chắc chắn muốn xóa tác vụ này khỏi PostgreSQL?")) return;
    try {
        await fetchAPI(`/tuning/tasks/${taskId}`, { method: "DELETE" });
        showToast("Đã xóa tác vụ thành công.");
        loadUserTasks();
    } catch (err) {
        showToast(err.message, "error");
    }
}

// Sao chép kết quả
function copyOutputText() {
    const output = document.getElementById("outputText");
    if (!output.value) {
        showToast("Chưa có văn bản kết quả để sao chép!", "error");
        return;
    }
    navigator.clipboard.writeText(output.value);
    showToast("Đã sao chép văn bản vào bộ nhớ tạm!", "success");
}

// Cập nhật số ký tự/từ của input
function updateInputStats() {
    const val = document.getElementById("inputText").value;
    const words = val.trim() ? val.trim().split(/\s+/).length : 0;
    document.getElementById("inputStats").textContent = `${val.length} ký tự | ${words} từ`;
}

// Nạp mẫu thử nghiệm
function loadSampleTemplate(type) {
    const titleInput = document.getElementById("taskTitle");
    const textInput = document.getElementById("inputText");

    if (type === "email") {
        titleInput.value = "Email gửi đối tác cập nhật tiến độ";
        textInput.value = "kính gửi ban giám đốc   chúng tôi xin trân trọng thông báo là dự án đã hoàn thành 100% test   mọi chức năng đều hoạt động ổn định và sẵn sàng bàn giao   tks các ae đã hỗ trợ nhiệt tình";
    } else if (type === "report") {
        titleInput.value = "Báo cáo tối ưu hệ thống";
        textInput.value = "kiến trúc modular mvc giúp bảo trì dễ dàng   hệ thống tích hợp xác thực jwt bảo mật cao   database postgresql với chỉ mục tối ưu thời gian phản hồi api dưới 50ms   ae xem qua rồi phản hồi ntn nhé";
    }
    updateInputStats();
    showToast("Đã nạp văn bản mẫu!");
}

// Kiểm tra sức khỏe hệ thống
async function checkSystemHealth() {
    const healthBadge = document.getElementById("healthBadge");
    try {
        const res = await fetch("/health");
        const data = await res.json();
        if (data.data?.database_status === "ok") {
            healthBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> <span class="text-xs text-emerald-400 font-medium">PostgreSQL: Hoạt Động (Online)</span>`;
        } else {
            healthBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400"></span> <span class="text-xs text-amber-400 font-medium">PostgreSQL: Đang kết nối</span>`;
        }
    } catch (e) {
        healthBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-400"></span> <span class="text-xs text-rose-400 font-medium">Hệ thống: Ngoại tuyến</span>`;
    }
}

// Modal Điều khiển
function openAuthModal(defaultTab = 'login') {
    document.getElementById("authModal").classList.remove("hidden");
    switchAuthTab(defaultTab);
}

function closeAuthModal() {
    document.getElementById("authModal").classList.add("hidden");
    document.getElementById("authErrorBox").classList.add("hidden");
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById("loginForm");
    const regForm = document.getElementById("registerForm");
    const tabLogin = document.getElementById("tabLogin");
    const tabRegister = document.getElementById("tabRegister");
    const errorBox = document.getElementById("authErrorBox");
    errorBox.classList.add("hidden");

    if (tab === "login") {
        loginForm.classList.remove("hidden");
        regForm.classList.add("hidden");
        tabLogin.className = "flex-1 py-2 text-center text-sm font-semibold border-b-2 border-indigo-500 text-indigo-400";
        tabRegister.className = "flex-1 py-2 text-center text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-200";
    } else {
        loginForm.classList.add("hidden");
        regForm.classList.remove("hidden");
        tabRegister.className = "flex-1 py-2 text-center text-sm font-semibold border-b-2 border-indigo-500 text-indigo-400";
        tabLogin.className = "flex-1 py-2 text-center text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-200";
    }
}

function escapeHtml(string) {
    const div = document.createElement("div");
    div.innerText = string;
    return div.innerHTML;
}

// Khởi chạy
document.addEventListener("DOMContentLoaded", () => {
    updateAuthUI();
    if (!state.token || !state.user) {
        autoLoginPermanentAdmin();
    }
    checkSystemHealth();
    loadAIPresets();
    initRPADragAndDrop();
    document.getElementById("inputText").addEventListener("input", updateInputStats);
    document.getElementById("searchInput").addEventListener("input", handleSearchInput);
    document.getElementById("fileUploadInput").addEventListener("change", handleFileUpload);

    // Lắng nghe thay đổi trực tiếp trên ô nhập URL để đồng bộ dropdown
    const rpaUrlInput = document.getElementById("rpaTargetUrl");
    if (rpaUrlInput) {
        rpaUrlInput.addEventListener("input", handleTargetUrlInput);
        const savedUrl = localStorage.getItem("tune_text_target_url");
        if (savedUrl) {
            rpaUrlInput.value = savedUrl;
        }
    }

    // Khôi phục cài đặt câu mở đầu và mã đặc biệt
    const savedPrefixTemplate = localStorage.getItem("tune_text_prefix_template");
    if (savedPrefixTemplate !== null) {
        const tplInput = document.getElementById("rpaPrefixTemplate");
        if (tplInput) tplInput.value = savedPrefixTemplate;
    }
    const savedSpecialCode = localStorage.getItem("tune_text_special_code");
    if (savedSpecialCode !== null) {
        const scInput = document.getElementById("rpaSpecialCode");
        if (scInput) scInput.value = savedSpecialCode;
    }
    const savedEnablePrefix = localStorage.getItem("tune_text_enable_prefix");
    if (savedEnablePrefix !== null) {
        const epChk = document.getElementById("rpaEnablePrefixHeader");
        if (epChk) epChk.checked = (savedEnablePrefix === "1");
    }
    updateRPAPrefixPreview();

    // Kiểm tra Extension nếu đã nạp
    setTimeout(() => {
        if (document.documentElement.dataset.tuneTextExtension === "active") {
            const badge = document.getElementById("extensionIndicatorBadge");
            if (badge) badge.classList.remove("hidden");
        }
    }, 300);
});

// ==========================================
// TÍNH NĂNG ROBOT RPA TỰ ĐỘNG GÕ ĐA NỀN TẢNG AI
// ==========================================
let rpaPollInterval = null;
let currentAIPresets = [];

function switchMainTab(tab) {
    const tabTuner = document.getElementById("tabMainTuner");
    const tabRPA = document.getElementById("tabMainRPA");
    const tabStudio = document.getElementById("tabMainStudio");
    const sectionTuner = document.getElementById("sectionTuner");
    const sectionRPA = document.getElementById("sectionRPA");
    const sectionStudio = document.getElementById("sectionStudio");

    const defaultClass = "flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-slate-800/80 hover:bg-slate-800 text-slate-300 transition";

    // Ẩn tất cả các section trước
    sectionTuner?.classList.add("hidden");
    sectionRPA?.classList.add("hidden");
    sectionStudio?.classList.add("hidden");

    if (tabTuner) tabTuner.className = defaultClass;
    if (tabRPA) tabRPA.className = defaultClass;
    if (tabStudio) tabStudio.className = defaultClass;

    if (tab === "tuner") {
        sectionTuner?.classList.remove("hidden");
        if (tabTuner) tabTuner.className = "flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 transition";
    } else if (tab === "rpa") {
        sectionRPA?.classList.remove("hidden");
        if (tabRPA) tabRPA.className = "flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20 transition";
    } else if (tab === "studio") {
        sectionStudio?.classList.remove("hidden");
        if (tabStudio) tabStudio.className = "flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition";
        initStudioUI();
    }
}

async function loadAIPresets(selectedCode = null) {
    try {
        const res = await fetch(`${API_BASE}/rpa/presets`);
        const json = await res.json();
        if (json.success && json.data?.presets) {
            currentAIPresets = json.data.presets;
            renderAIPresetOptions(selectedCode);
        }
    } catch (e) {
        console.warn("Chưa thể nạp cấu hình AI từ CSDL:", e);
    }
}

function renderAIPresetOptions(selectedCode = null) {
    const select = document.getElementById("rpaPlatformSelect");
    const urlInput = document.getElementById("rpaTargetUrl");
    if (!select || !currentAIPresets.length) return;

    // Giữ nguyên lựa chọn đang có hoặc lựa chọn từ localStorage
    const savedCode = localStorage.getItem("tune_text_selected_platform");
    const activeCode = selectedCode || select.value || savedCode || "chatgpt";

    let html = "";
    currentAIPresets.forEach(p => {
        html += `<option value="${p.platform_code}" data-url="${p.target_url}" data-input="${p.input_selectors || ''}" data-send="${p.send_btn_selectors || ''}" data-stop="${p.stop_btn_selectors || ''}">
            ${escapeHtml(p.name)} (${p.target_url})
        </option>`;
    });
    html += `<option value="custom" data-url="" data-input="" data-send="" data-stop="">🌐 Nền tảng khác / Tự động nhận diện (Smart Heuristic)</option>`;
    select.innerHTML = html;

    // Khôi phục lại đúng lựa chọn đang active
    if (activeCode && [...select.options].some(opt => opt.value === activeCode)) {
        select.value = activeCode;
    }

    // Nếu chọn một preset xác định (không phải custom), đồng bộ URL nếu cần
    if (select.value !== "custom") {
        const chosen = select.options[select.selectedIndex];
        const targetUrl = chosen?.getAttribute("data-url");
        if (targetUrl && urlInput && (!urlInput.value || urlInput.value === "https://chatgpt.com" || selectedCode)) {
            urlInput.value = targetUrl;
            localStorage.setItem("tune_text_target_url", targetUrl);
        }
    }
}

function handlePlatformChange() {
    const select = document.getElementById("rpaPlatformSelect");
    const selected = select.options[select.selectedIndex];
    const urlInput = document.getElementById("rpaTargetUrl");
    const customInput = document.getElementById("rpaCustomInput");
    const customSend = document.getElementById("rpaCustomSend");
    const customStop = document.getElementById("rpaCustomStop");

    const code = select.value;
    localStorage.setItem("tune_text_selected_platform", code);

    const url = selected.getAttribute("data-url") || "";
    if (url) {
        urlInput.value = url;
        localStorage.setItem("tune_text_target_url", url);
    } else if (code === "custom") {
        // Nếu chọn nền tảng khác: nếu URL đang là mặc định chatgpt thì làm trống để người dùng nhập
        if (urlInput.value === "https://chatgpt.com") {
            urlInput.value = "";
            urlInput.placeholder = "https://...";
        }
        urlInput.focus();
    }

    customInput.value = selected.getAttribute("data-input") || "";
    customSend.value = selected.getAttribute("data-send") || "";
    customStop.value = selected.getAttribute("data-stop") || "";
}

function handleTargetUrlInput() {
    const urlInput = document.getElementById("rpaTargetUrl");
    const select = document.getElementById("rpaPlatformSelect");
    if (!urlInput || !select) return;

    const rawUrl = urlInput.value.trim();
    localStorage.setItem("tune_text_target_url", rawUrl);

    if (!rawUrl) return;

    const typedUrl = rawUrl.toLowerCase();
    let matchedPreset = null;

    // Tìm xem URL vừa nhập có khớp với preset có sẵn nào không
    for (const p of currentAIPresets) {
        if (!p.target_url) continue;
        const pUrl = p.target_url.trim().toLowerCase();
        try {
            const pHost = new URL(pUrl).hostname.replace(/^www\./, "");
            const typedHost = new URL(typedUrl.startsWith("http") ? typedUrl : `https://${typedUrl}`).hostname.replace(/^www\./, "");
            if (pHost === typedHost || typedUrl.includes(pHost) || pUrl.includes(typedHost)) {
                matchedPreset = p;
                break;
            }
        } catch (e) {
            if (typedUrl.includes(p.platform_code)) {
                matchedPreset = p;
                break;
            }
        }
    }

    if (matchedPreset) {
        select.value = matchedPreset.platform_code;
        localStorage.setItem("tune_text_selected_platform", matchedPreset.platform_code);
        const customInput = document.getElementById("rpaCustomInput");
        const customSend = document.getElementById("rpaCustomSend");
        const customStop = document.getElementById("rpaCustomStop");
        if (customInput && !customInput.value) customInput.value = matchedPreset.input_selectors || "";
        if (customSend && !customSend.value) customSend.value = matchedPreset.send_btn_selectors || "";
        if (customStop && !customStop.value) customStop.value = matchedPreset.stop_btn_selectors || "";
    } else {
        // URL tùy ý mới lạ -> Tự động chuyển dropdown sang Nền tảng khác
        select.value = "custom";
        localStorage.setItem("tune_text_selected_platform", "custom");
    }
}

function toggleAdvancedRPASettings() {
    const panel = document.getElementById("rpaAdvancedPanel");
    const icon = document.getElementById("rpaAdvancedIcon");
    const isHidden = panel.classList.contains("hidden");

    if (isHidden) {
        panel.classList.remove("hidden");
        icon.classList.add("rotate-180");
    } else {
        panel.classList.add("hidden");
        icon.classList.remove("rotate-180");
    }
}

async function openLoginBrowser() {
    const targetUrl = document.getElementById("rpaTargetUrl")?.value.trim() || "https://chatgpt.com";
    showToast("Đang mở cửa sổ Chrome Robot độc lập (Không ảnh hưởng Chrome đang dùng)...", "info");
    try {
        const res = await fetchAPI("/rpa/open-browser", {
            method: "POST",
            body: JSON.stringify({ target_url: targetUrl })
        });
        showToast(res.message, "success");
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function handleSyncGoogleProfile() {
    if (!state.token) {
        openAuthModal();
        showToast("Vui lòng đăng nhập trước khi đồng bộ tài khoản!", "info");
        return;
    }

    showToast("Đang đồng bộ an toàn dữ liệu từ Chrome thật (Không tắt Chrome)...", "info");
    try {
        const res = await fetchAPI("/rpa/sync-profile", { method: "POST" });
        showToast(res.message, "success");
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function saveCurrentAIPreset() {
    if (!state.token) {
        openAuthModal();
        showToast("Vui lòng đăng nhập để lưu cấu hình nền tảng AI vào CSDL!", "info");
        return;
    }

    const urlInput = document.getElementById("rpaTargetUrl");
    let targetUrl = urlInput.value.trim();
    if (!targetUrl) {
        showToast("Vui lòng nhập URL của trang AI!", "error");
        return;
    }
    if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = `https://${targetUrl}`;
        urlInput.value = targetUrl;
    }

    const name = prompt("Nhập tên hiển thị cho nền tảng AI này (Ví dụ: Claude AI, DeepSeek Chat, Poe, Kimi...):");
    if (!name || !name.trim()) return;

    const code = name.toLowerCase().replace(/[^a-z0-9]/g, "_").substring(0, 30);
    const inputSel = document.getElementById("rpaCustomInput").value.trim() || "textarea, div[contenteditable='true']";
    const sendSel = document.getElementById("rpaCustomSend").value.trim() || "button[type='submit'], button";
    const stopSel = document.getElementById("rpaCustomStop").value.trim() || "button[aria-label*='Stop']";

    try {
        const res = await fetchAPI("/rpa/presets", {
            method: "POST",
            body: JSON.stringify({
                name: name.trim(),
                platform_code: code,
                target_url: targetUrl,
                input_selectors: inputSel,
                send_btn_selectors: sendSel,
                stop_btn_selectors: stopSel,
                notes: "Người dùng tự định nghĩa trên giao diện"
            })
        });

        showToast(res.message || `Đã lưu thành công AI "${name.trim()}"!`, "success");
        // Nạp lại danh sách và chọn ngay nền tảng AI mới lưu!
        await loadAIPresets(code);
        urlInput.value = targetUrl;
        localStorage.setItem("tune_text_selected_platform", code);
        localStorage.setItem("tune_text_target_url", targetUrl);
    } catch (err) {
        showToast(err.message, "error");
    }
}

function reloadExtensionFromWeb() {
    window.dispatchEvent(new CustomEvent("TUNE_TEXT_RELOAD_EXTENSION"));
    showToast("🔄 Đang làm mới Tiện ích Extension và tải lại mã mới...", "info");
    setTimeout(() => {
        window.location.reload();
    }, 600);
}

// Điều khiển Modal Hướng Dẫn Extension
function openExtensionGuideModal() {
    const modal = document.getElementById("extensionGuideModal");
    if (modal) modal.classList.remove("hidden");
}

function closeExtensionGuideModal() {
    const modal = document.getElementById("extensionGuideModal");
    if (modal) modal.classList.add("hidden");
}

function copyExtensionPath() {
    const path = "d:\\project\\project-local\\tune-text\\chrome_extension";
    navigator.clipboard.writeText(path).then(() => {
        showToast("📋 Đã sao chép đường dẫn! Hãy dán (Ctrl+V) vào ô chọn thư mục của Chrome.", "success");
    }).catch(() => {
        const input = document.getElementById("extPathInput");
        if (input) {
            input.select();
            document.execCommand("copy");
            showToast("📋 Đã sao chép đường dẫn!", "success");
        }
    });
}

let detectedExtensionVersion = null;

// Lắng nghe sự kiện từ Tiện ích mở rộng Chrome Extension (Chạy trực tiếp trên tab bên cạnh)
window.addEventListener("TUNE_TEXT_EXTENSION_ACTIVE", (e) => {
    console.log("Đã phát hiện Chrome Extension:", e.detail);
    detectedExtensionVersion = e.detail?.version || "1.0.0";
    const badge = document.getElementById("extensionIndicatorBadge");
    const versionText = document.getElementById("extensionVersionText");
    const btnReload = document.getElementById("btnReloadExtension");

    if (badge) {
        badge.classList.remove("hidden");
    }
    if (versionText) {
        versionText.textContent = `Đã kết nối Tab bên cạnh (v${detectedExtensionVersion})`;
        if (detectedExtensionVersion !== "1.1.0") {
            versionText.style.color = "#f59e0b"; // Màu vàng cam cảnh báo bản cũ
        } else {
            versionText.style.color = "#86efac"; // Màu xanh lá bản mới nhất
        }
    }
    if (btnReload) {
        btnReload.classList.remove("hidden");
    }
});

function reloadChromeExtension() {
    window.dispatchEvent(new CustomEvent("TUNE_TEXT_RELOAD_EXTENSION"));
    showToast("Đang gửi lệnh nạp lại Extension...", "info");
    setTimeout(() => {
        window.location.reload();
    }, 800);
}

// Lắng nghe cập nhật tiến trình từ Tab AI bên cạnh
window.addEventListener("TUNE_TEXT_PROGRESS_UPDATE", (e) => {
    const data = e.detail;
    if (!data) return;

    const statusCard = document.getElementById("rpaStatusCard");
    statusCard.classList.remove("hidden");

    const progressBar = document.getElementById("rpaProgressBar");
    const statusText = document.getElementById("rpaStatusText");
    const progressCount = document.getElementById("rpaProgressCount");
    const logsBox = document.getElementById("rpaLogsBox");

    if (data.status_message) statusText.textContent = data.status_message;
    if (data.total_prompts) {
        let loopInfo = "";
        if (data.duration_minutes > 0) {
            loopInfo = ` (Lượt ${data.current_loop || 1} ${data.remaining_time_str || ''})`;
        } else if (data.loop_count >= 999999) {
            loopInfo = ` (Lượt ${data.current_loop || 1} - Vô hạn)`;
        } else if (data.loop_count > 1) {
            loopInfo = ` (Lượt ${data.current_loop || 1}/${data.loop_count})`;
        }
        const unit = (data.batch_size && data.batch_size > 1) ? "Lô " : "";
        progressCount.textContent = `${unit}${data.current_index} / ${data.total_prompts}${loopInfo}`;
        const pct = Math.round((data.current_index / data.total_prompts) * 100);
        progressBar.style.width = `${pct}%`;
    }

    if (data.log) {
        const div = document.createElement("div");
        div.textContent = `[${new Date().toLocaleTimeString()}] ${data.log}`;
        logsBox.appendChild(div);
        logsBox.scrollTop = logsBox.scrollHeight;
    }

    if (data.is_completed) {
        showToast("🎉 Đã hoàn tất 100% các đoạn văn bản trên tab bên cạnh!", "success");
    }
});

window.addEventListener("TUNE_TEXT_RESPONSE", (e) => {
    const res = e.detail;
    if (res && res.message) {
        showToast(res.message, res.success ? "success" : "error");
        if (!res.success) {
            const logsBox = document.getElementById("rpaLogsBox");
            if (logsBox) {
                const errLog = document.createElement("div");
                errLog.className = "text-red-400 font-semibold";
                errLog.textContent = `[${new Date().toLocaleTimeString()}] ❌ ${res.message}`;
                logsBox.appendChild(errLog);
                logsBox.scrollTop = logsBox.scrollHeight;
            }
        }
    }
});

function switchRPAMode(mode) {
    const panelCount = document.getElementById("rpaPanelCount");
    const panelDuration = document.getElementById("rpaPanelDuration");
    const panelInfinite = document.getElementById("rpaPanelInfinite");

    if (panelCount) panelCount.classList.add("hidden");
    if (panelDuration) panelDuration.classList.add("hidden");
    if (panelInfinite) panelInfinite.classList.add("hidden");

    if (mode === "count" && panelCount) {
        panelCount.classList.remove("hidden");
    } else if (mode === "duration" && panelDuration) {
        panelDuration.classList.remove("hidden");
    } else if (mode === "infinite" && panelInfinite) {
        panelInfinite.classList.remove("hidden");
    }
}

function handleInfiniteLoopToggle(checkbox) {
    const loopInput = document.getElementById("rpaLoopCount");
    if (!loopInput) return;
    if (checkbox.checked) {
        loopInput.dataset.prevVal = loopInput.value;
        loopInput.disabled = true;
        loopInput.value = "999";
    } else {
        loopInput.disabled = false;
        loopInput.value = loopInput.dataset.prevVal || "1";
    }
}

// Cập nhật bộ đếm số lượng đoạn văn bản (prompts) trong ô RPA
function updateRPAPromptsCount() {
    const textarea = document.getElementById("rpaPromptsText");
    const badge = document.getElementById("rpaPromptsCountBadge");
    if (!textarea || !badge) return;
    const text = textarea.value.trim();
    if (!text) {
        badge.textContent = "0 đoạn";
        badge.className = "text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono transition";
        updateRPABatchSummary();
        return;
    }
    const paragraphs = text.split(/\n\s*\n+/).map(p => p.trim()).filter(p => p.length > 0);
    badge.textContent = `${paragraphs.length} đoạn`;
    badge.className = "text-[11px] px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold font-mono transition";
    updateRPABatchSummary();
}

// Thiết lập nhanh số lượng đoạn gộp mỗi lần gửi
function setRPABatchSize(size) {
    const input = document.getElementById("rpaBatchSize");
    if (input) {
        input.value = size;
        updateRPABatchSummary();
    }
}

// Gộp tất cả các đoạn đang có vào gửi đúng 1 lần
function setRPABatchSizeAll() {
    const textarea = document.getElementById("rpaPromptsText");
    const input = document.getElementById("rpaBatchSize");
    if (textarea && input) {
        const text = textarea.value.trim();
        const paragraphs = text ? text.split(/\n\s*\n+/).map(p => p.trim()).filter(p => p.length > 0) : [];
        const count = Math.max(1, paragraphs.length);
        input.value = count;
        updateRPABatchSummary();
        showToast(`Đã thiết lập gộp tất cả ${count} đoạn vào gửi 1 lần duy nhất!`, "info");
    }
}

// Cập nhật tóm tắt số lô (Batch Summary)
function updateRPABatchSummary() {
    const textarea = document.getElementById("rpaPromptsText");
    const input = document.getElementById("rpaBatchSize");
    const badge = document.getElementById("rpaBatchSummaryBadge");
    if (!badge) return;

    const rawBatch = parseInt(input?.value, 10);
    const batchSize = (!isNaN(rawBatch) && rawBatch > 0) ? rawBatch : 1;

    const text = textarea ? textarea.value.trim() : "";
    const totalPrompts = text ? text.split(/\n\s*\n+/).map(p => p.trim()).filter(p => p.length > 0).length : 0;

    if (totalPrompts === 0) {
        badge.textContent = (batchSize === 1) ? "Gửi 1 đoạn / lần (Tuần tự)" : `Gộp ${batchSize} đoạn / lần`;
        updateRPAPrefixPreview();
        return;
    }

    const totalBatches = Math.ceil(totalPrompts / batchSize);
    if (batchSize === 1) {
        badge.textContent = `Gửi tuần tự: ${totalPrompts} lần (mỗi lần 1 đoạn)`;
    } else if (batchSize >= totalPrompts) {
        badge.textContent = `Gộp tất cả ${totalPrompts} đoạn gửi đúng 1 lần!`;
    } else {
        badge.textContent = `Gộp ${batchSize} đoạn/lần ➔ Gửi thành ${totalBatches} đợt`;
    }
    updateRPAPrefixPreview();
}

// Cập nhật xem trước câu mở đầu gửi vào AI (Prefix Command Preview)
function updateRPAPrefixPreview() {
    const chk = document.getElementById("rpaEnablePrefixHeader");
    const templateInput = document.getElementById("rpaPrefixTemplate");
    const specialCodeInput = document.getElementById("rpaSpecialCode");
    const previewEl = document.getElementById("rpaPrefixPreviewText");
    const panel = document.getElementById("rpaPrefixConfigPanel");
    const batchInput = document.getElementById("rpaBatchSize");

    if (!previewEl) return;

    const isEnabled = chk ? chk.checked : true;
    if (panel) {
        if (isEnabled) {
            panel.classList.remove("opacity-40", "pointer-events-none");
        } else {
            panel.classList.add("opacity-40", "pointer-events-none");
        }
    }

    if (!isEnabled) {
        previewEl.textContent = "(Đã tắt chèn câu mở đầu - Gửi trực tiếp nội dung prompt vào AI)";
        previewEl.className = "text-xs text-slate-500 font-mono italic";
        return;
    }

    previewEl.className = "text-xs text-amber-300 font-mono font-medium truncate";
    const rawBatch = parseInt(batchInput?.value, 10);
    const count = (!isNaN(rawBatch) && rawBatch > 0) ? rawBatch : 1;
    const specialCode = specialCodeInput ? specialCodeInput.value.trim() : "";
    let template = templateInput ? templateInput.value.trim() : "hãy tạo cho tôi {count} đợt {batch} {code}";
    if (!template) template = "hãy tạo cho tôi {count} đợt {batch} {code}";

    // Lấy tên thư mục tệp đang chọn nếu có
    const activeItem = (window.rpaFileQueue && window.rpaFileQueue[window.rpaActiveFileIndex]) || null;
    const folderName = activeItem ? activeItem.cleanFolderName : "prompts_video";

    // Lưu vào localStorage
    if (templateInput) {
        localStorage.setItem("tune_text_prefix_template", templateInput.value);
    }
    if (specialCodeInput) {
        localStorage.setItem("tune_text_special_code", specialCode);
    }
    if (chk) {
        localStorage.setItem("tune_text_enable_prefix", isEnabled ? "1" : "0");
    }

    // Thay thế các biến để hiển thị xem trước cho đợt 1
    let previewSentence = template
        .replace(/{count}/g, count)
        .replace(/{batch}/g, "1")
        .replace(/{code}/g, specialCode)
        .replace(/{folder}/g, folderName)
        .replace(/\s+/g, " ")
        .trim();

    if (!previewSentence.endsWith(":")) {
        previewSentence += ":";
    }
    previewEl.textContent = previewSentence;
}

// Chèn nhanh thẻ biến vào ô mẫu câu
function insertRPATag(tag) {
    const input = document.getElementById("rpaPrefixTemplate");
    if (!input) return;
    const start = input.selectionStart || input.value.length;
    const end = input.selectionEnd || input.value.length;
    const val = input.value;
    input.value = val.substring(0, start) + " " + tag + " " + val.substring(end);
    input.focus();
    updateRPAPrefixPreview();
}

// Khôi phục mẫu câu mặc định ban đầu
function resetRPAPrefixTemplate() {
    const input = document.getElementById("rpaPrefixTemplate");
    if (input) {
        input.value = "hãy tạo cho tôi {count} đợt {batch} {code}";
        updateRPAPrefixPreview();
        showToast("Đã khôi phục mẫu câu lệnh gốc: hãy tạo cho tôi {count} đợt {batch} {code}", "info");
    }
}

// Tự động chuẩn hóa khoảng cách: Mỗi đoạn cách nhau đúng 1 dòng trống (\n\n)
function normalizeRPAPromptsSpacing() {
    const textarea = document.getElementById("rpaPromptsText");
    if (!textarea) return;
    const text = textarea.value.trim();
    if (!text) {
        showToast("Vui lòng nhập hoặc dán nội dung trước khi cách dòng!", "info");
        return;
    }
    const paragraphs = text.split(/\n\s*\n+/).map(p => p.trim()).filter(p => p.length > 0);
    textarea.value = paragraphs.join("\n\n");
    updateRPAPromptsCount();
    showToast(`✨ Đã chuẩn hóa ${paragraphs.length} đoạn văn bản (mỗi đoạn cách nhau 1 dòng trống)!`, "success");
}

// Xóa nhanh toàn bộ nội dung ô nhập prompt
function clearRPAPrompts() {
    const textarea = document.getElementById("rpaPromptsText");
    if (textarea) {
        textarea.value = "";
        updateRPAPromptsCount();
        showToast("Đã xóa trắng danh sách đoạn văn bản.", "info");
    }
}

// =========================================================================
// QUẢN LÝ HÀNG ĐỢI NHIỀU TỆP PROMPT & THƯ MỤC LƯU VIDEO (Multi-file Queue)
// =========================================================================
window.rpaFileQueue = [];
window.rpaActiveFileIndex = -1;

function getCleanFolderName(fileName) {
    if (!fileName) return "prompts_video";
    const baseName = fileName.replace(/\.[^/.]+$/, "");
    return baseName.replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1EA0-\u1EF9]/g, "_").replace(/_+/g, "_").trim() || "prompts_video";
}

function renderRPAFileQueue() {
    const container = document.getElementById("rpaFileQueueContainer");
    const listEl = document.getElementById("rpaFileQueueList");
    const countEl = document.getElementById("rpaFileQueueCount");
    const folderBadge = document.getElementById("rpaActiveFolderBadge");
    if (!container || !listEl) return;

    if (!window.rpaFileQueue || window.rpaFileQueue.length === 0) {
        container.classList.add("hidden");
        if (folderBadge) folderBadge.textContent = "chưa_có_tệp";
        return;
    }

    container.classList.remove("hidden");
    if (countEl) countEl.textContent = window.rpaFileQueue.length;

    const activeItem = window.rpaFileQueue[window.rpaActiveFileIndex];
    if (folderBadge) {
        folderBadge.textContent = activeItem ? activeItem.cleanFolderName : "chưa_chọn";
    }

    listEl.innerHTML = window.rpaFileQueue.map((item, idx) => {
        const isActive = (idx === window.rpaActiveFileIndex);
        const activeClass = isActive 
            ? "bg-purple-600/40 text-purple-200 border-purple-400 shadow-md ring-1 ring-purple-400" 
            : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700/80 hover:border-slate-600";
        return `
            <div class="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs cursor-pointer transition ${activeClass}"
                onclick="selectRPAQueueItem(${idx})">
                <i class="fa-solid fa-file-lines ${isActive ? 'text-amber-300' : 'text-purple-400'}"></i>
                <span class="font-medium max-w-[160px] truncate" title="${item.fileName}">${item.fileName}</span>
                <span class="px-1.5 py-0.5 rounded-md ${isActive ? 'bg-purple-900/60 text-purple-200' : 'bg-slate-900 text-slate-400'} text-[10px] font-mono">
                    ${item.count} đoạn
                </span>
                <button type="button" onclick="event.stopPropagation(); removeRPAQueueItem(${idx})" class="text-slate-400 hover:text-rose-400 ml-1 text-xs" title="Xóa tệp này">
                    &times;
                </button>
            </div>
        `;
    }).join("");
}

function selectRPAQueueItem(index) {
    if (!window.rpaFileQueue[index]) return;
    window.rpaActiveFileIndex = index;
    const item = window.rpaFileQueue[index];
    const textarea = document.getElementById("rpaPromptsText");
    if (textarea) {
        textarea.value = item.content;
        updateRPAPromptsCount();
    }
    renderRPAFileQueue();
    showToast(`📂 Đã chuyển sang tệp '${item.fileName}' (Thư mục video: '${item.cleanFolderName}')`, "info");
}

function removeRPAQueueItem(index) {
    if (!window.rpaFileQueue[index]) return;
    window.rpaFileQueue.splice(index, 1);
    if (window.rpaActiveFileIndex >= window.rpaFileQueue.length) {
        window.rpaActiveFileIndex = window.rpaFileQueue.length - 1;
    }
    if (window.rpaActiveFileIndex >= 0) {
        selectRPAQueueItem(window.rpaActiveFileIndex);
    } else {
        const textarea = document.getElementById("rpaPromptsText");
        if (textarea) textarea.value = "";
        updateRPAPromptsCount();
        renderRPAFileQueue();
    }
}

function clearRPAFileQueue() {
    window.rpaFileQueue = [];
    window.rpaActiveFileIndex = -1;
    const textarea = document.getElementById("rpaPromptsText");
    if (textarea) textarea.value = "";
    updateRPAPromptsCount();
    renderRPAFileQueue();
    showToast("Đã xóa sạch hàng đợi tệp prompt!", "info");
}

// Tiếp nhận 1 hoặc nhiều tệp chọn từ thẻ input
async function handleRPAPromptFileSelect(input) {
    if (input.files && input.files.length > 0) {
        const fileList = Array.from(input.files);
        await handleRPAMultipleFilesUpload(fileList);
        input.value = ""; // Reset input để có thể chọn lại
    }
}

// Xử lý nạp đồng thời nhiều tệp (.docx, .pdf, .txt)
async function handleRPAMultipleFilesUpload(files) {
    if (!files || files.length === 0) return;
    const validExts = [".docx", ".pdf", ".txt"];
    let addedCount = 0;

    showToast(`Đang phân tích và nạp ${files.length} tệp prompt...`, "info");

    for (const file of files) {
        const nameLower = file.name.toLowerCase();
        if (!validExts.some(ext => nameLower.endsWith(ext))) {
            console.warn(`Bỏ qua tệp không hỗ trợ: ${file.name}`);
            continue;
        }

        try {
            let extractedText = "";
            if (nameLower.endsWith(".txt")) {
                extractedText = await file.text();
            } else {
                const formData = new FormData();
                formData.append("file", file);
                const res = await fetchAPI("/tuning/extract-file", {
                    method: "POST",
                    body: formData
                });
                extractedText = res.data?.extracted_text || "";
            }

            const paragraphs = extractedText.split(/\n\s*\n+/).map(p => p.trim()).filter(p => p.length > 0);
            if (paragraphs.length > 0) {
                const cleanFolder = getCleanFolderName(file.name);
                window.rpaFileQueue.push({
                    id: Date.now() + "_" + Math.random().toString(36).substring(2, 7),
                    fileName: file.name,
                    cleanFolderName: cleanFolder,
                    content: paragraphs.join("\n\n"),
                    count: paragraphs.length
                });
                addedCount++;
            }
        } catch (err) {
            console.error(`Lỗi khi đọc tệp ${file.name}:`, err);
        }
    }

    if (addedCount > 0) {
        // Tự động chọn tệp vừa nạp đầu tiên nếu chưa chọn tệp nào
        if (window.rpaActiveFileIndex === -1 || window.rpaActiveFileIndex >= window.rpaFileQueue.length) {
            window.rpaActiveFileIndex = window.rpaFileQueue.length - addedCount;
        }
        selectRPAQueueItem(window.rpaActiveFileIndex);
        showToast(`🎉 Đã nạp thành công ${addedCount} tệp vào hàng đợi!`, "success");
    } else {
        showToast("Không tìm thấy nội dung hợp lệ từ các tệp đã chọn!", "error");
    }
}

// Trích xuất tệp tải lên (.docx, .pdf, .txt) đơn lẻ
async function handleRPAPromptFileUpload(file) {
    if (!file) return;
    await handleRPAMultipleFilesUpload([file]);
}

// Khởi tạo tính năng kéo thả file trực tiếp vào ô nhập liệu
function initRPADragAndDrop() {
    const dropZone = document.getElementById("rpaDropZone");
    const textarea = document.getElementById("rpaPromptsText");
    if (!dropZone || !textarea) return;

    ["dragenter", "dragover"].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add("border-purple-500", "bg-purple-950/20");
        }, false);
    });

    ["dragleave", "drop"].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove("border-purple-500", "bg-purple-950/20");
        }, false);
    });

    dropZone.addEventListener("drop", (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            handleRPAMultipleFilesUpload(Array.from(files));
        }
    });

    textarea.addEventListener("input", updateRPAPromptsCount);
    updateRPAPromptsCount();
}

async function startRPAPrompter() {
    if (!state.token) {
        openAuthModal();
        showToast("Vui lòng đăng nhập trước khi chạy Robot!", "info");
        return;
    }

    const select = document.getElementById("rpaPlatformSelect");
    const platformCode = select ? select.value : "custom";
    const targetUrl = document.getElementById("rpaTargetUrl").value.trim() || "https://chatgpt.com";
    const promptsText = document.getElementById("rpaPromptsText").value.trim();
    const customInput = document.getElementById("rpaCustomInput")?.value.trim() || null;
    const customSend = document.getElementById("rpaCustomSend")?.value.trim() || null;
    const customStop = document.getElementById("rpaCustomStop")?.value.trim() || null;

    // Xác định chế độ chạy: Lặp theo số lần / Lặp theo thời gian / Vô hạn
    const modeChoice = document.querySelector('input[name="rpaModeChoice"]:checked')?.value || "count";
    let loopCount = 3;
    let isInfiniteLoop = false;
    let durationMinutes = 0;
    let loopLabel = "";

    if (modeChoice === "duration") {
        const rawDuration = parseFloat(document.getElementById("rpaDurationMinutes")?.value);
        durationMinutes = (!isNaN(rawDuration) && rawDuration > 0) ? rawDuration : 5;
        // Chế độ thời gian: Lặp liên tục (vô hạn vòng lặp) cho đến khi hết số phút quy định!
        loopCount = 999999;
        isInfiniteLoop = true;
        loopLabel = `Chạy liên tục trong ${durationMinutes} phút`;
    } else if (modeChoice === "infinite") {
        loopCount = 999999;
        isInfiniteLoop = true;
        durationMinutes = 0;
        loopLabel = "Vô hạn (Không giới hạn)";
    } else {
        // Mặc định: Lặp theo số lần
        const rawLoop = parseInt(document.getElementById("rpaLoopCount")?.value, 10);
        loopCount = (!isNaN(rawLoop) && rawLoop > 0) ? rawLoop : 3;
        isInfiniteLoop = false;
        durationMinutes = 0;
        loopLabel = `${loopCount} lượt lặp lại`;
    }

    const delaySeconds = parseFloat(document.getElementById("rpaDelaySeconds")?.value) || 3;
    const stayInBackground = document.getElementById("rpaStayInBackground")?.checked ?? true;
    const rawBatchSize = parseInt(document.getElementById("rpaBatchSize")?.value, 10);
    const batchSize = (!isNaN(rawBatchSize) && rawBatchSize > 0) ? rawBatchSize : 1;
    const enablePrefixHeader = document.getElementById("rpaEnablePrefixHeader")?.checked ?? true;
    const prefixTemplate = document.getElementById("rpaPrefixTemplate")?.value.trim() || "hãy tạo cho tôi {count} đợt {batch} {code}";
    const specialCode = document.getElementById("rpaSpecialCode")?.value.trim() || "";

    console.log("[Tune-Text] Cài đặt khởi chạy Robot:", { modeChoice, loopCount, isInfiniteLoop, durationMinutes, delaySeconds, stayInBackground, batchSize, enablePrefixHeader, prefixTemplate, specialCode });

    if (!promptsText) {
        showToast("Vui lòng nhập các đoạn văn bản cần gửi!", "error");
        return;
    }

    // Phân tách danh sách các đoạn văn bản
    const promptsList = promptsText.split(/\n\s*\n+/).map(p => p.trim()).filter(p => p.length > 0);
    if (promptsList.length === 0) {
        showToast("Không tìm thấy đoạn văn bản hợp lệ!", "error");
        return;
    }

    const totalBatches = Math.ceil(promptsList.length / batchSize);
    const batchDesc = (batchSize > 1) ? ` | Gộp ${batchSize} đoạn/lần (${totalBatches} đợt)` : "";

    // 0. NẾU BẬT CHẾ ĐỘ CLOUD GPU WORKER: Chạy trực tiếp qua GPU Cloud không cần mở tab Chrome AI (0% tải máy cá nhân)
    if (document.getElementById("rpaEnableCloudWorker")?.checked) {
        startCloudWorkerExecution(promptsList, {
            batchSize, enablePrefixHeader, prefixTemplate, specialCode, activeFolderName
        });
        return;
    }

    // 1. NẾU ĐÃ KÍCH HOẠT CHROME EXTENSION: TỰ ĐỘNG CHUYỂN SANG TAB BÊN CẠNH VÀ GÕ
    if (document.documentElement.dataset.tuneTextExtension === "active") {
        if (detectedExtensionVersion && !["1.0.9", "1.1.0", "1.2.0", "1.2.1", "1.2.2"].includes(detectedExtensionVersion)) {
            const modal = document.getElementById("extensionReloadModal");
            if (modal) {
                modal.classList.remove("hidden");
                return;
            } else {
                alert(`⚠️ CẢNH BÁO QUAN TRỌNG:\n\nTiện ích Chrome của bạn đang ở bản cũ v${detectedExtensionVersion} (Bản mới nhất là v1.2.2).\n\n👉 VUI LÒNG LÀM 2 BƯỚC:\n1. Mở tab chrome://extensions bấm nút xoay tròn 🔄 để Tải lại Extension.\n2. F5 lại tab AI mục tiêu và tab này rồi bấm chạy lại!`);
                return;
            }
        }

        const activeItem = (window.rpaFileQueue && window.rpaFileQueue[window.rpaActiveFileIndex]) || null;
        const activeFileName = activeItem ? activeItem.fileName : "prompts.txt";
        const activeFolderName = activeItem ? activeItem.cleanFolderName : "prompts_video";

        // Tự động tạo thư mục video trên backend
        try {
            fetchAPI("/storage/create-video-folder", {
                method: "POST",
                body: JSON.stringify({ folder_name: activeFolderName })
            }).catch(() => {});
        } catch (e) {}

        const bgMsg = stayInBackground ? " (Chạy ngầm - Bạn có thể dùng tab khác)" : "";
        showToast(`🚀 Đang tự động gõ vào tab AI (${loopLabel}${batchDesc})${bgMsg}...`, "info");
        window.dispatchEvent(new CustomEvent("TUNE_TEXT_REQUEST_START", {
            detail: {
                targetUrl: targetUrl,
                prompts: promptsList,
                platformCode: platformCode,
                batchSize: batchSize,
                batch_size: batchSize,
                enablePrefixHeader: enablePrefixHeader,
                prefixTemplate: prefixTemplate,
                specialCode: specialCode,
                fileName: activeFileName,
                folderName: activeFolderName,
                inputSelector: customInput,
                sendSelector: customSend,
                stopSelector: customStop,
                customInput: customInput,
                customSend: customSend,
                customStop: customStop,
                modeChoice: modeChoice,
                loopCount: loopCount,
                loop_count: loopCount,
                isInfiniteLoop: isInfiniteLoop,
                is_infinite: isInfiniteLoop,
                durationMinutes: durationMinutes,
                duration_minutes: durationMinutes,
                delaySeconds: delaySeconds,
                delay_between_prompts: delaySeconds,
                stayInBackground: stayInBackground
            }
        }));

        const statusCard = document.getElementById("rpaStatusCard");
        statusCard.classList.remove("hidden");
        document.getElementById("rpaStatusText").textContent = `Đang gõ tự động trên tab bên cạnh (Cài đặt: ${loopLabel}${batchDesc})...`;
        const totalUnits = (batchSize > 1) ? totalBatches : promptsList.length;
        const unitWord = (batchSize > 1) ? "Lô " : "";
        const initialCountStr = isInfiniteLoop ? `${unitWord}0 / ${totalUnits} (Lượt 1)` : `${unitWord}0 / ${totalUnits} (Lượt 1/${loopCount})`;
        document.getElementById("rpaProgressCount").textContent = initialCountStr;
        document.getElementById("rpaProgressBar").style.width = "0%";

        // Ghi ngay cấu hình đã nhận vào khung Nhật ký hoạt động
        const logsBox = document.getElementById("rpaLogsBox");
        if (logsBox) {
            const initLog = document.createElement("div");
            initLog.className = "text-purple-300 font-medium";
            initLog.textContent = `[${new Date().toLocaleTimeString()}] 🚀 [Cài đặt Robot] Đã kích hoạt: ${loopLabel}${batchDesc} | Nghỉ ${delaySeconds}s mỗi lượt | ${promptsList.length} đoạn văn bản.`;
            logsBox.appendChild(initLog);

            if (enablePrefixHeader) {
                const prefixLog = document.createElement("div");
                prefixLog.className = "text-amber-300 font-medium";
                let previewCmd = prefixTemplate
                    .replace(/{count}/g, batchSize)
                    .replace(/{batch}/g, "1")
                    .replace(/{code}/g, specialCode)
                    .replace(/{folder}/g, activeFolderName)
                    .replace(/\s+/g, " ")
                    .trim();
                if (!previewCmd.endsWith(":")) previewCmd += ":";
                prefixLog.textContent = `[${new Date().toLocaleTimeString()}] 🪄 [Chế độ So le]: Gửi Đoạn văn bản trước ➔ sau đó gửi tiếp Câu lệnh: "${previewCmd}"`;
                logsBox.appendChild(prefixLog);
            }

            const folderLog = document.createElement("div");
            folderLog.className = "text-emerald-400 font-semibold";
            folderLog.textContent = `[${new Date().toLocaleTimeString()}] 📁 [Thư mục Video]: Đã kích hoạt thư mục '${activeFolderName}' (từ tệp '${activeFileName}') | Tên video tải về sẽ đánh số từ: video1, video2, video3...`;
            logsBox.appendChild(folderLog);

            logsBox.scrollTop = logsBox.scrollHeight;
        }
        return;
    }

    // 2. NẾU CHƯA CÀI EXTENSION: Chạy thông qua dịch vụ Robot ngầm
    try {
        const res = await fetchAPI("/rpa/start", {
            method: "POST",
            body: JSON.stringify({
                target_url: targetUrl,
                prompts_text: promptsText,
                split_mode: "paragraph",
                platform_code: platformCode,
                batch_size: batchSize,
                enable_prefix_header: enablePrefixHeader,
                prefix_template: prefixTemplate,
                special_code: specialCode,
                custom_input_selector: customInput,
                custom_send_selector: customSend,
                custom_stop_selector: customStop,
                loop_count: loopCount,
                duration_minutes: durationMinutes,
                delay_between_prompts: delaySeconds
            })
        });

        showToast(res.message, "success");
        document.getElementById("rpaStatusCard").classList.remove("hidden");
        startRPAPolling();
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function stopRPAPrompter() {
    showToast("🛑 Đang dừng Robot ngay lập tức...", "info");
    stopCloudWorkerRequested = true;
    isCloudWorkerRunning = false;

    // 1. Gửi lệnh dừng khẩn cấp tới Chrome Extension (chạy trên tab bên cạnh)
    window.dispatchEvent(new CustomEvent("TUNE_TEXT_REQUEST_STOP"));

    // 2. Gửi lệnh dừng tới backend Selenium (nếu có)
    try {
        await fetchAPI("/rpa/stop", { method: "POST" });
    } catch (err) { }

    // 3. Cập nhật ngay lập tức giao diện người dùng
    if (rpaPollInterval) {
        clearInterval(rpaPollInterval);
        rpaPollInterval = null;
    }

    const statusText = document.getElementById("rpaStatusText");
    if (statusText) {
        statusText.textContent = "🛑 Robot đã dừng hoàn toàn. Bạn có thể bấm khởi chạy lại bất cứ lúc nào.";
    }

    const logsBox = document.getElementById("rpaLogsBox");
    if (logsBox) {
        const stopLog = document.createElement("div");
        stopLog.className = "text-rose-400 font-bold";
        stopLog.textContent = `[${new Date().toLocaleTimeString()}] 🛑 [Đã dừng hoàn toàn]: Bạn đã bấm Dừng Robot thành công. Mọi tiến trình đã ngừng hẳn.`;
        logsBox.appendChild(stopLog);
        logsBox.scrollTop = logsBox.scrollHeight;
    }

    showToast("🛑 Robot đã dừng hoàn toàn!", "success");
}

function startRPAPolling() {
    if (rpaPollInterval) clearInterval(rpaPollInterval);
    rpaPollInterval = setInterval(async () => {
        try {
            const res = await fetchAPI("/rpa/status");
            const data = res.data;

            const progressBar = document.getElementById("rpaProgressBar");
            const statusText = document.getElementById("rpaStatusText");
            const progressCount = document.getElementById("rpaProgressCount");
            const logsBox = document.getElementById("rpaLogsBox");

            statusText.textContent = data.status_message;
            progressCount.textContent = `${data.current_index} / ${data.total_prompts}`;

            const percent = data.total_prompts > 0 ? (data.current_index / data.total_prompts) * 100 : 0;
            progressBar.style.width = `${percent}%`;

            if (data.logs && data.logs.length > 0) {
                logsBox.innerHTML = data.logs.map(l => `<div>${escapeHtml(l)}</div>`).join("");
                logsBox.scrollTop = logsBox.scrollHeight;
            }

            if (!data.is_running && data.total_prompts > 0 && data.current_index >= data.total_prompts) {
                clearInterval(rpaPollInterval);
                showToast("Robot đã hoàn thành toàn bộ các đoạn văn bản!", "success");
            }
        } catch (e) {
            console.error("Lỗi polling RPA:", e);
        }
    }, 1500);
}

// ==============================================================
// PHÂN HỆ QUẢN LÝ CLOUD GPU WORKER (GOOGLE COLAB / RUNPOD / OLLAMA)
// ==============================================================
function toggleCloudWorkerUI() {
    const isEnabled = document.getElementById("rpaEnableCloudWorker").checked;
    const panel = document.getElementById("cloudWorkerPanel");
    if (isEnabled) {
        panel.classList.remove("hidden");
        const savedUrl = localStorage.getItem("tunetext_cloud_worker_url") || "";
        if (savedUrl) {
            document.getElementById("cloudWorkerUrlInput").value = savedUrl;
        }
    } else {
        panel.classList.add("hidden");
    }
}

async function testCloudWorkerConnection() {
    const urlInput = document.getElementById("cloudWorkerUrlInput");
    const workerUrl = (urlInput.value || "").trim();
    if (!workerUrl) {
        showToast("Vui lòng nhập đường dẫn Cloud GPU Worker!", "error");
        return;
    }

    localStorage.setItem("tunetext_cloud_worker_url", workerUrl);
    showToast("⏳ Đang kiểm tra kết nối tới Cloud GPU...", "info");

    const statusBox = document.getElementById("cloudWorkerStatusBox");
    const statusText = document.getElementById("cloudWorkerStatusText");
    const modelBadge = document.getElementById("cloudWorkerModelBadge");

    try {
        const res = await fetchAPI("/rpa/cloud-worker/test", {
            method: "POST",
            body: JSON.stringify({ worker_url: workerUrl })
        });

        const data = res.data || {};
        statusBox.classList.remove("hidden");

        if (data.online) {
            const modelNames = (data.models && data.models.length > 0) ? data.models.join(", ") : "Ollama Engine Ready";
            statusText.innerHTML = `🟢 <strong>Online</strong> - ${data.message}`;
            statusText.className = "text-emerald-400";
            modelBadge.textContent = modelNames;
            showToast("Kết nối Cloud GPU Worker thành công!", "success");
        } else {
            statusText.innerHTML = `🔴 <strong>Offline</strong> - ${data.message || "Không thể kết nối"}`;
            statusText.className = "text-rose-400";
            modelBadge.textContent = "Chưa kết nối";
            showToast("Không thể kết nối tới Cloud Worker!", "error");
        }
    } catch (err) {
        statusBox.classList.remove("hidden");
        statusText.innerHTML = `🔴 <strong>Lỗi kết nối</strong>: ${err.message}`;
        statusText.className = "text-rose-400";
        showToast("Lỗi: " + err.message, "error");
    }
}

// Chạy toàn bộ tiến trình qua Cloud GPU Worker (Colab / RunPod / Ollama)
let isCloudWorkerRunning = false;
let stopCloudWorkerRequested = false;

async function startCloudWorkerExecution(promptsList, options) {
    const workerUrl = (document.getElementById("cloudWorkerUrlInput")?.value || localStorage.getItem("tunetext_cloud_worker_url") || "").trim();
    if (!workerUrl) {
        showToast("Vui lòng nhập đường dẫn Cloud GPU Worker trước khi chạy!", "error");
        return;
    }

    isCloudWorkerRunning = true;
    stopCloudWorkerRequested = false;

    const statusCard = document.getElementById("rpaStatusCard");
    statusCard.classList.remove("hidden");
    document.getElementById("rpaStatusText").textContent = `Đang xử lý qua Cloud GPU Worker (${workerUrl})...`;

    const logsBox = document.getElementById("rpaLogsBox");
    const initLog = document.createElement("div");
    initLog.className = "text-indigo-400 font-bold";
    initLog.textContent = `[${new Date().toLocaleTimeString()}] ⚡ [Cloud GPU Worker]: Đã kết nối GPU Cloud (${workerUrl}) | Xử lý ${promptsList.length} đoạn văn bản.`;
    logsBox.appendChild(initLog);

    for (let i = 0; i < promptsList.length; i++) {
        if (stopCloudWorkerRequested) {
            const stopLog = document.createElement("div");
            stopLog.className = "text-rose-400 font-bold";
            stopLog.textContent = `[${new Date().toLocaleTimeString()}] 🛑 Đã dừng xử lý Cloud Worker.`;
            logsBox.appendChild(stopLog);
            break;
        }

        const currentPrompt = promptsList[i];
        const progressStr = `Đoạn ${i + 1}/${promptsList.length}`;

        document.getElementById("rpaProgressCount").textContent = `${i + 1} / ${promptsList.length}`;
        const pct = Math.round(((i + 1) / promptsList.length) * 100);
        document.getElementById("rpaProgressBar").style.width = `${pct}%`;

        const stepLog = document.createElement("div");
        stepLog.className = "text-slate-300";
        stepLog.textContent = `[${new Date().toLocaleTimeString()}] ⏳ [Cloud GPU] Đang xử lý ${progressStr}: "${currentPrompt.substring(0, 45)}..."`;
        logsBox.appendChild(stepLog);
        logsBox.scrollTop = logsBox.scrollHeight;

        try {
            const res = await fetchAPI("/rpa/cloud-worker/generate", {
                method: "POST",
                body: JSON.stringify({
                    worker_url: workerUrl,
                    prompt: currentPrompt
                })
            });

            const reply = res.data?.response || "";
            const doneLog = document.createElement("div");
            doneLog.className = "text-emerald-400 font-medium";
            doneLog.textContent = `[${new Date().toLocaleTimeString()}] ✅ [Cloud GPU] Hoàn tất ${progressStr}: "${reply.substring(0, 50)}..."`;
            logsBox.appendChild(doneLog);
            logsBox.scrollTop = logsBox.scrollHeight;
        } catch (err) {
            const errLog = document.createElement("div");
            errLog.className = "text-rose-400";
            errLog.textContent = `[${new Date().toLocaleTimeString()}] ❌ Lỗi ${progressStr}: ${err.message}`;
            logsBox.appendChild(errLog);
        }
    }

    isCloudWorkerRunning = false;
    showToast("⚡ Xử lý qua Cloud GPU Worker hoàn tất!", "success");
}

// ==============================================================
// PHẦN 3: AI STUDIO NỘI BỘ (TỰ TẠO ẢNH & VIDEO TRỰC TIẾP TỪ CLOUD GPU)
// ==============================================================

let studioPollTimer = null;
let isStudioRunning = false;

function requestColabUrlFromExtension() {
    showToast("Đang quét tìm link từ tab Google Colab...", "info");
    window.dispatchEvent(new CustomEvent("TUNE_TEXT_REQUEST_COLAB_URL"));
}

// Tự động nhận diện và nạp URL từ Colab thông qua Chrome Extension (Không cần dán tay)
window.addEventListener("TUNE_TEXT_AUTO_FILL_STUDIO_URL", (e) => {
    const url = e.detail?.url;
    const notFound = e.detail?.notFound;
    const input = document.getElementById("studioWorkerUrlInput");

    if (url && input) {
        const isNew = (input.value !== url);
        input.value = url;
        localStorage.setItem("tunetext_studio_worker_url", url);
        localStorage.setItem("tunetext_cloud_worker_url", url);
        if (isNew) {
            showToast("⚡ Đã tự động nhận diện và nạp link GPU từ Colab!", "success");
            testStudioWorkerConnection();
        }
    } else if (notFound) {
        showToast("Chưa thấy link trên Colab. Hãy chắc chắn Colab đã chạy xong ô cuối!", "warning");
    }
});

function initStudioUI() {
    // Khôi phục URL worker đã lưu
    const savedUrl = localStorage.getItem("tunetext_studio_worker_url") || localStorage.getItem("tunetext_cloud_worker_url") || "";
    const input = document.getElementById("studioWorkerUrlInput");
    if (input && !input.value) {
        input.value = savedUrl;
    }

    // Tự động yêu cầu tiện ích quét URL từ Colab nếu có tab đang mở
    window.dispatchEvent(new CustomEvent("TUNE_TEXT_REQUEST_COLAB_URL"));

    const textarea = document.getElementById("studioPromptsText");
    if (textarea && !textarea.dataset.listenerAttached) {
        textarea.dataset.listenerAttached = "true";
        textarea.addEventListener("input", updateStudioPromptsCount);
    }
    updateStudioPromptsCount();
}

function updateStudioPromptsCount() {
    const textarea = document.getElementById("studioPromptsText");
    const badge = document.getElementById("studioPromptsCountBadge");
    if (!textarea || !badge) return;

    const text = textarea.value.trim();
    if (!text) {
        badge.textContent = "0 đoạn";
        return;
    }

    const chunks = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    badge.textContent = `${chunks.length} đoạn`;
}

function clearStudioPrompts() {
    const textarea = document.getElementById("studioPromptsText");
    if (textarea) {
        textarea.value = "";
        updateStudioPromptsCount();
    }
}

function syncPromptsFromRPA() {
    const rpaTextarea = document.getElementById("rpaPromptsText");
    const studioTextarea = document.getElementById("studioPromptsText");
    if (!rpaTextarea || !studioTextarea) return;

    const rpaText = rpaTextarea.value.trim();
    if (!rpaText) {
        showToast("Tab Robot RPA hiện chưa có đoạn prompt nào để sao chép!", "info");
        return;
    }

    studioTextarea.value = rpaText;
    updateStudioPromptsCount();
    showToast("Đã đồng bộ toàn bộ danh sách prompt từ Tab RPA sang AI Studio thành công!", "success");
}

async function handleStudioPromptFileSelect(input) {
    if (!input.files || input.files.length === 0) return;
    const files = Array.from(input.files);
    const textarea = document.getElementById("studioPromptsText");
    let combined = [];

    // Tự động gán tên folder theo tệp đầu tiên
    const firstFileName = files[0].name.replace(/\.[^/.]+$/, "");
    const folderInput = document.getElementById("studioFolderName");
    if (folderInput) {
        folderInput.value = firstFileName.replace(/[\\/*?:"<>|]/g, "_").trim();
    }

    for (const file of files) {
        try {
            const ext = file.name.split('.').pop().toLowerCase();
            let text = "";
            if (ext === "txt") {
                text = await file.text();
            } else {
                // Sử dụng API parse file có sẵn của hệ thống
                const formData = new FormData();
                formData.append("file", file);
                const res = await fetch(`${API_BASE}/extract-text`, {
                    method: "POST",
                    body: formData
                });
                const json = await res.json();
                text = json.data?.text || "";
            }
            if (text.trim()) combined.push(text.trim());
        } catch (e) {
            console.error("Lỗi đọc file:", e);
        }
    }

    if (combined.length > 0) {
        textarea.value = combined.join("\n\n");
        updateStudioPromptsCount();
        showToast(`Đã nạp thành công ${files.length} tệp prompt vào AI Studio!`, "success");
    }
}

async function testStudioWorkerConnection() {
    const input = document.getElementById("studioWorkerUrlInput");
    const workerUrl = (input?.value || "").trim();

    if (!workerUrl) {
        showToast("Vui lòng nhập đường dẫn Cloud GPU Worker trước!", "error");
        return;
    }

    const card = document.getElementById("studioWorkerStatusCard");
    const dot = document.getElementById("studioWorkerStatusDot");
    const msg = document.getElementById("studioWorkerStatusMsg");
    const badge = document.getElementById("studioWorkerHardwareBadge");

    card.classList.remove("hidden");
    dot.className = "w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse";
    msg.textContent = "Đang kết nối tới Cloud GPU Worker...";
    badge.textContent = "Kiểm tra...";

    try {
        const res = await fetchAPI("/rpa/ai-studio/test", {
            method: "POST",
            body: JSON.stringify({ worker_url: workerUrl })
        });

        const data = res.data || {};
        if (data.connected) {
            dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-400";
            msg.textContent = data.message || "Kết nối GPU thành công!";
            badge.textContent = data.gpu || "GPU Sẵn Sàng";
            localStorage.setItem("tunetext_studio_worker_url", workerUrl);
            localStorage.setItem("tunetext_cloud_worker_url", workerUrl);
            showToast("Kết nối Cloud GPU Worker thành công!", "success");
        } else {
            dot.className = "w-2.5 h-2.5 rounded-full bg-rose-500";
            msg.textContent = data.message || "Không thể kết nối.";
            badge.textContent = "Mất kết nối";
            showToast(data.message || "Lỗi kết nối", "error");
        }
    } catch (err) {
        dot.className = "w-2.5 h-2.5 rounded-full bg-rose-500";
        msg.textContent = `Lỗi: ${err.message}`;
        badge.textContent = "Lỗi";
        showToast(`Lỗi kiểm tra worker: ${err.message}`, "error");
    }
}

async function startStudioBatch() {
    if (!state.token) {
        openAuthModal();
        showToast("Vui lòng đăng nhập trước khi chạy AI Studio!", "info");
        return;
    }

    const workerUrl = (document.getElementById("studioWorkerUrlInput")?.value || "").trim();
    if (!workerUrl) {
        showToast("Vui lòng nhập đường dẫn Cloud GPU Worker trước!", "error");
        return;
    }

    const text = document.getElementById("studioPromptsText")?.value.trim() || "";
    if (!text) {
        showToast("Vui lòng nhập hoặc nạp danh sách prompt trước khi khởi chạy!", "error");
        return;
    }

    const prompts = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    if (prompts.length === 0) {
        showToast("Chưa có đoạn prompt hợp lệ nào!", "error");
        return;
    }

    const pipelineMode = document.getElementById("studioPipelineMode")?.value || "pipeline";
    const aspectRatio = document.getElementById("studioAspectRatio")?.value || "16:9";
    const folderName = document.getElementById("studioFolderName")?.value.trim() || "prompts_video";

    try {
        const res = await fetchAPI("/rpa/ai-studio/batch/start", {
            method: "POST",
            body: JSON.stringify({
                worker_url: workerUrl,
                prompts: prompts,
                folder_name: folderName,
                generate_video: (pipelineMode === "pipeline"),
                aspect_ratio: aspectRatio
            })
        });

        isStudioRunning = true;
        showToast(`Đã bắt đầu tiến trình AI Studio cho ${prompts.length} đoạn văn bản!`, "success");

        // Hiển thị khung tiến độ
        const statusCard = document.getElementById("studioStatusCard");
        statusCard.classList.remove("hidden");
        document.getElementById("studioStatusText").textContent = `Đang bắt đầu tạo media...`;
        document.getElementById("studioProgressCount").textContent = `0 / ${prompts.length}`;
        document.getElementById("studioProgressBar").style.width = "0%";

        // Bắt đầu lắng nghe trạng thái định kỳ
        if (studioPollTimer) clearInterval(studioPollTimer);
        studioPollTimer = setInterval(pollStudioStatus, 1500);

    } catch (err) {
        showToast(`Không thể khởi chạy: ${err.message}`, "error");
    }
}

async function pollStudioStatus() {
    try {
        const res = await fetch(`${API_BASE}/rpa/ai-studio/batch/status`);
        const json = await res.json();
        const data = json.data || {};

        const total = data.total_prompts || 1;
        const current = data.current_index || 0;
        const pct = Math.round((current / total) * 100);

        document.getElementById("studioProgressCount").textContent = `${current} / ${total}`;
        document.getElementById("studioProgressBar").style.width = `${pct}%`;

        // Cập nhật trạng thái chữ
        const statusText = document.getElementById("studioStatusText");
        if (data.current_step === "generating_image") {
            statusText.textContent = `[Đoạn ${current}/${total}] 🎨 Đang vẽ hình ảnh 8K qua Cloud GPU...`;
        } else if (data.current_step === "generating_video") {
            statusText.textContent = `[Đoạn ${current}/${total}] 🎬 Đang kết xuất video chuyển động MP4...`;
        } else if (data.current_step === "completed") {
            statusText.textContent = `🏆 Đã hoàn thành toàn bộ ${total} đoạn văn bản!`;
        } else if (data.current_step === "error") {
            statusText.textContent = `❌ Lỗi tiến trình: ${data.error_message || 'Không rõ'}`;
        }

        // Cập nhật xem trước ảnh trực tiếp
        if (data.current_image_url) {
            const imgEl = document.getElementById("studioLiveImagePreview");
            const imgHolder = document.getElementById("studioLiveImagePlaceholder");
            const imgBadge = document.getElementById("studioLiveImageBadge");
            if (imgEl && imgEl.src !== window.location.origin + data.current_image_url) {
                imgEl.src = data.current_image_url;
                imgEl.classList.remove("hidden");
                imgHolder?.classList.add("hidden");
                if (imgBadge) imgBadge.textContent = `Đoạn ${current}`;
            }
        }

        // Cập nhật xem trước video trực tiếp
        if (data.current_video_url) {
            const vidEl = document.getElementById("studioLiveVideoPreview");
            const vidHolder = document.getElementById("studioLiveVideoPlaceholder");
            const vidBadge = document.getElementById("studioLiveVideoBadge");
            if (vidEl && vidEl.src !== window.location.origin + data.current_video_url) {
                vidEl.src = data.current_video_url;
                vidEl.classList.remove("hidden");
                vidHolder?.classList.add("hidden");
                vidEl.play().catch(() => {});
                if (vidBadge) vidBadge.textContent = `Đoạn ${current}`;
            }
        }

        // Cập nhật hộp nhật ký
        const logsBox = document.getElementById("studioLogsBox");
        if (logsBox && data.logs && data.logs.length > 0) {
            logsBox.innerHTML = "";
            data.logs.forEach(l => {
                const row = document.createElement("div");
                row.className = l.includes("✅") || l.includes("🎉") ? "text-emerald-400 font-medium" :
                                l.includes("❌") || l.includes("💥") ? "text-rose-400" :
                                l.includes("🎨") || l.includes("🎬") ? "text-amber-300" : "text-slate-300";
                row.textContent = l;
                logsBox.appendChild(row);
            });
            logsBox.scrollTop = logsBox.scrollHeight;
        }

        // Nếu tiến trình đã kết thúc
        if (!data.is_running) {
            isStudioRunning = false;
            clearInterval(studioPollTimer);
            studioPollTimer = null;
            if (data.current_step === "completed") {
                showToast("🏆 AI Studio đã hoàn thành toàn bộ hình ảnh và video!", "success");
                loadStudioGallery();
            }
        }

    } catch (e) {
        console.warn("Lỗi cập nhật trạng thái studio:", e);
    }
}

async function stopStudioBatch() {
    try {
        const res = await fetchAPI("/rpa/ai-studio/batch/stop", { method: "POST" });
        showToast(res.message || "Đã gửi tín hiệu dừng AI Studio.", "info");
    } catch (err) {
        showToast(`Lỗi dừng tiến trình: ${err.message}`, "error");
    }
}

async function loadStudioGallery() {
    const folderName = document.getElementById("studioFolderName")?.value.trim() || "prompts_video";
    const container = document.getElementById("studioGalleryContainer");
    const grid = document.getElementById("studioGalleryGrid");
    const countEl = document.getElementById("studioGalleryCount");
    const badge = document.getElementById("studioGalleryFolderBadge");

    try {
        const res = await fetch(`${API_BASE}/rpa/ai-studio/gallery?folder_name=${encodeURIComponent(folderName)}`);
        const json = await res.json();
        const data = json.data || {};
        const items = data.items || [];

        container.classList.remove("hidden");
        badge.textContent = `Thư mục: ${folderName}`;
        countEl.textContent = items.length;
        grid.innerHTML = "";

        if (items.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full py-8 text-center text-slate-500 text-xs">
                    <i class="fa-regular fa-folder-open text-3xl mb-2 block"></i>
                    Thư mục '${folderName}' chưa có ảnh hoặc video nào. Hãy bấm 'Khởi Chạy AI Studio' để bắt đầu tạo!
                </div>
            `;
            return;
        }

        items.forEach(item => {
            const card = document.createElement("div");
            card.className = "p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-amber-500/40 transition";

            let mediaPreview = "";
            if (item.video) {
                mediaPreview = `
                    <div class="aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                        <video src="${item.video.url}" controls class="w-full h-full object-cover"></video>
                    </div>
                `;
            } else if (item.image) {
                mediaPreview = `
                    <div class="aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                        <img src="${item.image.url}" alt="${item.image.filename}" class="w-full h-full object-cover">
                    </div>
                `;
            }

            let downloadButtons = "";
            if (item.video) {
                downloadButtons += `
                    <a href="${item.video.url}" download="${item.video.filename}"
                        class="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-semibold text-center flex items-center justify-center gap-1 transition">
                        <i class="fa-solid fa-download"></i> Tải Video (.mp4)
                    </a>
                `;
            }
            if (item.image) {
                downloadButtons += `
                    <a href="${item.image.url}" download="${item.image.filename}"
                        class="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold text-center flex items-center justify-center gap-1 transition">
                        <i class="fa-solid fa-image"></i> Ảnh gốc
                    </a>
                `;
            }

            card.innerHTML = `
                ${mediaPreview}
                <div class="flex items-center justify-between text-xs">
                    <span class="font-bold text-white flex items-center gap-1.5">
                        <i class="fa-solid fa-film text-amber-400"></i> Mục #${item.index}
                    </span>
                    <span class="text-[10px] text-slate-500 font-mono">${item.video ? item.video.size_mb + ' MB' : (item.image ? item.image.size_mb + ' MB' : '')}</span>
                </div>
                <div class="flex items-center gap-2 pt-1">
                    ${downloadButtons}
                </div>
            `;
            grid.appendChild(card);
        });

    } catch (e) {
        console.error("Lỗi tải gallery:", e);
    }
}

