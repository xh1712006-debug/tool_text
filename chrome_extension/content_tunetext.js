// Content Script chạy trên trang Tune-Text Platform (Hỗ trợ Localhost, Cloudflare Tunnel & Domain riêng an toàn)
(() => {
  const isTuneText = () => {
    return !!(
      document.querySelector('meta[name="tune-text-app"]') ||
      document.querySelector('meta[name="application-name"][content="Tune-Text Platform"]') ||
      (document.title && document.title.includes("Tune-Text Platform")) ||
      document.getElementById("tabMainTuner")
    );
  };

  if (!isTuneText()) {
    return; // Trang web thông thường, bỏ qua an toàn
  }

  console.log("[Tune-Text Extension] Content Script đã nhúng vào Tune-Text thành công!");

  // Đánh dấu để trang Web biết Extension đã sẵn sàng
  function notifyWebPage() {
    document.documentElement.dataset.tuneTextExtension = "active";
    window.dispatchEvent(new CustomEvent("TUNE_TEXT_EXTENSION_ACTIVE", { detail: { version: "1.3.6" } }));
  }

  notifyWebPage();
  // Báo lại sau 500ms và 1.5s để đảm bảo trang nhận diện ngay khi load
  setTimeout(notifyWebPage, 500);
  setTimeout(notifyWebPage, 1500);

  // Lắng nghe lệnh làm mới tiện ích từ trang Web
  window.addEventListener("TUNE_TEXT_RELOAD_EXTENSION", () => {
    chrome.runtime.sendMessage({ action: "RELOAD_EXTENSION" }, () => {
      if (chrome.runtime.lastError) { }
    });
  });

  // Lắng nghe lệnh dừng khẩn cấp từ trang Web
  window.addEventListener("TUNE_TEXT_REQUEST_STOP", () => {
    console.log("[Tune-Text Extension] Nhận yêu cầu DỪNG ROBOT từ Web!");
    chrome.runtime.sendMessage({ action: "STOP_AUTOMATION" }, () => {
      if (chrome.runtime.lastError) { }
    });
  });

  // Lắng nghe sự kiện yêu cầu chạy từ app.js
  window.addEventListener("TUNE_TEXT_REQUEST_START", (event) => {
    const payload = event.detail || {};
    console.log("[Tune-Text Extension] Nhận yêu cầu chạy RPA:", payload);

    const loopCount = parseInt(payload.loopCount || payload.loop_count, 10) || 1;
    const isInfiniteLoop = !!(payload.isInfiniteLoop || payload.is_infinite);
    const durationMinutes = parseFloat(payload.durationMinutes || payload.duration_minutes) || 0;
    const delaySeconds = parseFloat(payload.delaySeconds || payload.delay_between_prompts) || 3;
    const stayInBackground = payload.stayInBackground !== false;
    const batchSize = parseInt(payload.batchSize || payload.batch_size, 10) || 4;
    const enablePrefixHeader = payload.enablePrefixHeader !== false;
    const prefixTemplate = payload.prefixTemplate || "hãy tạo cho tôi {count} video với {count} ảnh tham chiếu trên với promt : {code}";
    const specialCode = payload.specialCode || "Transform the provided image into a 10-second premium editorial";

    const jobOptions = {
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
      folderName: payload.folderName || "prompts_video",
      fileName: payload.fileName || "prompts.txt"
    };

    // 1. Lưu cấu hình vào chrome.storage.local để content_ai.js luôn đọc được trực tiếp
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        tune_text_active_job: Object.assign({}, payload, jobOptions, { timestamp: Date.now() })
      }, () => {
        console.log("[Tune-Text Extension] Đã lưu active_job vào chrome.storage.local:", jobOptions);
      });
    }

    // 2. Gắn trực tiếp options vào mảng prompts để kể cả Service Worker cũ cũng tự động chuyển tiếp
    if (payload.prompts && Array.isArray(payload.prompts)) {
      payload.prompts._jobOptions = jobOptions;
      payload.prompts._loopCount = loopCount;
    }

    chrome.runtime.sendMessage({
      action: "START_IN_ADJACENT_TAB",
      data: Object.assign({}, payload, jobOptions)
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("[Tune-Text Extension] Lỗi:", chrome.runtime.lastError);
        window.dispatchEvent(new CustomEvent("TUNE_TEXT_RESPONSE", {
          detail: { success: false, message: chrome.runtime.lastError.message }
        }));
      } else {
        window.dispatchEvent(new CustomEvent("TUNE_TEXT_RESPONSE", {
          detail: response
        }));
      }
    });
  });

  // Lắng nghe tiến độ báo về từ Background -> báo lại cho trang app.js cập nhật thanh tiến trình
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "RPA_PROGRESS") {
      window.dispatchEvent(new CustomEvent("TUNE_TEXT_PROGRESS_UPDATE", {
        detail: message.data
      }));
    }

    // Tự động nhận URL Colab từ Background
    if (message.action === "AUTO_FILL_STUDIO_URL") {
      console.log("[Tune-Text Extension] Nhận AUTO_FILL_STUDIO_URL:", message.url);
      window.dispatchEvent(new CustomEvent("TUNE_TEXT_AUTO_FILL_STUDIO_URL", {
        detail: { url: message.url }
      }));
    }
  });

  // Lắng nghe yêu cầu lấy URL Colab từ trang Tune-Text
  window.addEventListener("TUNE_TEXT_REQUEST_COLAB_URL", () => {
    chrome.runtime.sendMessage({ action: "GET_COLAB_URL" }, (response) => {
      if (response && response.url) {
        window.dispatchEvent(new CustomEvent("TUNE_TEXT_AUTO_FILL_STUDIO_URL", {
          detail: { url: response.url }
        }));
      } else {
        window.dispatchEvent(new CustomEvent("TUNE_TEXT_AUTO_FILL_STUDIO_URL", {
          detail: { url: null, notFound: true }
        }));
      }
    });
  });
})();

