// Background Service Worker for Tune-Text AI Prompter (v1.0.9)
console.log("[Tune-Text Extension] Service Worker khởi động (v1.0.9).");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Lệnh làm mới Tiện ích trực tiếp từ Web UI
  if (request.action === "RELOAD_EXTENSION") {
    console.log("[Tune-Text Extension] Làm mới Extension...");
    chrome.runtime.reload();
    return;
  }

  // 1. Nhận yêu cầu khởi chạy từ Tab Tune-Text
  if (request.action === "START_IN_ADJACENT_TAB") {
    const rawData = request.data || {};
    const targetUrl = rawData.targetUrl || "https://chatgpt.com";
    const prompts = rawData.prompts || [];
    const platformCode = rawData.platformCode || "chatgpt";
    const callerTabId = sender.tab ? sender.tab.id : null;
    const currentWindowId = sender.tab ? sender.tab.windowId : chrome.windows.WINDOW_ID_CURRENT;

    const loopCount = parseInt(rawData.loopCount || rawData.loop_count, 10) || 1;
    const isInfiniteLoop = !!(rawData.isInfiniteLoop || rawData.is_infinite);
    const durationMinutes = parseFloat(rawData.durationMinutes || rawData.duration_minutes) || 0;
    const delaySeconds = parseFloat(rawData.delaySeconds || rawData.delay_between_prompts) || 3;
    const stayInBackground = rawData.stayInBackground !== false;
    const batchSize = parseInt(rawData.batchSize || rawData.batch_size, 10) || 1;

    const runOptions = {
      loopCount: loopCount,
      loop_count: loopCount,
      isInfiniteLoop: isInfiniteLoop,
      is_infinite: isInfiniteLoop,
      durationMinutes: durationMinutes,
      duration_minutes: durationMinutes,
      delaySeconds: delaySeconds,
      delay_between_prompts: delaySeconds,
      stayInBackground: stayInBackground,
      batchSize: batchSize,
      batch_size: batchSize,
      inputSelector: rawData.inputSelector || rawData.customInput || null,
      sendSelector: rawData.sendSelector || rawData.customSend || null,
      stopSelector: rawData.stopSelector || rawData.customStop || null
    };

    console.log("[Tune-Text BG] Bắt đầu xử lý START_IN_ADJACENT_TAB:", { targetUrl, platformCode, loopCount, isInfiniteLoop, durationMinutes, delaySeconds, batchSize });

    // Lưu vào storage để content_ai.js luôn có thể truy xuất
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ tune_text_active_job: Object.assign({}, rawData, runOptions) });
    }

    // Tách hostname và root domain của trang AI mục tiêu (ví dụ: claude.ai, gemini.google.com, chatgpt.com, deepseek.com...)
    let targetHostname = "";
    let targetRootDomain = "";
    try {
      const parsedUrl = new URL(targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`);
      targetHostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
      const hostParts = targetHostname.split(".");
      targetRootDomain = hostParts.length >= 2 ? hostParts.slice(-2).join(".") : targetHostname;
    } catch (e) {
      targetHostname = "chatgpt.com";
      targetRootDomain = "chatgpt.com";
    }

    function isAIMatchTab(t) {
      if (!t || !t.url) return false;
      const u = t.url.toLowerCase();
      if (u.startsWith("chrome://") || u.startsWith("edge://") || u.startsWith("about:")) return false;
      if (u.includes("localhost:8000") || u.includes("127.0.0.1:8000")) return false;

      // 1. Khớp chính xác domain mục tiêu
      if (targetHostname && u.includes(targetHostname)) return true;
      if (targetRootDomain && targetRootDomain.length > 3 && u.includes(targetRootDomain)) return true;

      // 2. Khớp theo platformCode nếu có
      if (platformCode && platformCode !== "custom" && u.includes(platformCode)) return true;

      return false;
    }

    const runPayload = {
      action: "RUN_PROMPTS",
      prompts: prompts,
      batchSize: batchSize,
      batch_size: batchSize,
      loopCount: loopCount,
      loop_count: loopCount,
      isInfiniteLoop: isInfiniteLoop,
      is_infinite: isInfiniteLoop,
      durationMinutes: durationMinutes,
      duration_minutes: durationMinutes,
      delaySeconds: delaySeconds,
      delay_between_prompts: delaySeconds,
      targetUrl: targetUrl,
      platformCode: platformCode,
      callerTabId: callerTabId,
      inputSelector: runOptions.inputSelector,
      sendSelector: runOptions.sendSelector,
      stopSelector: runOptions.stopSelector,
      options: runOptions
    };

    // Hàm thực hiện gửi lệnh chạy vào tab AI
    const executeOnTab = (aiTab) => {
      console.log(`[Tune-Text Extension] Thực thi trên tab: #${aiTab.id} (${aiTab.title || aiTab.url})`);

      const triggerExecution = () => {
        const sendRunMessage = () => {
          chrome.tabs.sendMessage(aiTab.id, runPayload, (res) => {
            if (chrome.runtime.lastError) {
              console.warn("[Tune-Text BG] Lỗi gửi RUN_PROMPTS:", chrome.runtime.lastError.message);
            } else {
              console.log("[Tune-Text BG] RUN_PROMPTS phản hồi thành công:", res);
            }
          });
        };

        // Kiểm tra xem tab AI đã có content script v1.0.9 chưa
        const EXT_VER = "1.0.9";
        chrome.tabs.sendMessage(aiTab.id, { action: "PING" }, (pingRes) => {
          if (chrome.runtime.lastError || !pingRes || pingRes.version !== EXT_VER) {
            console.log(`[Tune-Text BG] Tab AI đang chạy bản cũ hoặc chưa sẵn sàng. Đang nạp mã v${EXT_VER}...`);
            chrome.scripting.executeScript({
              target: { tabId: aiTab.id },
              files: ["content_ai.js"]
            }).then(() => {
              chrome.scripting.insertCSS({
                target: { tabId: aiTab.id },
                files: ["styles.css"]
              }).catch(() => {});
            }).catch(() => {
              console.log("[Tune-Text BG] Tải lại tab để nạp lại script mới...");
              chrome.tabs.reload(aiTab.id);
            }).finally(() => {
              setTimeout(sendRunMessage, 1200);
            });
          } else {
            // Tab AI đã chạy bản mới nhất v1.0.9 -> Gửi lệnh chạy ngay!
            sendRunMessage();
          }
        });
      };

      if (!runOptions.stayInBackground) {
        chrome.tabs.update(aiTab.id, { active: true }, triggerExecution);
      } else {
        triggerExecution();
      }

      sendResponse({
        success: true,
        tabTitle: aiTab.title || targetHostname,
        message: `Đã kết nối vào tab ${aiTab.title || targetHostname} thành công!`
      });
    };

    // 1. Quét trong cửa sổ hiện tại trước
    chrome.tabs.query({ windowId: currentWindowId }, (currentTabs) => {
      let aiTab = (currentTabs || []).find(isAIMatchTab);

      if (aiTab) {
        executeOnTab(aiTab);
      } else {
        // 2. Nếu không tìm thấy, quét toàn bộ các cửa sổ Chrome khác
        chrome.tabs.query({}, (allTabs) => {
          aiTab = (allTabs || []).find(isAIMatchTab);

          if (aiTab) {
            executeOnTab(aiTab);
          } else {
            // 3. Chưa có tab AI mục tiêu nào mở -> Mở tab mới với targetUrl
            console.log(`[Tune-Text Extension] Chưa có tab ${targetUrl} mở sẵn, đang mở tab mới bên cạnh...`);
            const newIndex = sender.tab ? sender.tab.index + 1 : undefined;
            chrome.tabs.create({ url: targetUrl, index: newIndex, active: true }, (newTab) => {
              const listener = (tabId, info) => {
                if (tabId === newTab.id && info.status === "complete") {
                  chrome.tabs.onUpdated.removeListener(listener);
                  setTimeout(() => {
                    executeOnTab(newTab);
                  }, 2500);
                }
              };
              chrome.tabs.onUpdated.addListener(listener);
              sendResponse({
                success: true,
                tabTitle: "Tab AI Mới",
                message: `Đã mở tab ${targetUrl} mới bên cạnh và bắt đầu tự động hóa!`
              });
            });
          }
        });
      }
    });

    return true; // Trả lời bất đồng bộ
  }

  // 2. Chuyển tiếp tiến độ từ Tab AI về lại Tab Tune-Text an toàn (Không sinh lỗi nếu tab đóng hoặc F5)
  if (request.action === "REPORT_PROGRESS" && request.callerTabId) {
    chrome.tabs.sendMessage(request.callerTabId, {
      action: "RPA_PROGRESS",
      data: request.data
    }, () => {
      if (chrome.runtime.lastError) {
        // Tab Tune-Text đã đóng hoặc F5 tải lại, bỏ qua an toàn mà không sinh lỗi đỏ
      }
    });
  }
});
