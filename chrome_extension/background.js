// Background Service Worker for Tune-Text AI Prompter (v1.2.1)
console.log("[Tune-Text Extension] Service Worker khởi động (v1.2.1).");

// Quản lý bộ đếm video cho từng thư mục (luôn bắt đầu từ video1, video2...)
const folderVideoCounters = {};

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
    const enablePrefixHeader = rawData.enablePrefixHeader !== false;
    const prefixTemplate = rawData.prefixTemplate || "hãy tạo cho tôi {count} đợt {batch} {code}";
    const specialCode = rawData.specialCode || "";

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
      enablePrefixHeader: enablePrefixHeader,
      prefixTemplate: prefixTemplate,
      specialCode: specialCode,
      folderName: rawData.folderName || "prompts_video",
      fileName: rawData.fileName || "prompts.txt",
      inputSelector: rawData.inputSelector || rawData.customInput || null,
      sendSelector: rawData.sendSelector || rawData.customSend || null,
      stopSelector: rawData.stopSelector || rawData.customStop || null
    };

    const cleanFolder = (rawData.folderName || rawData.fileName || "prompts_video").replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1EA0-\u1EF9 ]/g, "").trim() || "prompts_video";
    // Đặt lại bộ đếm video cho thư mục này để bắt đầu từ video1
    folderVideoCounters[cleanFolder] = 0;

    console.log("[Tune-Text BG] Bắt đầu xử lý START_IN_ADJACENT_TAB:", { targetUrl, platformCode, loopCount, isInfiniteLoop, durationMinutes, delaySeconds, batchSize, enablePrefixHeader, specialCode, folderName: cleanFolder });

    // Lưu vào storage để content_ai.js luôn có thể truy xuất
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ 
        tune_text_active_job: Object.assign({}, rawData, runOptions),
        tune_text_active_folder: cleanFolder
      });
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
      if (callerTabId && t.id === callerTabId) return false;
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
      enablePrefixHeader: enablePrefixHeader,
      prefixTemplate: prefixTemplate,
      specialCode: specialCode,
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
      folderName: cleanFolder,
      fileName: runOptions.fileName,
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
              const errMsg = chrome.runtime.lastError.message;
              console.warn("[Tune-Text BG] Lỗi gửi RUN_PROMPTS:", errMsg);
              if (callerTabId) {
                chrome.tabs.sendMessage(callerTabId, {
                  action: "RPA_PROGRESS",
                  data: {
                    status_message: `⚠️ Lỗi kết nối Tab AI: ${errMsg}`,
                    log: `[Lỗi Robot] Không thể kết nối với tab AI (${aiTab.title || targetHostname}). Lỗi: ${errMsg}. Vui lòng bấm F5 tải lại tab AI rồi bấm Khởi Chạy lại!`,
                    is_completed: false
                  }
                }, () => { if (chrome.runtime.lastError) { } });
              }
            } else {
              console.log("[Tune-Text BG] RUN_PROMPTS phản hồi thành công:", res);
            }
          });
        };

        // Kiểm tra xem tab AI đã có content script v1.2.0 chưa
        const EXT_VER = "1.2.0";
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
              }).catch(() => { });
            }).catch(() => {
              console.log("[Tune-Text BG] Tải lại tab để nạp lại script mới...");
              chrome.tabs.reload(aiTab.id);
            }).finally(() => {
              setTimeout(sendRunMessage, 1200);
            });
          } else {
            // Tab AI đã chạy bản mới nhất v1.1.0 -> Gửi lệnh chạy ngay!
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

    // Hàm nhận diện tab AI đang mở (dự phòng trường hợp người dùng mở sẵn Gemini/Claude mà dropdown để ChatGPT)
    function isAnyOpenAITab(t) {
      if (!t || !t.url) return false;
      if (callerTabId && t.id === callerTabId) return false;
      const u = t.url.toLowerCase();
      if (u.startsWith("chrome://") || u.startsWith("edge://") || u.startsWith("about:")) return false;
      if (u.includes("localhost:8000") || u.includes("127.0.0.1:8000")) return false;
      const knownDomains = ["gemini.google.com", "chatgpt.com", "claude.ai", "deepseek.com", "poe.com", "perplexity.ai", "muse.ai"];
      return knownDomains.some(d => u.includes(d));
    }

    // 1. Quét trong cửa sổ hiện tại trước
    chrome.tabs.query({ windowId: currentWindowId }, (currentTabs) => {
      let aiTab = (currentTabs || []).find(isAIMatchTab);

      // Nếu không khớp trực tiếp, kiểm tra xem có tab AI nào khác đang mở sẵn trong cửa sổ này không
      if (!aiTab) {
        aiTab = (currentTabs || []).find(isAnyOpenAITab);
      }

      if (aiTab) {
        executeOnTab(aiTab);
      } else {
        // 2. Nếu không tìm thấy, quét toàn bộ các cửa sổ Chrome khác
        chrome.tabs.query({}, (allTabs) => {
          aiTab = (allTabs || []).find(isAIMatchTab) || (allTabs || []).find(isAnyOpenAITab);

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

  // 3. Tự động tải Video về thư mục riêng theo tên tệp prompt (luôn bắt đầu từ video1, video2...)
  if (request.action === "DOWNLOAD_AI_VIDEO" && request.videoUrl) {
    chrome.storage.local.get(["tune_text_active_folder"], (stored) => {
      const activeFolder = (request.folderName || stored.tune_text_active_folder || "prompts_video").replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1EA0-\u1EF9 ]/g, "").trim() || "prompts_video";
      
      // Đếm số thứ tự video bắt đầu từ 1 cho mỗi thư mục
      if (typeof folderVideoCounters[activeFolder] === "undefined") {
        folderVideoCounters[activeFolder] = 0;
      }
      if (request.videoIndex) {
        folderVideoCounters[activeFolder] = request.videoIndex;
      } else {
        folderVideoCounters[activeFolder] += 1;
      }
      const videoNum = folderVideoCounters[activeFolder];

      let ext = "mp4";
      if (request.videoUrl.includes(".webm") || (request.fileName && request.fileName.endsWith(".webm"))) {
        ext = "webm";
      }

      const cleanFileName = `video${videoNum}.${ext}`;
      const downloadPath = `TuneText_Videos/${activeFolder}/${cleanFileName}`;

      console.log(`[Tune-Text BG] Bắt đầu tải video #${videoNum} vào: ${downloadPath}`);
      chrome.downloads.download({
        url: request.videoUrl,
        filename: downloadPath,
        saveAs: false,
        conflictAction: "uniquify"
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("[Tune-Text BG] Lỗi khi gọi chrome.downloads:", chrome.runtime.lastError.message);
        } else {
          console.log(`[Tune-Text BG] Đã kích hoạt tải video vào '${downloadPath}' (ID: ${downloadId})`);
          if (request.callerTabId) {
            chrome.tabs.sendMessage(request.callerTabId, {
              action: "RPA_PROGRESS",
              data: {
                status_message: `📥 Đã tải video${videoNum}.${ext} vào thư mục '${activeFolder}'`,
                log: `[Tải Video] Đã tự động lưu: Downloads/TuneText_Videos/${activeFolder}/video${videoNum}.${ext}`,
                is_completed: false
              }
            }, () => { if (chrome.runtime.lastError) { } });
          }
        }
      });
    });
  }
});
