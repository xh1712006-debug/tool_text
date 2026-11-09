// Content Script chạy trực tiếp trên ChatGPT, Claude, Gemini... (Hỗ trợ 100% chạy ngầm / Background Tab)
(() => {
  // Tuyệt đối không nạp vào chính trang Tune-Text Platform (Bất kể chạy localhost hay domain/tunnel riêng)
  if (
    document.querySelector('meta[name="tune-text-app"]') ||
    document.querySelector('meta[name="application-name"][content="Tune-Text Platform"]') ||
    (document.title && document.title.includes("Tune-Text Platform")) ||
    document.getElementById("tabMainTuner")
  ) {
    return;
  }

  console.log("[Tune-Text AI Prompter] Content Script đã nạp vào tab AI (Chế độ chạy ngầm kích hoạt)!");

  // TỰ ĐỘNG BẮT LINK CLOUDFLARE TRÊN GOOGLE COLAB VÀ ĐỒNG BỘ VỀ TUNE-TEXT (KHÔNG CẦN DÁN TAY)
  function findCloudflareUrlInDom(root = document) {
    try {
      const bodyText = root.body ? (root.body.innerText || "") : (root.textContent || "");
      const match = bodyText.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match) return match[0];

      const elements = root.querySelectorAll ? root.querySelectorAll("pre, code, a, div.output_text, colab-terminal-output, span") : [];
      for (const el of elements) {
        const txt = el.textContent || "";
        const m = txt.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (m) return m[0];
      }

      const iframes = root.querySelectorAll ? root.querySelectorAll("iframe") : [];
      for (const ifr of iframes) {
        try {
          const doc = ifr.contentDocument || ifr.contentWindow?.document;
          if (doc) {
            const nested = findCloudflareUrlInDom(doc);
            if (nested) return nested;
          }
        } catch (e) {}
      }

      const all = root.querySelectorAll ? root.querySelectorAll("*") : [];
      for (const el of all) {
        if (el.shadowRoot) {
          const nested = findCloudflareUrlInDom(el.shadowRoot);
          if (nested) return nested;
        }
      }
    } catch (e) {}
    return null;
  }

  if (window.location.hostname.includes("colab.research.google.com")) {
    let lastSyncedUrl = "";
    
    function scanAndSyncColabUrl() {
      const foundUrl = findCloudflareUrlInDom(document);
      if (foundUrl && foundUrl !== lastSyncedUrl) {
        lastSyncedUrl = foundUrl;
        console.log("[Tune-Text Colab Auto-Sync] Phát hiện URL Cloudflare mới:", lastSyncedUrl);
        chrome.runtime.sendMessage({
          action: "SYNC_STUDIO_URL",
          url: lastSyncedUrl
        }, () => { if (chrome.runtime.lastError) {} });
      }
      return foundUrl;
    }

    setInterval(scanAndSyncColabUrl, 2000);

    // Lắng nghe khi Tune-Text yêu cầu quét tab Colab
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.action === "QUERY_COLAB_URL") {
        const currentUrl = scanAndSyncColabUrl();
        sendResponse({ url: currentUrl });
        return true;
      }
    });
  }

  // Dừng bất kỳ tiến trình cũ nào nếu có
  if (window.__tuneTextStopPrevious) {
    try { window.__tuneTextStopPrevious(); } catch (e) { }
  }
  let isAutomationRunning = false;
  let stopRequested = false;
  window.__tuneTextStopPrevious = () => { stopRequested = true; isAutomationRunning = false; };

  // 1. Tạo thanh thông báo trực quan (Floating HUD) trên tab AI
  function createOrGetHUD() {
    let hud = document.getElementById("tune-text-hud");
    if (!hud) {
      hud = document.createElement("div");
      hud.id = "tune-text-hud";
      hud.innerHTML = `
        <div class="tt-hud-header">
          <div class="tt-hud-title">
            <span class="tt-pulse"></span>
            <strong>Tune-Text Robot (Chạy Ngầm)</strong>
          </div>
          <button id="tt-hud-close" title="Dừng Robot">&times;</button>
        </div>
        <div class="tt-hud-body">
          <div id="tt-hud-status">Đang chuẩn bị...</div>
          <div class="tt-progress-bar-bg">
            <div id="tt-progress-bar-fill"></div>
          </div>
          <div class="tt-hud-counter" id="tt-hud-counter">0 / 0</div>
          <div class="tt-hud-preview" id="tt-hud-preview"></div>
        </div>
      `;
      document.body.appendChild(hud);

      document.getElementById("tt-hud-close").addEventListener("click", () => {
        stopRequested = true;
        isAutomationRunning = false;
        updateHUD("Đã yêu cầu dừng Robot!", 0, 0, "", true);
      });
    }
    hud.style.display = "block";
    return hud;
  }

  function updateHUD(status, current, total, previewText = "", isError = false, currentLoop = 1, loopCount = 1, batchLabel = "") {
    createOrGetHUD();
    const statusEl = document.getElementById("tt-hud-status");
    const counterEl = document.getElementById("tt-hud-counter");
    const fillEl = document.getElementById("tt-progress-bar-fill");
    const previewEl = document.getElementById("tt-hud-preview");

    if (statusEl) statusEl.textContent = status;
    if (statusEl) statusEl.style.color = isError ? "#f87171" : "#38bdf8";

    if (counterEl) {
      const unitLabel = batchLabel ? `Lô ${current}/${total} (${batchLabel})` : `${current} / ${total}`;
      if (loopCount > 1 && loopCount < 999999) {
        counterEl.textContent = `Lượt ${currentLoop}/${loopCount} • ${unitLabel}`;
      } else if (loopCount >= 999999) {
        counterEl.textContent = `Lượt ${currentLoop} (Vô hạn) • ${unitLabel}`;
      } else {
        counterEl.textContent = unitLabel;
      }
    }
    if (fillEl && total > 0) {
      const pct = Math.round((current / total) * 100);
      fillEl.style.width = `${pct}%`;
    }
    if (previewEl && previewText) {
      previewEl.textContent = `Nội dung: "${previewText.substring(0, 80)}${previewText.length > 80 ? '...' : ''}"`;
    }
  }

  // 2. Tìm ô nhập văn bản theo ngữ nghĩa (Hỗ trợ 100% Muse.ai, Meta Lexical, Claude, Gemini, ChatGPT, DeepSeek, Poe, Perplexity...)
  function findAIInputBox(customSelector = "") {
    if (customSelector && typeof customSelector === "string") {
      try {
        const customEl = document.querySelector(customSelector.trim());
        if (customEl && !customEl.disabled) return customEl;
      } catch (e) { }
    }

    // Nếu người dùng đã click chuột sẵn vào ô nhập liệu
    if (document.activeElement && (
      document.activeElement.tagName === "TEXTAREA" ||
      document.activeElement.tagName === "INPUT" ||
      document.activeElement.isContentEditable ||
      document.activeElement.getAttribute("role") === "textbox"
    )) {
      return document.activeElement;
    }

    const selectors = [
      "#prompt-textarea",
      "div#prompt-textarea",
      "div[contenteditable='true'][data-lexical-editor='true']",
      "div[data-lexical-editor='true']",
      "div[contenteditable='true'][data-placeholder]",
      "div[contenteditable='true'].ProseMirror",
      "div.ProseMirror[contenteditable='true']",
      "rich-textarea div[contenteditable='true']",
      "div[role='textbox'][contenteditable='true']",
      "div[role='textbox']",
      "div[contenteditable='true']",
      "textarea#chat-input",
      "textarea[data-id]",
      "textarea[placeholder*='prompt' i]",
      "input[placeholder*='prompt' i]",
      "textarea[placeholder*='describe' i]",
      "input[placeholder*='describe' i]",
      "textarea[placeholder*='message' i]",
      "input[placeholder*='message' i]",
      "textarea[placeholder*='nhắn' i]",
      "textarea[placeholder*='Hỏi' i]",
      "textarea[placeholder*='Ask' i]",
      "textarea[placeholder*='chat' i]",
      "div.ql-editor",
      "textarea:not([disabled])",
      "input[type='text']:not([disabled])"
    ];

    for (const s of selectors) {
      try {
        const elements = document.querySelectorAll(s);
        for (const el of elements) {
          if (!el.disabled && el.offsetParent !== null) {
            return el;
          }
        }
      } catch (e) { }
    }
    return null;
  }

  // 3. Tìm nút Gửi (Send Button) (Hỗ trợ cả tab ngầm và đa nền tảng)
  function findSendButton(customSelector = "") {
    if (customSelector && typeof customSelector === "string") {
      try {
        const customBtn = document.querySelector(customSelector.trim());
        if (customBtn) return customBtn;
      } catch (e) { }
    }

    const selectors = [
      "button[data-testid='send-button']",
      "button[data-testid='fruitjuice-send-button']",
      "button[aria-label*='Send' i]",
      "button[aria-label*='Gửi' i]",
      "button[aria-label*='Submit' i]",
      "button[aria-label*='prompt' i]",
      "button[data-testid*='send' i]",
      "button.send-button",
      "button.ds-icon-button",
      "div[role='button'][aria-label*='Send' i]",
      "button[type='submit']"
    ];

    for (const s of selectors) {
      try {
        const elements = document.querySelectorAll(s);
        for (const btn of elements) {
          if (btn && btn.offsetParent !== null) {
            return btn;
          }
        }
      } catch (e) { }
    }
    return null;
  }

  // 4. Tìm nút Dừng (Stop button hoặc streaming indicator)
  function findStopButton(customSelector = "") {
    if (customSelector && typeof customSelector === "string") {
      try {
        const customBtn = document.querySelector(customSelector.trim());
        if (customBtn && customBtn.offsetParent !== null) return customBtn;
      } catch (e) { }
    }

    const selectors = [
      "button[data-testid='stop-button']:not([disabled])",
      "button[aria-label='Stop generating']:not([disabled])",
      "button[aria-label='Stop streaming']:not([disabled])",
      ".result-streaming",
      ".ds-button--stop"
    ];

    for (const s of selectors) {
      try {
        const btn = document.querySelector(s);
        if (btn && btn.offsetParent !== null) {
          return btn;
        }
      } catch (e) { }
    }
    return null;
  }

  // 4b. Kiểm tra một phần tử có đang hiển thị thực sự trên màn hình không (chuẩn HTML5 + SVG + Flex/Grid)
  function isElementVisible(el) {
    if (!el) return false;
    try {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
        return false;
      }
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    } catch (e) {
      return el.offsetParent !== null;
    }
  }

  // 4c. Phân biệt phần tử thuộc CỘT THƯ VIỆN MEDIA BÊN PHẢI (Loại bỏ 100% cột chat bên trái và HUD)
  function isRightSideMediaElement(el) {
    if (!el || !isElementVisible(el)) return false;
    if (el.closest && el.closest("#tune-text-hud")) return false;

    // Loại trừ tuyệt đối các phần tử nằm trong cột chat / hội thoại tin nhắn bên trái
    if (el.closest && el.closest("[class*='chat' i], [class*='message' i], [class*='conversation' i], [class*='thread' i], [class*='dialog' i]")) {
      return false;
    }

    // Loại trừ ô nhập prompt và các nút chat bên trái
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.isContentEditable || el.getAttribute("role") === "textbox") {
      return false;
    }

    // Xác định ranh giới cột chat bên trái dựa theo ô nhập chat hoặc tỷ lệ màn hình
    let splitX = window.innerWidth * 0.28;
    try {
      const inputBox = findAIInputBox();
      if (inputBox) {
        const rectBox = inputBox.getBoundingClientRect();
        if (rectBox.right > 0 && rectBox.right < window.innerWidth * 0.6) {
          splitX = rectBox.right;
        }
      }
    } catch (e) { }

    const rect = el.getBoundingClientRect();
    return rect.left >= (splitX - 15);
  }

  // 4d. Tự động chuyển đổi giữa tab "Hình ảnh" và "Video" trên giao diện Muse.ai
  async function switchMediaTab(tabType) {
    // tabType: "Hình ảnh" hoặc "Video" (hoặc "images" / "video")
    const isImage = (tabType === "Hình ảnh" || tabType === "images" || tabType === "image");
    const targetParam = isImage ? "view=images" : "view=video";
    const targetLabel = isImage ? "Hình ảnh" : "Video";

    console.log(`[Tune-Text] Chuyển tab thư viện sang: '${targetLabel}' (${targetParam})...`);

    // 1. Kiểm tra xem URL hiện tại đã ở đúng tab chưa
    try {
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.get("view") === (isImage ? "images" : "video")) {
        console.log(`[Tune-Text] Đang ở sẵn tab '${targetLabel}'.`);
        return true;
      }
    } catch (e) { }

    // 2. Tìm thẻ <a> có href chứa view=images / view=video
    const directLink = document.querySelector(`a[href*='${targetParam}']`);
    if (directLink) {
      directLink.click();
      console.log(`[Tune-Text] Đã click thẻ <a> chuyển tab:`, directLink);
      await new Promise(r => setTimeout(r, 1200));
      return true;
    }

    // 3. Tìm phần tử click được có text "Hình ảnh" hoặc "Video" ở thanh menu File phương tiện
    const candidateElements = document.querySelectorAll("a, button, div[role='button'], li, div, span, p");
    for (const el of candidateElements) {
      if (el.closest && el.closest("#tune-text-hud")) continue;
      if (el.tagName === "H1" || el.tagName === "H2") continue;

      const txt = (el.innerText || el.textContent || "").trim();
      if (txt === targetLabel) {
        // Bỏ qua nếu là nút "+ Tạo hình ảnh" hay "+ Tạo video"
        const parentBtn = el.closest("button");
        if (parentBtn && (parentBtn.textContent || "").includes("Tạo")) continue;

        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const clickable = el.closest("a, button, div[role='button'], li") || el;
          clickable.click();
          console.log(`[Tune-Text] Đã click phần tử menu '${targetLabel}':`, clickable);
          await new Promise(r => setTimeout(r, 1200));
          return true;
        }
      }
    }

    return false;
  }

  // 4e. Lấy danh sách ảnh hiển thị trên CỘT THƯ VIỆN BÊN PHẢI (Loại bỏ ảnh trong chat)
  function getRightSideImageUrls() {
    const urls = new Set();
    try {
      document.querySelectorAll("img").forEach(img => {
        if (!isRightSideMediaElement(img)) return; // BỎ QUA ẢNH TRONG CHAT
        const src = img.currentSrc || img.src || img.getAttribute("src");
        if (src && !src.startsWith("data:")) {
          urls.add(src.trim());
        }
      });
    } catch (e) { }
    return urls;
  }

  // 4f. Lấy danh sách video hiển thị trên CỘT THƯ VIỆN BÊN PHẢI
  function getRightSideVideoUrls() {
    const urls = new Set();
    try {
      document.querySelectorAll("video, source, a[href*='.mp4'], a[href*='.webm']").forEach(el => {
        if (!isRightSideMediaElement(el)) return;
        const src = el.currentSrc || el.src || el.href || el.getAttribute("src") || el.getAttribute("data-src") || el.getAttribute("data-video-url");
        if (src && !src.startsWith("data:") && (src.startsWith("http") || src.startsWith("blob:"))) {
          urls.add(src.trim());
        }
      });
    } catch (e) { }
    return urls;
  }

  // 4g. Đếm số lượng ảnh hoặc video trên CỘT THƯ VIỆN BÊN PHẢI (Không bao giờ đếm các thẻ div lồng nhau)
  function getRightSideCardCount(type = "images") {
    let count = 0;
    try {
      const isImage = (type === "images" || type === "image" || type === "Hình ảnh");

      if (isImage) {
        // ĐẾM CHÍNH XÁC CÁC THẺ <img> THỰC TẾ TRÊN CỘT THƯ VIỆN BÊN PHẢI
        document.querySelectorAll("img").forEach(img => {
          if (!isRightSideMediaElement(img)) return;
          if (img.complete && (img.naturalWidth > 50 || img.naturalHeight > 50)) {
            count++;
          }
        });
        return count;
      }

      // Nếu là video: Nếu tab video đang hiển thị thông báo "Chưa có video nào" thì số lượng là 0
      const hasEmptyText = Array.from(document.querySelectorAll("p, div, span, h3")).some(el => {
        if (!isRightSideMediaElement(el)) return false;
        const t = (el.innerText || "").trim().toLowerCase();
        return t.includes("chưa có video") || t.includes("no videos");
      });
      if (hasEmptyText) return 0;

      // Đếm các thẻ video hoặc thẻ có icon Play ▶ trên cột bên phải
      const countedCards = new Set();
      document.querySelectorAll("video").forEach(v => {
        if (isRightSideMediaElement(v)) {
          count++;
          if (v.parentElement) countedCards.add(v.parentElement);
        }
      });

      document.querySelectorAll("[class*='video'], [class*='media'], div[role='article']").forEach(el => {
        if (!isRightSideMediaElement(el)) return;
        if (countedCards.has(el)) return;
        const hasPlay = (
          el.querySelector && el.querySelector("svg polygon, svg path[d*='M'], [class*='play'], [aria-label*='play' i]")
        ) || (el.innerText && el.innerText.includes("▶"));
        if (hasPlay) {
          count++;
          countedCards.add(el);
        }
      });
    } catch (e) { }
    return count;
  }

  // 5. Kiểm tra AI có đang trong trạng thái bận sinh câu trả lời, ảnh hoặc video không
  function isAIGenerating(customStopSelector = "") {
    if (findStopButton(customStopSelector)) return true;

    // 1. Selector streaming, spinner hoạt ảnh đang quay thực tế
    const streamingSelectors = [
      ".result-streaming",
      "[data-is-streaming='true']",
      ".sparkle-streaming",
      ".ds-button--stop",
      "[class*='typing-indicator']",
      "[class*='loading-dots']",
      "[class*='dot-flashing']",
      "svg.animate-spin",
      "[class*='animate-spin']",
      "[data-state='loading']",
      "[aria-busy='true']"
    ];

    for (const s of streamingSelectors) {
      try {
        const elements = document.querySelectorAll(s);
        for (const el of elements) {
          // Tuyệt đối không kiểm tra các phần tử nằm trong chính HUD của Tune-Text
          if (el.closest && el.closest("#tune-text-hud")) continue;
          if (isElementVisible(el)) return true;
        }
      } catch (e) { }
    }

    // 2. Nhận diện các từ khóa trạng thái tạo ảnh/video cụ thể
    try {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      let node;
      const statusRegex = /(creating\s+(collage|image|video)|rendering\s+video|generating\s+(video|image)|creating\.\.\.|generating\.\.\.|rendering\.\.\.|processing\.\.\.|thinking\.\.\.|đang\s+tạo\s+(ảnh|video|hình)|đang\s+kết\s+xuất)/i;

      while ((node = walker.nextNode())) {
        const parent = node.parentElement;
        // Bỏ qua nếu dòng chữ này nằm trong chính thanh HUD của Tune-Text
        if (!parent || (parent.closest && parent.closest("#tune-text-hud"))) continue;

        const txt = (node.nodeValue || "").trim();
        if (!txt || txt.length > 80) continue;
        if (statusRegex.test(txt)) {
          if (isElementVisible(parent)) {
            return true;
          }
        }
      }
    } catch (e) { }

    return false;
  }

  // 6. Làm sạch ô nhập để tránh dính chữ của lượt trước
  function clearInputBox(el) {
    if (!el) return;
    try {
      if (el.tagName.toLowerCase() === "textarea" || el.tagName.toLowerCase() === "input") {
        el.value = "";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        try {
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(el);
          sel.removeAllRanges();
          sel.addRange(range);
          document.execCommand("delete", false, null);
        } catch (err) { }
        if (el.textContent.trim() !== "") {
          el.innerHTML = "<p><br></p>";
        }
        el.dispatchEvent(new InputEvent("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } catch (e) { }
  }

  // Hàm bảo vệ ký tự đặc biệt cho định dạng HTML
  function escapeHTML(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // 7. Chờ AI rảnh và ô nhập sẵn sàng (Tối đa 5s, không bao giờ treo vô hạn)
  async function waitForAIReady(customInputSelector = "", maxWaitMs = 5000) {
    const start = Date.now();
    while (isAIGenerating() && (Date.now() - start < maxWaitMs)) {
      if (stopRequested) return null;
      await new Promise(r => setTimeout(r, 400));
    }

    for (let i = 0; i < 15; i++) {
      if (stopRequested) return null;
      const el = findAIInputBox(customInputSelector);
      if (el && !el.disabled && el.getAttribute("contenteditable") !== "false") {
        return el;
      }
      await new Promise(r => setTimeout(r, 200));
    }
    return findAIInputBox(customInputSelector);
  }

  // 8. Gõ văn bản vào ô nhập (Hỗ trợ 100% React, Meta Lexical Muse.ai, ProseMirror ChatGPT, Claude, Gemini...)
  async function typeTextIntoInput(el, text) {
    if (!el || !text) return;
    try { el.focus(); } catch (e) { }

    const isTextarea = el.tagName.toLowerCase() === "textarea" || el.tagName.toLowerCase() === "input";

    if (isTextarea) {
      try {
        const proto = el.tagName.toLowerCase() === "textarea" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
        if (nativeSetter) {
          nativeSetter.call(el, text);
        } else {
          el.value = text;
        }
      } catch (err) {
        el.value = text;
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    // Với ContentEditable (Lexical Muse.ai, ProseMirror ChatGPT, Claude, Gemini...):
    try {
      el.focus();
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (e) { }

    // Thử dùng insertText (Chuẩn cho Lexical của Meta/Muse và ProseMirror)
    let insertSuccess = false;
    try {
      insertSuccess = document.execCommand("insertText", false, text);
    } catch (e) { }

    // Nếu chưa nhận đủ, dùng ClipboardEvent paste
    const currentLen = (el.textContent || el.innerText || "").trim().length;
    if (!insertSuccess || currentLen < Math.min(text.trim().length * 0.7, 40)) {
      try {
        const dt = new DataTransfer();
        dt.setData("text/plain", text);
        const pasteEvt = new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: dt
        });
        el.dispatchEvent(pasteEvt);
      } catch (e) { }
    }

    if ((el.textContent || el.innerText || "").trim() === "") {
      try {
        el.innerText = text;
      } catch (e) { }
    }

    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // 9. Gửi Prompt ĐÚNG 1 LẦN DUY NHẤT (Chống gửi đúp, chống spam nhiều tin nhắn cùng lúc)
  async function sendSinglePrompt(inputBox, promptText, customSendSelector = "", customInputSelector = "") {
    if (stopRequested || !inputBox) return false;

    // 1. Chờ AI rảnh hoàn toàn trước khi bắt đầu gõ
    await waitForAIReady(customInputSelector);

    // 2. Làm sạch ô chat trước khi đưa văn bản mới vào
    clearInputBox(inputBox);
    await new Promise(r => setTimeout(r, 200));

    // 3. Gõ nội dung văn bản
    await typeTextIntoInput(inputBox, promptText);
    await new Promise(r => setTimeout(r, 600));

    // 4. Bấm nút Gửi ĐÚNG 1 LẦN DUY NHẤT (Chờ nút gửi hết disabled)
    let sendBtn = null;
    for (let i = 0; i < 15; i++) {
      sendBtn = findSendButton(customSendSelector);
      if (sendBtn && !sendBtn.disabled && sendBtn.getAttribute("aria-disabled") !== "true") {
        break;
      }
      await new Promise(r => setTimeout(r, 100));
    }

    function triggerEnter(el) {
      ["keydown", "keypress", "keyup"].forEach(type => {
        try {
          el.dispatchEvent(new KeyboardEvent(type, {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          }));
        } catch (e) { }
      });
      if (el.form) {
        try { el.form.requestSubmit(); } catch (e) { }
      }
    }

    if (sendBtn) {
      try {
        sendBtn.removeAttribute("disabled");
        sendBtn.disabled = false;
        sendBtn.click();
      } catch (e) {
        triggerEnter(inputBox);
      }
    } else {
      triggerEnter(inputBox);
    }
    return true;
  }

  // 10a. Chờ AI tạo đủ số lượng HÌNH ẢNH của đợt này TRÊN CỘT THƯ VIỆN BÊN PHẢI
  async function waitForImageGeneration(initialImages, initialCardCount = 0, expectedCount = 1, maxWaitMs = 360000, customStopSelector = "") {
    const start = Date.now();
    let stableCount = 0;

    // Đảm bảo tab đang ở view "Hình ảnh"
    await switchMediaTab("Hình ảnh");

    // Chờ tối thiểu 3 giây đầu để AI tiếp nhận prompt qua mạng
    await new Promise(r => setTimeout(r, 3000));

    // Bước B: Chờ cho tới khi thư viện bên phải xuất hiện đủ số lượng ảnh mới
    while (Date.now() - start < maxWaitMs) {
      if (stopRequested) return;

      // 1. Đếm số lượng ảnh MỚI đã xuất hiện và nạp xong trên CỘT BÊN PHẢI (Loại trừ ảnh trong chat)
      let newImagesLoadedCount = 0;
      let totalRightSideImages = 0;
      document.querySelectorAll("img").forEach(img => {
        if (!isRightSideMediaElement(img)) return; // CHỈ ĐẾM CỘT BÊN PHẢI!
        const src = img.currentSrc || img.src || img.getAttribute("src");
        if (src && !src.startsWith("data:")) {
          if (img.complete && (img.naturalWidth > 50 || img.naturalHeight > 50)) {
            totalRightSideImages++;
            if (!initialImages.has(src.trim())) {
              newImagesLoadedCount++;
            }
          }
        }
      });

      // Đếm theo độ tăng tổng số ảnh trên cột bên phải
      const newByTotalCount = Math.max(0, totalRightSideImages - initialCardCount);
      const finalCount = Math.max(newImagesLoadedCount, newByTotalCount);

      // 2. Kiểm tra xem có spinner thực tế nào đang quay không
      const hasActiveSpinner = !!document.querySelector("svg.animate-spin, .animate-spin");
      const isGenerating = isAIGenerating(customStopSelector);

      // Cập nhật tiến độ trực quan lên thanh HUD
      updateHUD(
        `⏳ Đang chờ tạo đủ ${expectedCount} ảnh (Thư viện phải)... (Đã có ${finalCount}/${expectedCount} ảnh)`,
        null, null, "", false
      );

      // NẾU ĐÃ RA ĐỦ HOẶC VƯỢT SỐ LƯỢNG ẢNH CỦA ĐỢT NÀY (Ví dụ: 4/4 ảnh):
      if (finalCount >= expectedCount) {
        if (!hasActiveSpinner && !isGenerating) {
          stableCount++;
          if (stableCount >= 2) {
            console.log(`[Tune-Text] ✅ ĐÃ TẠO ĐỦ ${finalCount}/${expectedCount} ẢNH MỚI BÊN PHẢI! Chuyển ngay sang Bước 2.`);
            break;
          }
        } else {
          // Ngay cả khi isGenerating còn vướng văn bản trên giao diện, nếu đã đủ ảnh và ổn định 4 giây thì vẫn tiếp tục
          stableCount++;
          if (stableCount >= 4) {
            console.log(`[Tune-Text] ✅ ĐÃ CÓ ĐỦ ${finalCount}/${expectedCount} ẢNH MỚI BÊN PHẢI (Timeout ổn định)! Chuyển ngay sang Bước 2.`);
            break;
          }
        }
      } else {
        stableCount = 0;
      }

      await new Promise(r => setTimeout(r, 1000));
    }

    // Đệm thêm 1.5 giây để giao diện ổn định và ô chat mở khóa trở lại
    await new Promise(r => setTimeout(r, 1500));
  }

  // Hàm kiểm tra một URL có thực sự là tệp VIDEO hay không (loại trừ 100% tệp ảnh PNG/JPG)
  function isVideoUrl(url) {
    if (!url || typeof url !== "string") return false;
    const u = url.toLowerCase().split("?")[0];
    if (
      u.endsWith(".png") || u.endsWith(".jpg") || u.endsWith(".jpeg") ||
      u.endsWith(".webp") || u.endsWith(".gif") || u.endsWith(".svg") ||
      u.endsWith(".txt") || u.endsWith(".json")
    ) {
      return false; // Tuyệt đối loại trừ tệp ảnh hoặc dữ liệu khác
    }
    if (u.endsWith(".mp4") || u.endsWith(".webm") || u.endsWith(".mov") || u.endsWith(".mkv") || u.includes("/video/")) {
      return true;
    }
    if (url.startsWith("blob:") && !url.includes("image")) {
      return true;
    }
    return false;
  }

  // 10b. Chờ AI tạo đủ số lượng VIDEO của đợt này TRÊN CỘT THƯ VIỆN BÊN PHẢI (với nút Play ▶)
  async function waitForVideoGeneration(initialVideos, initialVideoCardCount = 0, expectedCount = 1, maxWaitMs = 600000, customStopSelector = "") {
    const start = Date.now();
    let stableCount = 0;

    // Đảm bảo tab đang ở view "Video"
    await switchMediaTab("Video");

    // Chờ tối thiểu 4 giây đầu để lệnh gửi đi và AI bắt đầu quá trình tạo video
    await new Promise(r => setTimeout(r, 4000));

    // Vòng lặp chờ VIDEO:
    // TUYỆT ĐỐI CHỈ HOÀN THÀNH KHI ĐÃ CÓ ĐỦ SỐ LƯỢNG VIDEO MỚI (Ví dụ: 4/4 video) TRÊN CỘT BÊN PHẢI!
    while (Date.now() - start < maxWaitMs) {
      if (stopRequested) return null;

      // 1. Quét tìm tất cả các VIDEO MỚI TRÊN CỘT THƯ VIỆN BÊN PHẢI
      const foundNewVideos = new Set();

      // a) Quét qua thẻ <video>
      document.querySelectorAll("video").forEach(v => {
        if (!isRightSideMediaElement(v)) return;
        const s = v.currentSrc || v.src || v.querySelector("source")?.src;
        if (s && isVideoUrl(s) && !initialVideos.has(s.trim())) {
          if (v.readyState >= 1 || v.duration > 0 || (v.videoWidth > 0 && v.videoHeight > 0)) {
            foundNewVideos.add(s.trim());
          }
        }
      });

      // b) Quét qua thẻ <a> link video
      document.querySelectorAll("a[href*='.mp4'], a[href*='.webm'], a[download*='.mp4'], a[download*='.webm']").forEach(a => {
        if (!isRightSideMediaElement(a)) return;
        const href = a.href;
        if (href && isVideoUrl(href) && !initialVideos.has(href.trim())) {
          foundNewVideos.add(href.trim());
        }
      });

      // c) Quét qua các thẻ video card trên giao diện Muse.ai (các thẻ có nút Play ▶ trong tab Video)
      let customCardCount = 0;
      document.querySelectorAll("[class*='video'], [class*='media'], div[role='article']").forEach(el => {
        if (!isRightSideMediaElement(el)) return;
        const hasPlayBtn = el.querySelector && (
          el.querySelector("svg polygon, svg path[d*='M'], [class*='play'], [aria-label*='play' i]") ||
          (el.innerText && el.innerText.includes("▶"))
        );
        if (hasPlayBtn) {
          customCardCount++;
        }
      });

      // d) Kiểm tra thông báo "Chưa có video nào"
      const hasEmptyNotice = Array.from(document.querySelectorAll("p, div, span, h3")).some(el => {
        if (!isRightSideMediaElement(el)) return false;
        const t = (el.innerText || "").trim().toLowerCase();
        return t.includes("chưa có video") || t.includes("no videos");
      });

      // Fallback qua bộ đếm card
      const currentVideoCards = getRightSideCardCount("video");
      const newVideoCardsCount = Math.max(0, currentVideoCards - initialVideoCardCount);

      const currentNewVideoCount = hasEmptyNotice ? 0 : Math.max(foundNewVideos.size, customCardCount, newVideoCardsCount);
      const hasActiveSpinner = !!document.querySelector("svg.animate-spin, .animate-spin");
      const isGenerating = isAIGenerating(customStopSelector);

      // Cập nhật tiến độ trực tiếp lên HUD: ví dụ "Đang chờ tạo đủ 4 video... (Đã có 2/4 video)"
      const elapsedSec = Math.floor((Date.now() - start) / 1000);
      updateHUD(
        `⏳ Đang chờ tạo đủ ${expectedCount} video (Thư viện phải)... (Đã có ${currentNewVideoCount}/${expectedCount}) [${elapsedSec}s]`,
        null, null, "", false
      );

      // NẾU ĐÃ RA ĐỦ HOẶC VƯỢT SỐ LƯỢNG VIDEO CỦA ĐỢT NÀY (Ví dụ: 4/4 video) VÀ KHÔNG BỊ BÁO TRỐNG:
      if (currentNewVideoCount >= expectedCount && !hasEmptyNotice) {
        if (!hasActiveSpinner && !isGenerating) {
          stableCount++;
          if (stableCount >= 2) {
            console.log(`[Tune-Text] ✅ ĐÃ RA ĐỦ ${currentNewVideoCount}/${expectedCount} VIDEO MỚI BÊN PHẢI! Chuyển sang Bước 3 (Tải video).`);
            break;
          }
        } else {
          stableCount = 0;
        }
      } else {
        // Chưa đủ số lượng video: tiếp tục kiên nhẫn chờ AI sinh tiếp
        stableCount = 0;
      }

      await new Promise(r => setTimeout(r, 1500));
    }

    // Đệm thêm 2 giây trước khi kích hoạt tải
    await new Promise(r => setTimeout(r, 2000));
  }

  // 10c. Chờ AI phản hồi xong nói chung
  async function waitForAIFinish(maxWaitMs = 600000, customStopSelector = "") {
    await waitForImageGeneration(new Set(), 0, 1, maxWaitMs, customStopSelector);
  }

  // 11. Tự động nhận diện và tải video sinh ra từ AI về thư mục tương ứng (video1, video2, video3...)
  if (!window.__videoCounterByFolder) window.__videoCounterByFolder = {};

  function checkAndDownloadNewVideos(targetFolder, batchIndex, callerTabId, preVideoUrls = null) {
    try {
      if (!window.__ttDownloadedUrls) window.__ttDownloadedUrls = new Set();
      const candidates = [];

      // Ưu tiên 1: Quét các thẻ video trên cột bên phải
      document.querySelectorAll("video").forEach(v => {
        if (!isRightSideMediaElement(v)) return;
        const s = v.currentSrc || v.src || v.querySelector("source")?.src;
        if (s && isVideoUrl(s) && !s.startsWith("data:")) {
          if (v.readyState >= 1 || v.duration > 0 || (v.videoWidth > 0 && v.videoHeight > 0)) {
            candidates.push(s);
          }
        }
      });

      // Ưu tiên 2: Quét thẻ <a> có đuôi video trên cột bên phải
      document.querySelectorAll("a[href*='.mp4'], a[href*='.webm'], a[download*='.mp4'], a[download*='.webm']").forEach(a => {
        if (!isRightSideMediaElement(a)) return;
        if (a.href && isVideoUrl(a.href) && !a.href.startsWith("javascript:")) {
          candidates.push(a.href);
        }
      });

      // Ưu tiên 3: Quét các thuộc tính đặc trưng video trên cột bên phải
      document.querySelectorAll("[data-video-url], [data-video], [data-src*='.mp4'], [data-src*='.webm']").forEach(el => {
        if (!isRightSideMediaElement(el)) return;
        const u = el.getAttribute("data-video-url") || el.getAttribute("data-video") || el.getAttribute("data-src");
        if (u && isVideoUrl(u)) candidates.push(u);
      });

      // Fallback: Nếu không tìm thấy video nào ở bên phải (ví dụ trang AI dạng 1 cột như ChatGPT), quét toàn trang
      if (candidates.length === 0) {
        document.querySelectorAll("video").forEach(v => {
          if (v.closest && v.closest("#tune-text-hud")) return;
          const s = v.currentSrc || v.src || v.querySelector("source")?.src;
          if (s && isVideoUrl(s) && !s.startsWith("data:")) {
            candidates.push(s);
          }
        });
        document.querySelectorAll("a[href*='.mp4'], a[href*='.webm'], a[download*='.mp4'], a[download*='.webm']").forEach(a => {
          if (a.closest && a.closest("#tune-text-hud")) return;
          if (a.href && isVideoUrl(a.href) && !a.href.startsWith("javascript:")) {
            candidates.push(a.href);
          }
        });
      }

      for (const rawUrl of candidates) {
        if (!rawUrl) continue;
        const cleanUrl = rawUrl.trim();
        // TUYỆT ĐỐI BỎ QUA nếu video này đã có từ trước khi gửi lệnh
        if (preVideoUrls && preVideoUrls.has(cleanUrl)) {
          continue;
        }

        if ((cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://") || cleanUrl.startsWith("blob:")) && !window.__ttDownloadedUrls.has(cleanUrl)) {
          window.__ttDownloadedUrls.add(cleanUrl);

          // Tăng số thứ tự video bắt đầu từ 1 cho mỗi thư mục (video1, video2, video3...)
          if (!window.__videoCounterByFolder[targetFolder]) {
            window.__videoCounterByFolder[targetFolder] = 0;
          }
          window.__videoCounterByFolder[targetFolder] += 1;
          const videoIndex = window.__videoCounterByFolder[targetFolder];

          const ext = cleanUrl.includes(".webm") ? "webm" : "mp4";
          const vName = `video${videoIndex}.${ext}`;

          chrome.runtime.sendMessage({
            action: "DOWNLOAD_AI_VIDEO",
            videoUrl: cleanUrl,
            folderName: targetFolder,
            fileName: vName,
            videoIndex: videoIndex,
            callerTabId: callerTabId
          });
          console.log(`[Tune-Text Video] Đã phát hiện video mới #${videoIndex} và tải vào '${targetFolder}/${vName}':`, cleanUrl);
        }
      }
    } catch (e) {
      console.warn("[Tune-Text AI] Lỗi kiểm tra video:", e);
    }
  }

  // Báo cáo tiến độ an toàn về tab Tune-Text (chống sinh lỗi unhandled promise khi tab F5)
  function safeReportProgress(callerTabId, data) {
    if (!callerTabId) return;
    try {
      chrome.runtime.sendMessage({
        action: "REPORT_PROGRESS",
        callerTabId: callerTabId,
        data: data
      }, () => {
        if (chrome.runtime.lastError) {
          // Tab Tune-Text đã đóng hoặc F5, bỏ qua an toàn mà không sinh lỗi đỏ
        }
      });
    } catch (e) { }
  }

  // 7. Vòng lặp chạy prompts (Hỗ trợ lặp nhiều lần Lượt 1 -> Lượt 2 -> Lượt N hoàn toàn ngầm)
  async function runPromptSequence(prompts, callerTabId, options = {}) {
    if (isAutomationRunning) {
      console.warn("Đang có tiến trình tự động hóa chạy, dừng tiến trình cũ.");
      stopRequested = true;
      await new Promise(r => setTimeout(r, 500));
    }

    isAutomationRunning = true;
    stopRequested = false;

    const durationMinutes = parseFloat(options.durationMinutes || options.duration_minutes) || 0;
    const isTimeMode = durationMinutes > 0;
    const isInfinite = isTimeMode || !!(options.isInfiniteLoop || options.is_infinite);
    const parsedLoop = parseInt(options.loopCount || options.loop_count, 10);
    const loopCount = isInfinite ? 999999 : ((!isNaN(parsedLoop) && parsedLoop > 0) ? parsedLoop : 1);
    const delayBetweenLoops = parseFloat(options.delaySeconds || options.delay_between_prompts) || 3;
    const totalPromptsPerLoop = prompts.length;
    const batchSize = Math.max(1, parseInt(options.batchSize || options.batch_size, 10) || 4);
    const enablePrefixHeader = (options.enablePrefixHeader !== false);
    const prefixTemplate = options.prefixTemplate || "hãy tạo cho tôi {count} video với {count} ảnh tham chiếu trên với promt : {code}";
    const specialCode = (options.specialCode || "Transform the provided image into a 10-second premium editorial").trim();
    const targetVideoFolder = options.folderName || "prompts_video";

    // Luôn bắt đầu đếm số thứ tự video từ 1 cho mỗi thư mục
    if (!window.__videoCounterByFolder) window.__videoCounterByFolder = {};
    window.__videoCounterByFolder[targetVideoFolder] = 0;
    if (!window.__ttDownloadedUrls) window.__ttDownloadedUrls = new Set();

    // Nạp sẵn toàn bộ video ĐÃ CÓ TRÊN TRANG trước khi chạy để TUYỆT ĐỐI KHÔNG tải nhầm video cũ:
    document.querySelectorAll("video, source, a[href*='.mp4'], a[href*='.webm']").forEach(el => {
      const u = el.currentSrc || el.src || el.href || el.getAttribute("data-video-url") || el.getAttribute("data-src");
      if (u && (u.startsWith("http") || u.startsWith("blob:"))) {
        window.__ttDownloadedUrls.add(u.trim());
      }
    });

    // Tạo danh sách các Lô (Batches) từ danh sách prompts
    const batches = [];
    for (let i = 0; i < prompts.length; i += batchSize) {
      const chunk = prompts.slice(i, i + batchSize);
      const startNum = i + 1;
      const endNum = Math.min(i + batchSize, prompts.length);
      const rangeLabel = (startNum === endNum) ? `đoạn ${startNum}` : `đoạn ${startNum}-${endNum}`;
      batches.push({
        batchIndex: batches.length + 1,
        startNum: startNum,
        endNum: endNum,
        rangeLabel: rangeLabel,
        combinedPrompt: chunk.join("\n\n"),
        count: chunk.length
      });
    }
    const totalBatchesPerLoop = batches.length;

    const startTime = Date.now();
    const maxDurationMs = isTimeMode ? durationMinutes * 60 * 1000 : null;

    function getRemainingStr() {
      if (!maxDurationMs) return "";
      const remainMs = Math.max(0, maxDurationMs - (Date.now() - startTime));
      const m = Math.floor(remainMs / 60000);
      const s = Math.floor((remainMs % 60000) / 1000);
      return `[Còn ${m}p${s < 10 ? '0' : ''}${s}s]`;
    }

    console.log(`[Tune-Text Content AI] Khởi động tự động hóa: ${totalPromptsPerLoop} đoạn/lượt chia thành ${totalBatchesPerLoop} lô (gộp ${batchSize} đoạn/lần) | Chế độ: ${isTimeMode ? durationMinutes + ' phút' : (isInfinite ? 'Vô hạn' : loopCount + ' lượt')} | Nghỉ: ${delayBetweenLoops}s`, options);

    let currentLoop = 1;
    for (let loopIdx = 0; loopIdx < loopCount; loopIdx++) {
      if (stopRequested) break;

      currentLoop = loopIdx + 1;
      let loopPrefix = "";
      if (isTimeMode) {
        loopPrefix = `[Lượt ${currentLoop} ${getRemainingStr()}]`;
      } else if (isInfinite) {
        loopPrefix = `[Lượt ${currentLoop} (Vô hạn)]`;
      } else if (loopCount > 1) {
        loopPrefix = `[Lượt ${currentLoop}/${loopCount}]`;
      } else {
        loopPrefix = `[Lượt 1/1]`;
      }

      for (let bIdx = 0; bIdx < totalBatchesPerLoop; bIdx++) {
        if (stopRequested) break;

        // Kiểm tra thời lượng tối đa
        if (maxDurationMs && (Date.now() - startTime >= maxDurationMs)) {
          console.log(`[Tune-Text Content AI] Đã đạt thời lượng tối đa ${durationMinutes} phút.`);
          stopRequested = true;
          break;
        }

        const currentBatch = batches[bIdx];
        const currentBatchIndex = bIdx + 1;
        const batchProgressStr = (batchSize > 1)
          ? `Lô ${currentBatchIndex}/${totalBatchesPerLoop} (${currentBatch.rangeLabel}/${totalPromptsPerLoop})`
          : `Đoạn ${currentBatchIndex}/${totalPromptsPerLoop}`;

        const customInputSel = options.inputSelector || options.customInput || "";
        const customSendSel = options.sendSelector || options.customSend || "";
        const customStopSel = options.stopSelector || options.customStop || "";

        if (isTimeMode) {
          loopPrefix = `[Lượt ${currentLoop} ${getRemainingStr()}]`;
        }

        // ==============================================================
        // BƯỚC 1: GỬI ĐOẠN VĂN BẢN (PROMPT CHÍNH) ➔ CHỜ TẠO HÌNH ẢNH XONG
        // ==============================================================
        // 1a. TỰ ĐỘNG CHUYỂN SANG TAB "HÌNH ẢNH" TRƯỚC KHI TẠO ẢNH
        updateHUD(`${loopPrefix} [1/2] Đang chuyển tab sang Hình ảnh...`, currentBatchIndex, totalBatchesPerLoop, "", false, currentLoop, loopCount, currentBatch.rangeLabel);
        await switchMediaTab("Hình ảnh");
        await new Promise(r => setTimeout(r, 1200));

        // Chụp lại danh sách ảnh và số lượng card đã có trên cột bên phải trước khi gửi prompt
        const preImages = getRightSideImageUrls();
        const preImageCardCount = getRightSideCardCount("images");

        const promptText = currentBatch.combinedPrompt;
        updateHUD(`${loopPrefix} [1/2] Đang chuẩn bị gửi ${batchProgressStr}...`, currentBatchIndex, totalBatchesPerLoop, promptText, false, currentLoop, loopCount, currentBatch.rangeLabel);

        safeReportProgress(callerTabId, {
          current_index: currentBatchIndex,
          total_prompts: totalBatchesPerLoop,
          actual_prompt_count: totalPromptsPerLoop,
          batch_size: batchSize,
          batch_label: currentBatch.rangeLabel,
          current_loop: currentLoop,
          loop_count: loopCount,
          duration_minutes: durationMinutes,
          remaining_time_str: getRemainingStr(),
          status_message: `${loopPrefix} [Bước 1/2] Đang gửi nội dung ${batchProgressStr}...`,
          log: `[Tab AI] ${loopPrefix} [Bước 1/2] Gửi đoạn văn bản ${batchProgressStr}: "${promptText.substring(0, 50)}..."`,
          is_completed: false
        });

        // 1b. Tìm ô chat bên trái
        let inputBox = await waitForAIReady(customInputSel);
        if (!inputBox) {
          await new Promise(r => setTimeout(r, 2000));
          inputBox = findAIInputBox(customInputSel);
        }

        if (!inputBox) {
          console.error("Không tìm thấy ô nhập liệu.");
          safeReportProgress(callerTabId, {
            current_index: currentBatchIndex,
            total_prompts: totalBatchesPerLoop,
            status_message: `❌ Chưa tìm thấy ô nhập liệu trên tab AI!`,
            log: `[Lỗi] Không tìm thấy ô nhập prompt trên tab AI cho ${batchProgressStr}. Vui lòng mở tab AI và click chuột vào ô chat, rồi bấm Khởi Chạy lại!`,
            is_completed: false
          });
          continue;
        }

        // 1c. Gõ toàn bộ nội dung đoạn văn bản và gửi đi trong ô chat bên trái
        updateHUD(`${loopPrefix} [1/2] Đang gõ ${batchProgressStr}...`, currentBatchIndex, totalBatchesPerLoop, promptText, false, currentLoop, loopCount, currentBatch.rangeLabel);
        await sendSinglePrompt(inputBox, promptText, customSendSel, customInputSel);
        if (stopRequested) break;

        // 1d. Chờ AI tạo xong HÌNH ẢNH hoàn toàn trên cột thư viện bên phải (Đủ số lượng đợt này)
        updateHUD(`${loopPrefix} [1/2] ${batchProgressStr}: Đang chờ AI tạo xong hình ảnh...`, currentBatchIndex, totalBatchesPerLoop, "", false, currentLoop, loopCount, currentBatch.rangeLabel);
        safeReportProgress(callerTabId, {
          current_index: currentBatchIndex,
          total_prompts: totalBatchesPerLoop,
          status_message: `${loopPrefix} Đang chờ AI tạo xong hình ảnh...`,
          log: `[Tab AI] ${loopPrefix} ⏳ Đang chờ AI tạo xong hình ảnh cho ${batchProgressStr}...`,
          is_completed: false
        });
        await waitForImageGeneration(preImages, preImageCardCount, currentBatch.count, 360000, customStopSel);
        if (stopRequested) break;

        safeReportProgress(callerTabId, {
          current_index: currentBatchIndex,
          total_prompts: totalBatchesPerLoop,
          status_message: `${loopPrefix} Đã tạo xong hình ảnh!`,
          log: `[Tab AI] ${loopPrefix} ✅ Đã tạo xong hình ảnh cho ${batchProgressStr}!`,
          is_completed: false
        });

        // ==============================================================
        // BƯỚC 2: SAU KHI HÌNH ẢNH ĐÃ TẠO XONG ➔ GỬI CÂU LỆNH TẠO VIDEO & CHUYỂN SANG TAB VIDEO
        // ==============================================================
        let preVideos = new Set();
        let preVideoCardCount = 0;

        if (enablePrefixHeader) {
          let cmdToSend = prefixTemplate
            .replace(/{count}/g, currentBatch.count)
            .replace(/{batch}/g, currentBatchIndex)
            .replace(/{code}/g, specialCode)
            .replace(/{folder}/g, targetVideoFolder)
            .replace(/\s+/g, " ")
            .trim();

          // Nghỉ 2.5 giây để AI cập nhật giao diện sau khi tạo xong ảnh
          await new Promise(r => setTimeout(r, 2500));
          if (stopRequested) break;

          updateHUD(`${loopPrefix} [2/2] Đang gửi câu lệnh tạo video...`, currentBatchIndex, totalBatchesPerLoop, cmdToSend, false, currentLoop, loopCount, currentBatch.rangeLabel);

          safeReportProgress(callerTabId, {
            current_index: currentBatchIndex,
            total_prompts: totalBatchesPerLoop,
            actual_prompt_count: totalPromptsPerLoop,
            batch_size: batchSize,
            batch_label: currentBatch.rangeLabel,
            current_loop: currentLoop,
            loop_count: loopCount,
            duration_minutes: durationMinutes,
            remaining_time_str: getRemainingStr(),
            status_message: `${loopPrefix} [Bước 2/2] Đang gửi câu lệnh tạo video...`,
            log: `[Tab AI] ${loopPrefix} [Bước 2/2] Gửi câu lệnh: "${cmdToSend}"`,
            is_completed: false
          });

          // Tìm lại ô chat bên trái sau khi đã sinh ảnh
          let cmdInputBox = await waitForAIReady(customInputSel);
          if (!cmdInputBox) {
            await new Promise(r => setTimeout(r, 2000));
            cmdInputBox = findAIInputBox(customInputSel);
          }

          if (cmdInputBox) {
            await sendSinglePrompt(cmdInputBox, cmdToSend, customSendSel, customInputSel);
            if (stopRequested) break;

            // 2b. NGAY SAU KHI GỬI CÂU LỆNH TẠO VIDEO ➔ TỰ ĐỘNG CHUYỂN SANG TAB "VIDEO"
            updateHUD(`${loopPrefix} [2/2] Đang chuyển tab sang Video...`, currentBatchIndex, totalBatchesPerLoop, "", false, currentLoop, loopCount, currentBatch.rangeLabel);
            await switchMediaTab("Video");
            await new Promise(r => setTimeout(r, 1500));

            // Chụp lại toàn bộ video trên tab Video trước khi AI sinh video mới
            preVideos = getRightSideVideoUrls();
            preVideoCardCount = getRightSideCardCount("video");

            // Chờ AI xử lý xong câu lệnh (chuyển đổi thành video)
            updateHUD(`${loopPrefix} [2/2] ${batchProgressStr}: Đang chờ AI chuyển đổi thành video...`, currentBatchIndex, totalBatchesPerLoop, "", false, currentLoop, loopCount, currentBatch.rangeLabel);
            safeReportProgress(callerTabId, {
              current_index: currentBatchIndex,
              total_prompts: totalBatchesPerLoop,
              status_message: `${loopPrefix} Đang chờ AI tạo video...`,
              log: `[Tab AI] ${loopPrefix} ⏳ Đang chờ AI chuyển đổi thành video cho ${batchProgressStr}...`,
              is_completed: false
            });
            await waitForVideoGeneration(preVideos, preVideoCardCount, currentBatch.count, 600000, customStopSel);
          }
        }
        if (stopRequested) break;

        // ==============================================================
        // BƯỚC 3: TỰ ĐỘNG TẢI VIDEO VỀ THƯ MỤC CÙNG TÊN TỆP PROMPT
        // ==============================================================
        checkAndDownloadNewVideos(targetVideoFolder, currentBatchIndex, callerTabId, preVideos);
        setTimeout(() => checkAndDownloadNewVideos(targetVideoFolder, currentBatchIndex, callerTabId, preVideos), 3000);
        setTimeout(() => checkAndDownloadNewVideos(targetVideoFolder, currentBatchIndex, callerTabId, preVideos), 6000);

        // Báo hoàn thành lô này an toàn
        const isAllLoopsCompleted = (!isTimeMode && !isInfinite && currentLoop === loopCount && currentBatchIndex === totalBatchesPerLoop);
        safeReportProgress(callerTabId, {
          current_index: currentBatchIndex,
          total_prompts: totalBatchesPerLoop,
          actual_prompt_count: totalPromptsPerLoop,
          batch_size: batchSize,
          batch_label: currentBatch.rangeLabel,
          current_loop: currentLoop,
          loop_count: loopCount,
          duration_minutes: durationMinutes,
          remaining_time_str: getRemainingStr(),
          status_message: `${loopPrefix} ${batchProgressStr} đã phản hồi xong.`,
          log: `[Tab AI] ${loopPrefix} ${batchProgressStr} đã được AI phản hồi hoàn tất.`,
          is_completed: isAllLoopsCompleted
        });

        // Nghỉ giữa các lô trong cùng một lượt
        if (bIdx < totalBatchesPerLoop - 1) {
          updateHUD(`${loopPrefix} Đã xong ${batchProgressStr}. Chờ 3s...`, currentBatchIndex, totalBatchesPerLoop, "", false, currentLoop, loopCount, currentBatch.rangeLabel);
          await new Promise(r => setTimeout(r, 3000));
        }
      }

      if (stopRequested) break;

      // Kiểm tra thời lượng trước lượt mới
      if (maxDurationMs && (Date.now() - startTime >= maxDurationMs)) {
        updateHUD(`⏱️ Đã hết ${durationMinutes} phút. Hoàn thành!`, totalBatchesPerLoop, totalBatchesPerLoop);
        break;
      }

      // ĐẾM NGƯỢC NGHỈ TRƯỚC KHI BẮT ĐẦU LƯỢT TIẾP THEO
      if (loopIdx < loopCount - 1) {
        const nextLoop = currentLoop + 1;
        const totalDelay = Math.max(1, Math.ceil(delayBetweenLoops));
        const remNotice = isTimeMode ? ` ${getRemainingStr()}` : "";

        // Thông báo sang Tab Tune-Text để hiển thị vào nhật ký an toàn
        safeReportProgress(callerTabId, {
          current_index: totalBatchesPerLoop,
          total_prompts: totalBatchesPerLoop,
          actual_prompt_count: totalPromptsPerLoop,
          batch_size: batchSize,
          current_loop: currentLoop,
          loop_count: loopCount,
          duration_minutes: durationMinutes,
          remaining_time_str: getRemainingStr(),
          status_message: `✅ Xong lượt ${currentLoop}! Đang nghỉ ${totalDelay}s trước khi gõ lượt ${nextLoop}...${remNotice}`,
          log: `[Tab AI] ✅ Xong lượt ${currentLoop}! Nghỉ ${totalDelay}s rồi tự động gõ tiếp lượt ${nextLoop}...${remNotice}`,
          is_completed: false
        });

        for (let s = totalDelay; s > 0; s--) {
          if (stopRequested) break;
          if (maxDurationMs && (Date.now() - startTime >= maxDurationMs)) {
            stopRequested = true;
            break;
          }
          const subRem = isTimeMode ? ` ${getRemainingStr()}` : "";
          updateHUD(`✅ Xong lượt ${currentLoop}! Nghỉ ${s}s rồi tự động gõ lượt ${nextLoop}...${subRem}`, totalBatchesPerLoop, totalBatchesPerLoop);
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }

    let finalMsg = "";
    if (isTimeMode && maxDurationMs && (Date.now() - startTime >= maxDurationMs)) {
      finalMsg = `🎉 Hoàn tất 100%! Đã chạy liên tục đủ ${durationMinutes} phút (Đã hoàn thành ${currentLoop} lượt).`;
    } else if (isInfinite && stopRequested) {
      finalMsg = `🎉 Đã dừng theo yêu cầu sau ${currentLoop} lượt.`;
    } else if (!isInfinite) {
      finalMsg = `🎉 Hoàn tất 100%! Đã hoàn thành đủ ${loopCount} lượt lặp lại.`;
    } else {
      finalMsg = `🎉 Hoàn tất quá trình tự động hóa (${currentLoop} lượt).`;
    }

    updateHUD(finalMsg, totalBatchesPerLoop, totalBatchesPerLoop);
    safeReportProgress(callerTabId, {
      current_index: totalBatchesPerLoop,
      total_prompts: totalBatchesPerLoop,
      actual_prompt_count: totalPromptsPerLoop,
      batch_size: batchSize,
      current_loop: currentLoop,
      loop_count: loopCount,
      duration_minutes: durationMinutes,
      remaining_time_str: "",
      status_message: finalMsg,
      log: `[Tab AI] ${finalMsg}`,
      is_completed: true
    });

    setTimeout(() => {
      const hud = document.getElementById("tune-text-hud");
      if (hud) hud.style.display = "none";
    }, 10000);

    isAutomationRunning = false;
  }

  // Lắng nghe lệnh từ background
  if (window.__tuneTextMsgListener) {
    chrome.runtime.onMessage.removeListener(window.__tuneTextMsgListener);
  }

  window.__tuneTextMsgListener = (request, sender, sendResponse) => {
    // 1. Phản hồi PING để background biết content script đã nạp phiên bản 1.3.1
    if (request.action === "PING") {
      sendResponse({ pong: true, version: "1.3.1" });
      return;
    }

    // 2. Nhận lệnh DỪNG KHẨN CẤP từ Web UI
    if (request.action === "STOP_PROMPTS") {
      console.log("[Tune-Text Content AI] Đã nhận lệnh STOP_PROMPTS, dừng ngay lập tức!");
      stopRequested = true;
      isAutomationRunning = false;
      updateHUD("🛑 Đã dừng Robot theo yêu cầu!", 0, 0, "", true);
      setTimeout(() => {
        const hud = document.getElementById("tune-text-hud");
        if (hud) hud.style.display = "none";
      }, 2500);
      sendResponse({ stopped: true });
      return true;
    }

    // 3. Nhận lệnh chạy chuỗi Prompt
    if (request.action === "RUN_PROMPTS") {
      sendResponse({ started: true });

      // ===== DEBUG: In ra tất cả giá trị nhận được để kiểm tra =====
      console.log("===== [Tune-Text] DEBUG RUN_PROMPTS (v1.3.1) =====");
      console.log("  request.targetUrl          =", request.targetUrl);
      console.log("  request.platformCode       =", request.platformCode);
      console.log("  request.loopCount          =", request.loopCount, typeof request.loopCount);
      console.log("  request.isInfiniteLoop     =", request.isInfiniteLoop);
      console.log("  request.durationMinutes    =", request.durationMinutes);
      console.log("  request.delaySeconds       =", request.delaySeconds);
      console.log("  request.batchSize          =", request.batchSize);
      console.log("  request.enablePrefixHeader =", request.enablePrefixHeader);
      console.log("  request.specialCode        =", request.specialCode);
      console.log("  request.folderName         =", request.folderName);
      console.log("  request.prompts.length     =", (request.prompts || []).length);
      console.log("==================================================");

      const opts = Object.assign({}, request.options || {});
      // Ưu tiên lấy trực tiếp từ request message (do background.js gửi) trước
      const rawLoopCount = request.loopCount || request.loop_count || opts.loopCount || opts.loop_count;
      const loopCount = parseInt(rawLoopCount, 10);
      if (loopCount && loopCount > 0) {
        opts.loopCount = loopCount;
        opts.loop_count = loopCount;
      }
      const rawBatchSize = request.batchSize || request.batch_size || opts.batchSize || opts.batch_size;
      const parsedBatchSize = parseInt(rawBatchSize, 10);
      opts.batchSize = (parsedBatchSize && parsedBatchSize > 0) ? parsedBatchSize : 4;
      opts.batch_size = opts.batchSize;

      opts.enablePrefixHeader = (request.enablePrefixHeader !== undefined) ? request.enablePrefixHeader : (opts.enablePrefixHeader !== undefined ? opts.enablePrefixHeader : true);
      opts.prefixTemplate = request.prefixTemplate || opts.prefixTemplate || "hãy tạo cho tôi {count} video với {count} ảnh tham chiếu trên với promt : {code}";
      opts.specialCode = request.specialCode || opts.specialCode || "Transform the provided image into a 10-second premium editorial";
      opts.folderName = request.folderName || opts.folderName || "prompts_video";

      opts.durationMinutes = parseFloat(request.durationMinutes || opts.durationMinutes) || 0;
      opts.delaySeconds = parseFloat(request.delaySeconds || opts.delaySeconds) || 3;
      opts.isInfiniteLoop = !!(request.isInfiniteLoop || opts.isInfiniteLoop);
      opts.inputSelector = request.inputSelector || opts.inputSelector || "";
      opts.sendSelector = request.sendSelector || opts.sendSelector || "";
      opts.stopSelector = request.stopSelector || opts.stopSelector || "";

      console.log("[Tune-Text AI Prompter] Bắt đầu tự động hóa với Options:", JSON.stringify(opts));
      runPromptSequence(request.prompts, request.callerTabId, opts);
      return true;
    }
  };

  chrome.runtime.onMessage.addListener(window.__tuneTextMsgListener);
})();
