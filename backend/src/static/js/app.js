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
    const email = "admin12345";
    const password = "admin12345";
    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const json = await res.json();
        if (json.success) {
            saveAuthSession(json.data.access_token, json.data.refresh_token, json.data.user);
            showToast("👑 Đã đăng nhập tài khoản VIP admin12345! Token vô hạn (100 năm)!", "success");
            closeAuthModal();
            return;
        }
        showToast("Lỗi đăng nhập: " + (json.error?.message || "Không xác định"), "error");
    } catch (err) {
        showToast("Lỗi kết nối: " + err.message, "error");
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
            healthBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> <span class="text-xs text-emerald-400 font-medium">PostgreSQL: 170106 OK</span>`;
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
    const sectionTuner = document.getElementById("sectionTuner");
    const sectionRPA = document.getElementById("sectionRPA");

    if (tab === "tuner") {
        sectionTuner.classList.remove("hidden");
        sectionRPA.classList.add("hidden");
        tabTuner.className = "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 transition";
        tabRPA.className = "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-slate-800/80 hover:bg-slate-800 text-slate-300 transition";
    } else {
        sectionTuner.classList.add("hidden");
        sectionRPA.classList.remove("hidden");
        tabRPA.className = "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20 transition";
        tabTuner.className = "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-slate-800/80 hover:bg-slate-800 text-slate-300 transition";
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

// Tiếp nhận tệp chọn từ thẻ input
function handleRPAPromptFileSelect(input) {
    if (input.files && input.files[0]) {
        handleRPAPromptFileUpload(input.files[0]);
        input.value = ""; // Reset input để có thể chọn lại cùng 1 file
    }
}

// Trích xuất tệp tải lên (.docx, .pdf, .txt) và tự động phân tách mỗi đoạn cách nhau 1 dòng trống
async function handleRPAPromptFileUpload(file) {
    if (!file) return;
    const nameLower = file.name.toLowerCase();
    const validExts = [".docx", ".pdf", ".txt"];
    if (!validExts.some(ext => nameLower.endsWith(ext))) {
        showToast("Vui lòng chọn tệp Word (.docx), PDF (.pdf) hoặc Text (.txt)!", "error");
        return;
    }

    const textarea = document.getElementById("rpaPromptsText");
    showToast(`Đang trích xuất nội dung từ '${file.name}'...`, "info");

    // Nếu là file .txt đơn giản, đọc ngay trên client không cần qua server
    if (nameLower.endsWith(".txt")) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const rawText = e.target.result;
            const paragraphs = rawText.split(/\n\s*\n+/).map(p => p.trim()).filter(p => p.length > 0);
            textarea.value = paragraphs.join("\n\n");
            updateRPAPromptsCount();
            showToast(`🎉 Đã nạp thành công ${paragraphs.length} đoạn từ tệp '${file.name}'!`, "success");
        };
        reader.readAsText(file, "UTF-8");
        return;
    }

    // Với file .docx hoặc .pdf, gửi lên backend trích xuất
    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await fetchAPI("/tuning/extract-file", {
            method: "POST",
            body: formData
        });
        const extractedText = res.data?.extracted_text || "";
        const paragraphs = extractedText.split(/\n\s*\n+/).map(p => p.trim()).filter(p => p.length > 0);
        textarea.value = paragraphs.join("\n\n");
        updateRPAPromptsCount();
        showToast(`🎉 Đã nạp thành công ${paragraphs.length} đoạn từ tệp '${file.name}' (mỗi đoạn cách nhau 1 dòng trống)!`, "success");
    } catch (err) {
        showToast("Lỗi trích xuất tệp: " + err.message, "error");
    }
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
            handleRPAPromptFileUpload(files[0]);
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

    console.log("[Tune-Text] Cài đặt khởi chạy Robot:", { modeChoice, loopCount, isInfiniteLoop, durationMinutes, delaySeconds, stayInBackground, batchSize });

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

    // 1. NẾU ĐÃ KÍCH HOẠT CHROME EXTENSION: TỰ ĐỘNG CHUYỂN SANG TAB BÊN CẠNH VÀ GÕ
    if (document.documentElement.dataset.tuneTextExtension === "active") {
        if (detectedExtensionVersion && !["1.0.9", "1.1.0"].includes(detectedExtensionVersion)) {
            const modal = document.getElementById("extensionReloadModal");
            if (modal) {
                modal.classList.remove("hidden");
                return;
            } else {
                alert(`⚠️ CẢNH BÁO QUAN TRỌNG:\n\nTiện ích Chrome của bạn đang ở bản cũ v${detectedExtensionVersion} (Bản mới nhất là v1.1.0).\n\n👉 VUI LÒNG LÀM 2 BƯỚC:\n1. Mở tab chrome://extensions bấm nút xoay tròn 🔄 để Tải lại Extension.\n2. F5 lại tab AI mục tiêu và tab này rồi bấm chạy lại!`);
                return;
            }
        }

        const bgMsg = stayInBackground ? " (Chạy ngầm - Bạn có thể dùng tab khác)" : "";
        showToast(`🚀 Đang tự động gõ vào tab AI (${loopLabel}${batchDesc})${bgMsg}...`, "info");
        window.dispatchEvent(new CustomEvent("TUNE_TEXT_REQUEST_START", {
            detail: {
                targetUrl: targetUrl,
                prompts: promptsList,
                platformCode: platformCode,
                batchSize: batchSize,
                batch_size: batchSize,
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
    try {
        await fetchAPI("/rpa/stop", { method: "POST" });
        showToast("Đã gửi yêu cầu dừng Robot.", "info");
    } catch (err) {
        showToast(err.message, "error");
    }
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
