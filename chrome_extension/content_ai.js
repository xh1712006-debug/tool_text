// Content Script chạy trực tiếp trên ChatGPT, Claude, Gemini... (Hỗ trợ 100% chạy ngầm / Background Tab)
(() => {
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

  function updateHUD(status, current, total, previewText = "", isError = false, currentLoop = 1, loopCount = 1) {
    createOrGetHUD();
    const statusEl = document.getElementById("tt-hud-status");
    const counterEl = document.getElementById("tt-hud-counter");
    const fillEl = document.getElementById("tt-progress-bar-fill");
    const previewEl = document.getElementById("tt-hud-preview");

    if (statusEl) statusEl.textContent = status;
    if (statusEl) statusEl.style.color = isError ? "#f87171" : "#38bdf8";

    if (counterEl) {
      if (loopCount > 1 && loopCount < 999999) {
        counterEl.textContent = `Lượt ${currentLoop}/${loopCount} • Đoạn ${current}/${total}`;
      } else if (loopCount >= 999999) {
        counterEl.textContent = `Lượt ${currentLoop} (Vô hạn) • Đoạn ${current}/${total}`;
      } else {
        counterEl.textContent = `${current} / ${total} đoạn`;
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
        el.innerHTML = "<p><br></p>";
        el.dispatchEvent(new InputEvent("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } catch (e) { }
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

  // 8. Gõ văn bản vào ô nhập (Hỗ trợ 100% cả tab ngầm và đa nền tảng)
  async function typeTextIntoInput(el, text) {
    try { el.focus(); } catch (e) { }

    const isTextarea = el.tagName.toLowerCase() === "textarea" || el.tagName.toLowerCase() === "input";

    if (isTextarea) {
      el.value = text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    // Với ChatGPT contenteditable (ProseMirror):
    let inserted = false;
    if (document.hasFocus()) {
      try {
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand("delete", false, null);
        inserted = document.execCommand("insertText", false, text);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      } catch (e) { }
    }

    // Cách 2: Nếu tab ở chế độ ngầm: Thử phát ClipboardEvent hoặc chèn node chuẩn ProseMirror
    if (!inserted || el.textContent.trim() === "") {
      try {
        el.innerHTML = "";
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

    // Cách 3: Dự phòng chèn DOM Node trực tiếp và phát sự kiện beforeinput + InputEvent
    if (el.textContent.trim() === "") {
      try {
        el.innerHTML = "";
        const p = document.createElement("p");
        p.textContent = text;
        el.appendChild(p);
        el.dispatchEvent(new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: text
        }));
        el.dispatchEvent(new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: text
        }));
      } catch (e) { }
    }

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
    await new Promise(r => setTimeout(r, 500));

    // 4. Bấm nút Gửi ĐÚNG 1 LẦN DUY NHẤT (Ưu tiên nút Send native của trình duyệt)
    let sendBtn = findSendButton(customSendSelector);
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

    const startTime = Date.now();
    const maxDurationMs = isTimeMode ? durationMinutes * 60 * 1000 : null;

    function getRemainingStr() {
      if (!maxDurationMs) return "";
      const remainMs = Math.max(0, maxDurationMs - (Date.now() - startTime));
      const m = Math.floor(remainMs / 60000);
      const s = Math.floor((remainMs % 60000) / 1000);
      return `[Còn ${m}p${s < 10 ? '0' : ''}${s}s]`;
    }

    console.log(`[Tune-Text Content AI] Khởi động tự động hóa: ${totalPromptsPerLoop} đoạn/lượt | Chế độ: ${isTimeMode ? durationMinutes + ' phút' : (isInfinite ? 'Vô hạn' : loopCount + ' lượt')} | Nghỉ: ${delayBetweenLoops}s`, options);

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

      for (let idx = 0; idx < totalPromptsPerLoop; idx++) {
        if (stopRequested) break;

        // Kiểm tra thời lượng tối đa
        if (maxDurationMs && (Date.now() - startTime >= maxDurationMs)) {
          console.log(`[Tune-Text Content AI] Đã đạt thời lượng tối đa ${durationMinutes} phút.`);
          stopRequested = true;
          break;
        }

        const currentPrompt = prompts[idx];
        const currentIndex = idx + 1;

        if (isTimeMode) {
          loopPrefix = `[Lượt ${currentLoop} ${getRemainingStr()}]`;
        }

        updateHUD(`${loopPrefix} Đang gõ đoạn ${currentIndex}/${totalPromptsPerLoop}...`, currentIndex, totalPromptsPerLoop, currentPrompt, false, currentLoop, loopCount);

        // Báo tiến độ về Tab Tune-Text
        chrome.runtime.sendMessage({
          action: "REPORT_PROGRESS",
          callerTabId: callerTabId,
          data: {
            current_index: currentIndex,
            total_prompts: totalPromptsPerLoop,
            current_loop: currentLoop,
            loop_count: loopCount,
            duration_minutes: durationMinutes,
            remaining_time_str: getRemainingStr(),
            status_message: `${loopPrefix} Đang gõ đoạn ${currentIndex}/${totalPromptsPerLoop} (Chạy ngầm)...`,
            log: `[Tab AI] ${loopPrefix} Đang nhập đoạn ${currentIndex}/${totalPromptsPerLoop}: "${currentPrompt.substring(0, 40)}..."`,
            is_completed: false
          }
        });

        const customInputSel = options.inputSelector || options.customInput || "";
        const customSendSel = options.sendSelector || options.customSend || "";
        const customStopSel = options.stopSelector || options.customStop || "";

        // 1. Chờ AI rảnh từ câu trước và tìm ô chat sẵn sàng
        updateHUD(`${loopPrefix} Đang chuẩn bị ô chat cho đoạn ${currentIndex}...`, currentIndex, totalPromptsPerLoop);
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

        // 2. Gõ và gửi đúng 1 lần duy nhất (Không spam, không gửi đúp)
        updateHUD(`${loopPrefix} Đang gửi đoạn ${currentIndex}/${totalPromptsPerLoop}...`, currentIndex, totalPromptsPerLoop, currentPrompt, false, currentLoop, loopCount);
        await sendSinglePrompt(inputBox, currentPrompt, customSendSel, customInputSel);
        if (stopRequested) break;

        // 3. Chờ AI phản hồi xong hoàn toàn (Dựa trên nút Stop và độ ổn định text)
        updateHUD(`${loopPrefix} Đoạn ${currentIndex}/${totalPromptsPerLoop}: Đang chờ AI trả lời xong...`, currentIndex, totalPromptsPerLoop, "", false, currentLoop, loopCount);
        await waitForAIFinish(180000, customStopSel);

        // Báo hoàn thành đoạn này (Chỉ đánh dấu is_completed khi đã chạy đến đoạn cuối của lượt cuối VÀ KHÔNG PHẢI chế độ thời gian / vô hạn)
        const isAllLoopsCompleted = (!isTimeMode && !isInfinite && currentLoop === loopCount && currentIndex === totalPromptsPerLoop);
        chrome.runtime.sendMessage({
          action: "REPORT_PROGRESS",
          callerTabId: callerTabId,
          data: {
            current_index: currentIndex,
            total_prompts: totalPromptsPerLoop,
            current_loop: currentLoop,
            loop_count: loopCount,
            duration_minutes: durationMinutes,
            remaining_time_str: getRemainingStr(),
            status_message: `${loopPrefix} Đoạn ${currentIndex}/${totalPromptsPerLoop} đã phản hồi xong.`,
            log: `[Tab AI] ${loopPrefix} Đoạn ${currentIndex}/${totalPromptsPerLoop} đã được AI phản hồi hoàn tất.`,
            is_completed: isAllLoopsCompleted
          }
        });

        // Nghỉ giữa các đoạn trong cùng một lượt
        if (idx < totalPromptsPerLoop - 1) {
          updateHUD(`${loopPrefix} Đã xong đoạn ${currentIndex}. Chờ 3s...`, currentIndex, totalPromptsPerLoop);
          await new Promise(r => setTimeout(r, 3000));
        }
      }

      if (stopRequested) break;

      // Kiểm tra thời lượng trước lượt mới
      if (maxDurationMs && (Date.now() - startTime >= maxDurationMs)) {
        updateHUD(`⏱️ Đã hết ${durationMinutes} phút. Hoàn thành!`, totalPromptsPerLoop, totalPromptsPerLoop);
        break;
      }

      // ĐẾM NGƯỢC NGHỈ TRƯỚC KHI BẮT ĐẦU LƯỢT TIẾP THEO
      if (loopIdx < loopCount - 1) {
        const nextLoop = currentLoop + 1;
        const totalDelay = Math.max(1, Math.ceil(delayBetweenLoops));
        const remNotice = isTimeMode ? ` ${getRemainingStr()}` : "";

        // Thông báo sang Tab Tune-Text để hiển thị vào nhật ký
        chrome.runtime.sendMessage({
          action: "REPORT_PROGRESS",
          callerTabId: callerTabId,
          data: {
            current_index: totalPromptsPerLoop,
            total_prompts: totalPromptsPerLoop,
            current_loop: currentLoop,
            loop_count: loopCount,
            duration_minutes: durationMinutes,
            remaining_time_str: getRemainingStr(),
            status_message: `✅ Xong lượt ${currentLoop}! Đang nghỉ ${totalDelay}s trước khi gõ lượt ${nextLoop}...${remNotice}`,
            log: `[Tab AI] ✅ Xong lượt ${currentLoop}! Nghỉ ${totalDelay}s rồi tự động gõ tiếp lượt ${nextLoop}...${remNotice}`,
            is_completed: false
          }
        });

        for (let s = totalDelay; s > 0; s--) {
          if (stopRequested) break;
          if (maxDurationMs && (Date.now() - startTime >= maxDurationMs)) {
            stopRequested = true;
            break;
          }
          const subRem = isTimeMode ? ` ${getRemainingStr()}` : "";
          updateHUD(`✅ Xong lượt ${currentLoop}! Nghỉ ${s}s rồi tự động gõ lượt ${nextLoop}...${subRem}`, totalPromptsPerLoop, totalPromptsPerLoop);
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

    updateHUD(finalMsg, totalPromptsPerLoop, totalPromptsPerLoop);
    chrome.runtime.sendMessage({
      action: "REPORT_PROGRESS",
      callerTabId: callerTabId,
      data: {
        current_index: totalPromptsPerLoop,
        total_prompts: totalPromptsPerLoop,
        current_loop: currentLoop,
        loop_count: loopCount,
        duration_minutes: durationMinutes,
        remaining_time_str: "",
        status_message: finalMsg,
        log: `[Tab AI] ${finalMsg}`,
        is_completed: true
      }
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
    // 1. Phản hồi PING để background biết content script đã nạp phiên bản 1.0.7
    if (request.action === "PING") {
      sendResponse({ pong: true, version: "1.0.7" });
      return;
    }

    // 2. Nhận lệnh chạy chuỗi Prompt
    if (request.action === "RUN_PROMPTS") {
      sendResponse({ started: true });

      // ===== DEBUG: In ra tất cả giá trị nhận được để kiểm tra =====
      console.log("===== [Tune-Text] DEBUG RUN_PROMPTS (v1.0.7) =====");
      console.log("  request.targetUrl       =", request.targetUrl);
      console.log("  request.platformCode    =", request.platformCode);
      console.log("  request.loopCount       =", request.loopCount, typeof request.loopCount);
      console.log("  request.isInfiniteLoop  =", request.isInfiniteLoop);
      console.log("  request.durationMinutes =", request.durationMinutes);
      console.log("  request.delaySeconds    =", request.delaySeconds);
      console.log("  request.inputSelector   =", request.inputSelector);
      console.log("  request.sendSelector    =", request.sendSelector);
      console.log("  request.prompts.length  =", (request.prompts || []).length);
      console.log("==================================================");

      const opts = Object.assign({}, request.options || {});
      // Ưu tiên lấy trực tiếp từ request message (do background.js gửi) trước
      const rawLoopCount = request.loopCount || request.loop_count || opts.loopCount || opts.loop_count;
      const loopCount = parseInt(rawLoopCount, 10);
      if (loopCount && loopCount > 0) {
        opts.loopCount = loopCount;
        opts.loop_count = loopCount;
      }
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
