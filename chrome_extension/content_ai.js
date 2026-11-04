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

  // 2. Tìm ô nhập văn bản theo ngữ nghĩa (Hỗ trợ 100% Claude, Gemini, ChatGPT, DeepSeek, Poe, Perplexity và AI tùy biến)
  function findAIInputBox(customSelector = "") {
    if (customSelector && typeof customSelector === "string") {
      try {
        const customEl = document.querySelector(customSelector.trim());
        if (customEl && !customEl.disabled) return customEl;
      } catch (e) { }
    }

    const selectors = [
      "#prompt-textarea",
      "div#prompt-textarea",
      "div[contenteditable='true'][data-placeholder]",
      "div[contenteditable='true'].ProseMirror",
      "div.ProseMirror[contenteditable='true']",
      "rich-textarea div[contenteditable='true']",
      "div[role='textbox']",
      "div[contenteditable='true']",
      "textarea#chat-input",
      "textarea[data-id]",
      "textarea[placeholder*='Message']",
      "textarea[placeholder*='nhắn']",
      "textarea[placeholder*='Hỏi']",
      "textarea[placeholder*='Ask']",
      "textarea[placeholder*='chat']",
      "div.ql-editor",
      "textarea",
      "input[type='text']"
    ];

    for (const s of selectors) {
      try {
        const el = document.querySelector(s);
        if (el && !el.disabled) {
          return el;
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
      "button[aria-label*='Send']",
      "button[aria-label*='Gửi']",
      "button[aria-label*='Submit']",
      "button[aria-label*='prompt']",
      "button.send-button",
      "button.ds-icon-button",
      "div[role='button'][aria-label*='Send']",
      "button[type='submit']"
    ];

    for (const s of selectors) {
      try {
        const btn = document.querySelector(s);
        if (btn) {
          return btn;
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
        if (customBtn) return customBtn;
      } catch (e) { }
    }

    const selectors = [
      "button[data-testid='stop-button']",
      "button[aria-label*='Stop']",
      "button[aria-label*='Dừng']",
      "button[aria-label*='Cancel']",
      ".result-streaming",
      ".ds-button--stop"
    ];

    for (const s of selectors) {
      try {
        const btn = document.querySelector(s);
        if (btn) {
          return btn;
        }
      } catch (e) { }
    }
    return null;
  }

  // 5. Kiểm tra AI có đang trong trạng thái bận sinh câu trả lời không
  function isAIGenerating(customStopSelector = "") {
    if (findStopButton(customStopSelector)) return true;

    const streamingSelectors = [
      ".result-streaming",
      "[data-is-streaming='true']",
      "div.pulsing",
      ".sparkle-streaming",
      "button[aria-label*='Stop']",
      "button[aria-label*='Dừng']",
      "button[aria-label*='Ngừng']",
      "button[aria-label*='Cancel']"
    ];

    for (const s of streamingSelectors) {
      try {
        if (document.querySelector(s)) return true;
      } catch (e) { }
    }
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

  // 7. Chờ AI rảnh hoàn toàn và ô nhập sẵn sàng nhận văn bản
  async function waitForAIReady(customInputSelector = "", maxWaitMs = 60000) {
    const start = Date.now();
    while (isAIGenerating() && (Date.now() - start < maxWaitMs)) {
      if (stopRequested) return null;
      await new Promise(r => setTimeout(r, 800));
    }

    for (let i = 0; i < 20; i++) {
      if (stopRequested) return null;
      const el = findAIInputBox(customInputSelector);
      if (el && !el.disabled && el.getAttribute("contenteditable") !== "false") {
        return el;
      }
      await new Promise(r => setTimeout(r, 500));
    }
    return findAIInputBox(customInputSelector);
  }

  // 8. Gõ văn bản vào ô nhập (Hỗ trợ 100% cả tab ngầm, đa nền tảng và gộp nhiều đoạn prompt)
  async function typeTextIntoInput(el, text) {
    if (!el || !text) return;
    try { el.focus(); } catch (e) { }

    const isTextarea = el.tagName.toLowerCase() === "textarea" || el.tagName.toLowerCase() === "input";

    if (isTextarea) {
      el.value = text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    // Với ContentEditable (ChatGPT, Claude, Gemini, DeepSeek, ProseMirror...):
    // Phân tách các đoạn prompt để giữ nguyên vẹn cấu trúc đa đoạn
    const paragraphs = text.split(/\n\s*\n+/).map(p => p.trim()).filter(p => p.length > 0);
    const htmlParagraphs = paragraphs.map(p => `<p>${escapeHTML(p).replace(/\n/g, "<br>")}</p>`).join("");

    let successInserted = false;

    // BƯỚC 1: Sử dụng ClipboardEvent("paste") chuẩn HTML + PlainText (Cách tốt nhất cho ProseMirror giữ trọn các đoạn)
    try {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);

      const dt = new DataTransfer();
      dt.setData("text/plain", text);
      dt.setData("text/html", htmlParagraphs);

      const pasteEvt = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dt
      });
      el.dispatchEvent(pasteEvt);

      // Kiểm tra xem ô chat đã nhận đủ nội dung hay chưa
      const insertedLen = (el.textContent || el.innerText || "").trim().length;
      if (insertedLen >= Math.min(text.trim().length * 0.7, 40)) {
        successInserted = true;
      }
    } catch (e) { }

    // BƯỚC 2: Nếu chưa nhận đủ (ví dụ tab nền không hỗ trợ paste hoặc paste bị cắt ngắn), chèn trực tiếp các thẻ <p>
    if (!successInserted || (el.textContent || "").trim() === "") {
      try {
        el.innerHTML = "";
        paragraphs.forEach(para => {
          const p = document.createElement("p");
          p.textContent = para;
          el.appendChild(p);
        });
        el.dispatchEvent(new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType: "insertFromPaste",
          data: text
        }));
        el.dispatchEvent(new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          inputType: "insertFromPaste",
          data: text
        }));
      } catch (e) { }
    }

    // Phát sự kiện input và change
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

    if (sendBtn) {
      try {
        sendBtn.removeAttribute("disabled");
        sendBtn.disabled = false;
        sendBtn.click();
      } catch (e) {
        // Dự phòng nếu click nút lỗi mới dùng Enter
        try {
          inputBox.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true
          }));
        } catch (err) { }
      }
    } else {
      // Nếu trang AI không có nút gửi riêng (chỉ dùng phím Enter)
      try {
        inputBox.dispatchEvent(new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
          bubbles: true
        }));
      } catch (e) { }
    }
    return true;
  }

  // 10. Chờ AI phản hồi xong hoàn toàn (Dựa trên cả nút Stop và độ ổn định văn bản)
  async function waitForAIFinish(maxWaitMs = 180000, customStopSelector = "") {
    const start = Date.now();
    let isGenerating = false;

    // Bước A: Chờ tối đa 12 giây để AI bắt đầu xuất chữ (nút Stop hoặc streaming xuất hiện)
    let lastBodyLen = 0;
    try { lastBodyLen = document.body.innerText.length; } catch (e) { }

    for (let i = 0; i < 24; i++) {
      if (stopRequested) return;
      if (isAIGenerating(customStopSelector)) {
        isGenerating = true;
        break;
      }
      try {
        const curLen = document.body.innerText.length;
        if (curLen > lastBodyLen + 15) {
          isGenerating = true;
          break;
        }
      } catch (e) { }
      await new Promise(r => setTimeout(r, 500));
    }

    // Bước B: Chờ AI sinh xong toàn bộ (nút Stop biến mất VÀ độ dài text ổn định trong 3 chu kỳ liên tiếp)
    let stableCount = 0;
    let prevTextLen = 0;

    while (Date.now() - start < maxWaitMs) {
      if (stopRequested) return;

      const generatingNow = isAIGenerating(customStopSelector);
      let curTextLen = 0;
      try { curTextLen = document.body.innerText.length; } catch (e) { }

      if (generatingNow || (curTextLen !== prevTextLen && curTextLen > 0)) {
        stableCount = 0;
        prevTextLen = curTextLen;
        await new Promise(r => setTimeout(r, 800));
        continue;
      }

      stableCount++;
      if (stableCount >= 3) {
        // Text đã ổn định 2.4s liên tiếp và không còn Stop button -> Hoàn tất!
        break;
      }
      await new Promise(r => setTimeout(r, 800));
    }

    // Đệm thêm 2 giây để giao diện ổn định và ô chat mở khóa trở lại
    await new Promise(r => setTimeout(r, 2000));
  }

  // 11. Tự động nhận diện và tải video sinh ra từ AI về thư mục tương ứng (video1, video2, video3...)
  if (!window.__videoCounterByFolder) window.__videoCounterByFolder = {};

  function checkAndDownloadNewVideos(targetFolder, batchIndex, callerTabId) {
    try {
      if (!window.__ttDownloadedUrls) window.__ttDownloadedUrls = new Set();
      const candidates = [];

      // 1. Quét tất cả thẻ <video>
      document.querySelectorAll("video").forEach(v => {
        if (v.src && !v.src.startsWith("data:")) candidates.push(v.src);
        v.querySelectorAll("source").forEach(s => {
          if (s.src && !s.src.startsWith("data:")) candidates.push(s.src);
        });
      });

      // 2. Quét thẻ <a> có download hoặc đuôi video
      document.querySelectorAll("a[href*='.mp4'], a[href*='.webm'], a[download]").forEach(a => {
        if (a.href && !a.href.startsWith("javascript:")) candidates.push(a.href);
      });

      // 3. Quét các thuộc tính đặc trưng của Muse.ai hoặc các AI Studio
      document.querySelectorAll("[data-video-url], [data-video], [data-src*='.mp4'], [data-src*='.webm']").forEach(el => {
        const u = el.getAttribute("data-video-url") || el.getAttribute("data-video") || el.getAttribute("data-src");
        if (u) candidates.push(u);
      });

      for (const rawUrl of candidates) {
        if (!rawUrl) continue;
        const cleanUrl = rawUrl.trim();
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
          console.log(`[Tune-Text Video] Đã phát hiện video #${videoIndex} và tải vào '${targetFolder}/${vName}':`, cleanUrl);
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
    const batchSize = Math.max(1, parseInt(options.batchSize || options.batch_size, 10) || 1);
    const enablePrefixHeader = (options.enablePrefixHeader !== false);
    const prefixTemplate = options.prefixTemplate || "hãy tạo cho tôi {count} đợt {batch} {code}";
    const specialCode = (options.specialCode || "").trim();
    const targetVideoFolder = options.folderName || "prompts_video";

    // Luôn bắt đầu đếm số thứ tự video từ 1 cho mỗi thư mục
    if (!window.__videoCounterByFolder) window.__videoCounterByFolder = {};
    window.__videoCounterByFolder[targetVideoFolder] = 0;
    if (window.__ttDownloadedUrls) window.__ttDownloadedUrls.clear();

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

        // Ghép câu lệnh mở đầu tự động: Hỗ trợ tùy biến 100% qua template người dùng
        let promptToSend = currentBatch.combinedPrompt;
        let prefixHeader = "";
        if (enablePrefixHeader) {
          prefixHeader = prefixTemplate
            .replace(/{count}/g, currentBatch.count)
            .replace(/{batch}/g, currentBatchIndex)
            .replace(/{code}/g, specialCode)
            .replace(/{folder}/g, targetVideoFolder)
            .replace(/\s+/g, " ")
            .trim();
          if (!prefixHeader.endsWith(":")) {
            prefixHeader += ":";
          }
          promptToSend = `${prefixHeader}\n\n${currentBatch.combinedPrompt}`;
        }

        if (isTimeMode) {
          loopPrefix = `[Lượt ${currentLoop} ${getRemainingStr()}]`;
        }

        updateHUD(`${loopPrefix} Đang chuẩn bị gửi ${batchProgressStr}...`, currentBatchIndex, totalBatchesPerLoop, promptToSend, false, currentLoop, loopCount, currentBatch.rangeLabel);

        // Báo tiến độ về Tab Tune-Text an toàn
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
          status_message: `${loopPrefix} Đang gửi ${batchProgressStr} (Chạy ngầm)...`,
          log: `[Tab AI] ${loopPrefix} Đang gửi ${batchProgressStr}${prefixHeader ? ` [Lệnh: "${prefixHeader}"]` : ''}: "${currentBatch.combinedPrompt.substring(0, 40)}..."`,
          is_completed: false
        });

        const customInputSel = options.inputSelector || options.customInput || "";
        const customSendSel = options.sendSelector || options.customSend || "";
        const customStopSel = options.stopSelector || options.customStop || "";

        // 1. Chờ AI rảnh từ câu trước và tìm ô chat sẵn sàng
        updateHUD(`${loopPrefix} Đang chuẩn bị ô chat cho ${batchProgressStr}...`, currentBatchIndex, totalBatchesPerLoop, "", false, currentLoop, loopCount, currentBatch.rangeLabel);
        let inputBox = await waitForAIReady(customInputSel);

        if (!inputBox) {
          console.warn("Chưa tìm thấy ô nhập liệu, thử lại sau 2 giây...");
          await new Promise(r => setTimeout(r, 2000));
          inputBox = findAIInputBox(customInputSel);
        }

        if (!inputBox) {
          console.error("Không tìm thấy ô nhập liệu.");
          continue;
        }

        // 2. Gõ và gửi đúng 1 lần duy nhất nội dung đã kèm câu mở đầu và mã đặc biệt
        updateHUD(`${loopPrefix} Đang gửi ${batchProgressStr}...`, currentBatchIndex, totalBatchesPerLoop, promptToSend, false, currentLoop, loopCount, currentBatch.rangeLabel);
        await sendSinglePrompt(inputBox, promptToSend, customSendSel, customInputSel);
        if (stopRequested) break;

        // 3. Chờ AI phản hồi xong hoàn toàn (Dựa trên nút Stop và độ ổn định text)
        updateHUD(`${loopPrefix} ${batchProgressStr}: Đang chờ AI xử lý và tạo hình ảnh/video...`, currentBatchIndex, totalBatchesPerLoop, "", false, currentLoop, loopCount, currentBatch.rangeLabel);
        await waitForAIFinish(180000, customStopSel);

        // 4. Tự động kiểm tra và tải Video về thư mục cùng tên tệp prompt nếu trang sinh ra video
        const targetVideoFolder = options.folderName || "prompts_video";
        checkAndDownloadNewVideos(targetVideoFolder, currentBatchIndex, callerTabId);

        // Kiểm tra tiếp sau 3 giây và 6 giây để bắt kịp video render bất đồng bộ
        setTimeout(() => checkAndDownloadNewVideos(targetVideoFolder, currentBatchIndex, callerTabId), 3000);
        setTimeout(() => checkAndDownloadNewVideos(targetVideoFolder, currentBatchIndex, callerTabId), 6000);

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
    // 1. Phản hồi PING để background biết content script đã nạp phiên bản 1.2.1
    if (request.action === "PING") {
      sendResponse({ pong: true, version: "1.2.1" });
      return;
    }

    // 2. Nhận lệnh chạy chuỗi Prompt
    if (request.action === "RUN_PROMPTS") {
      sendResponse({ started: true });

      // ===== DEBUG: In ra tất cả giá trị nhận được để kiểm tra =====
      console.log("===== [Tune-Text] DEBUG RUN_PROMPTS (v1.2.1) =====");
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
      opts.batchSize = (parsedBatchSize && parsedBatchSize > 0) ? parsedBatchSize : 1;
      opts.batch_size = opts.batchSize;

      opts.enablePrefixHeader = (request.enablePrefixHeader !== undefined) ? request.enablePrefixHeader : (opts.enablePrefixHeader !== undefined ? opts.enablePrefixHeader : true);
      opts.prefixTemplate = request.prefixTemplate || opts.prefixTemplate || "hãy tạo cho tôi {count} đợt {batch} {code}";
      opts.specialCode = request.specialCode || opts.specialCode || "";
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
