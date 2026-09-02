(async function () {
  "use strict";

  const DOM = {
    appContainer: document.getElementById("appContainer"),
    editorialSidebar: document.getElementById("editorialSidebar"),
    sidebarMobileBackdrop: document.getElementById("sidebarMobileBackdrop"),
    sidebarBrandBtn:
      document.getElementById("sidebarLogoBtn") ||
      document.getElementById("sidebarBrandBtn"),
    sidebarToggleCollapseBtn:
      document.getElementById("sidebarCollapseToggleBtn") ||
      document.getElementById("sidebarToggleCollapseBtn"),
    headerSidebarToggleBtn: document.getElementById("headerSidebarToggleBtn"),
    sidebarNewChatBtn: document.getElementById("sidebarNewChatBtn"),
    sidebarSearchInput: document.getElementById("sidebarSearchInput"),
    sidebarSearchRailBtn:
      document.getElementById("railSearchIconBtn") ||
      document.getElementById("sidebarSearchRailBtn"),
    helpButtonLink: document.getElementById("helpModalBtn"),
    sidebarNotebooksLink:
      document.getElementById("sidebarNotebooksBtn") ||
      document.getElementById("sidebarNotebooksLink"),
    sidebarChatCount:
      document.getElementById("sidebarHistoryCount") ||
      document.getElementById("sidebarChatCount"),
    sidebarChatList:
      document.getElementById("sidebarHistoryList") ||
      document.getElementById("sidebarChatList"),
    sidebarUserProfile:
      document.getElementById("userProfileRow") ||
      document.getElementById("sidebarUserProfile"),
    sidebarSettingsBtn:
      document.getElementById("settingsModalBtn") ||
      document.getElementById("sidebarSettingsBtn"),
    heroStage: document.getElementById("heroInquiryStage"),
    heroCuratedPills: document.getElementById("heroCuratedPills"),
    chatStage: document.getElementById("chatConversationStage"),
    messagesStream: document.getElementById("messagesStreamContainer"),
    threadTitle: document.getElementById("threadTitleDisplay"),
    threadSearchInput: document.getElementById("threadSearchInput"),
    newChatTopBtn: document.getElementById("newChatTopBtn"),
    exportChatBtn: document.getElementById("exportChatBtn"),
    clearStreamBtn: document.getElementById("clearStreamBtn"),
    composerInput: document.getElementById("composerMainInput"),
    composerSendBtn: document.getElementById("composerSendBtn"),
    composerAttachBtn: document.getElementById("composerAttachBtn"),
    hiddenMediaInput: document.getElementById("hiddenMediaInput"),
    composerMediaPreview: document.getElementById("composerMediaPreview"),
    activeModelLabel: document.getElementById("activeModelLabel"),
    modelPickerPopover: document.getElementById("modelPickerPopover"),
    brandLogoBtn: document.getElementById("brandLogoBtn"),
    liveClock: document.getElementById("liveClock"),
    themeToggleBtn: document.getElementById("themeToggleBtn"),
    settingsModalBackdrop: document.getElementById("settingsModalBackdrop"),
    closeSettingsModalBtn: document.getElementById("closeSettingsModalBtn"),
    saveSettingsBtn: document.getElementById("saveSettingsBtn"),
    settingSystemPrompt: document.getElementById("settingSystemPrompt"),
    settingTemperature: document.getElementById("settingTemperature"),
    tempValueLabel: document.getElementById("tempValueLabel"),
    settingCustomApiKey: document.getElementById("settingCustomApiKey"),
    toastContainer: document.getElementById("toastContainer"),
  };

  const thinkingTimers = {};

  const activeRequests = new Map();

  const state = {
    isHeroActive: true,
    currentSessionId: null,
    sessions: [],
    attachedMedia: null,
    isListening: false,
    messages: [],
  };

  async function init() {
    try {
      const rawSessions = await window.GetItem("aura_editorial_sessions");
      if (rawSessions) {
        const parsed = JSON.parse(rawSessions);
        if (Array.isArray(parsed)) state.sessions = parsed;
      }
    } catch (e) {
      console.error("[AURA] Session loading failed:", e);
      state.sessions = [];
    }
    try {
      const result = await window.AURADownload.open(
        "Memory Model",
        "fastembed",
      );
      console.log(result);
    } catch { }
    setupListeners();
    renderSidebarChats();
    await setupSidebarState();
    await applyPreferences();
  }

  async function getWebApi() {
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Python API connection timed out")),
          5000,
        ),
      );
      const bridge = await Promise.race([window.web_api_ready, timeout]);
      if (!bridge) throw new Error("Python API is null");
      return bridge;
    } catch (error) {
      console.error("[CORE] Failed to get Python API:", error);
      showWebApiErrorCard();
      return null;
    }
  }

  function showWebApiErrorCard(message) {
    if (document.querySelector(".web-api-error-card")) return;
    const card = document.createElement("div");
    card.className = "web-api-error-card";
    card.innerHTML = `
    <div class="web-api-error-icon">⚠️</div>
    <div class="web-api-error-content">
      <h3>Unable to connect to WebView API</h3>
      <p class="web-api-error-message"></p>
      <a href="https://github.com/TIScare0/gp_smartdesk/issues/new" target="_blank" rel="noopener noreferrer">Report on GitHub →</a>
    </div>`;
    card.querySelector(".web-api-error-message").textContent =
      message || "The Python API could not be reached within 5 seconds.";
    document.body.appendChild(card);
  }

  async function setupSidebarState() {
    const savedState =
      (await window.GetItem("aura_sidebar_state")) || "expanded";
    if (window.innerWidth > 768) {
      if (savedState === "collapsed") {
        DOM.appContainer?.classList.remove("sidebar-expanded");
        DOM.appContainer?.classList.add("sidebar-collapsed");
      } else {
        DOM.appContainer?.classList.remove("sidebar-collapsed");
        DOM.appContainer?.classList.add("sidebar-expanded");
      }
    } else {
      DOM.appContainer?.classList.remove("sidebar-collapsed");
      DOM.appContainer?.classList.add("sidebar-expanded");
    }
  }

  function toggleSidebar() {
    if (window.innerWidth <= 768) {
      DOM.appContainer?.classList.toggle("sidebar-mobile-open");
    } else {
      const isCollapsed =
        DOM.appContainer?.classList.contains("sidebar-collapsed");
      if (isCollapsed) {
        DOM.appContainer?.classList.remove("sidebar-collapsed");
        DOM.appContainer?.classList.add("sidebar-expanded");
        window.StoreItem("aura_sidebar_state", "expanded");
      } else {
        DOM.appContainer?.classList.remove("sidebar-expanded");
        DOM.appContainer?.classList.add("sidebar-collapsed");
        window.StoreItem("aura_sidebar_state", "collapsed");
      }
    }
  }

  function closeMobileSidebar() {
    DOM.appContainer?.classList.remove("sidebar-mobile-open");
  }

  function setupListeners() {
    DOM.heroCuratedPills?.addEventListener("click", (e) => {
      const pill = e.target.closest(".inquiry-pill");
      if (!pill) return;
      const prompt = pill.getAttribute("data-prompt");
      const title = pill.querySelector(".pill-label")?.innerText || "Inquiry";
      startConversation(prompt, title);
    });
    DOM.sidebarBrandBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      if (DOM.appContainer?.classList.contains("sidebar-collapsed"))
        toggleSidebar();
      else returnToHero();
    });
    DOM.sidebarToggleCollapseBtn?.addEventListener("click", toggleSidebar);
    DOM.headerSidebarToggleBtn?.addEventListener("click", toggleSidebar);
    DOM.sidebarMobileBackdrop?.addEventListener("click", closeMobileSidebar);
    DOM.brandLogoBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      if (window.innerWidth <= 768) toggleSidebar();
      else returnToHero();
    });
    DOM.newChatTopBtn?.addEventListener("click", returnToHero);
    DOM.sidebarNewChatBtn?.addEventListener("click", () => {
      returnToHero();
      if (window.innerWidth <= 768) closeMobileSidebar();
    });
    DOM.sidebarSearchInput?.addEventListener("input", (e) =>
      renderSidebarChats(e.target.value),
    );
    DOM.sidebarSearchRailBtn?.addEventListener("click", () => {
      if (DOM.appContainer?.classList.contains("sidebar-collapsed")) {
        toggleSidebar();
        setTimeout(() => DOM.sidebarSearchInput?.focus(), 320);
      }
    });
    DOM.sidebarNotebooksLink?.addEventListener("click", () => {
      startConversation(
        "Draft an architectural and sensory design journal entry focusing on light, materiality, and minimalist Nordic forms.",
        "Architectural Notebook",
      );
      if (window.innerWidth <= 768) closeMobileSidebar();
    });
    DOM.sidebarSettingsBtn?.addEventListener("click", openSettings);
    DOM.helpButtonLink?.addEventListener("click", openHelp);
    DOM.composerInput?.addEventListener("input", () => {
      DOM.composerInput.style.height = "auto";
      DOM.composerInput.style.height =
        Math.min(DOM.composerInput.scrollHeight, 140) + "px";
      if (DOM.composerSendBtn)
        DOM.composerSendBtn.disabled =
          !DOM.composerInput.value.trim() && !state.attachedMedia;
    });
    DOM.composerInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitComposer();
      }
    });
    DOM.composerSendBtn?.addEventListener("click", submitComposer);
    DOM.composerAttachBtn?.addEventListener("click", () =>
      DOM.hiddenMediaInput?.click(),
    );
    DOM.hiddenMediaInput?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          state.attachedMedia = {
            name: file.name,
            type: file.type,
            dataUrl: loadEvt.target.result,
          };
          renderMediaPreview();
          if (DOM.composerSendBtn) DOM.composerSendBtn.disabled = false;
        };
        reader.readAsDataURL(file);
      }
    });
    DOM.threadSearchInput?.addEventListener("input", (e) =>
      filterMessages(e.target.value.toLowerCase().trim()),
    );
    DOM.exportChatBtn?.addEventListener("click", exportConversation);
    DOM.clearStreamBtn?.addEventListener("click", clearCurrentStream);
    DOM.themeToggleBtn?.addEventListener("click", toggleTheme);
    document.addEventListener("click", (e) => {
      if (
        !e.target.closest(".editorial-popover") &&
        !e.target.closest(".composer-model-pill")
      ) {
        DOM.modelPickerPopover?.classList.remove("open");
      }
    });
  }

  function startConversation(promptText, title = "Inquiry") {
    state.isHeroActive = false;
    DOM.heroStage?.classList.add("hidden-stage");
    DOM.chatStage?.classList.remove("hidden-stage");
    const sessionId = "session_" + Date.now();
    const session = {
      id: sessionId,
      title,
      createdAt: Date.now(),
      messages: [],
      isStreaming: false,
    };
    state.sessions.unshift(session);
    state.currentSessionId = sessionId;
    state.messages = session.messages;
    if (DOM.threadTitle) DOM.threadTitle.innerText = title;
    if (DOM.messagesStream) DOM.messagesStream.innerHTML = "";
    renderSidebarChats();
    processMessageSubmission(promptText, sessionId);
    setTimeout(() => DOM.composerInput?.focus(), 400);
  }

  function returnToHero() {
    state.isHeroActive = true;
    state.attachedMedia = null;
    clearMediaPreview();
    if (DOM.composerInput) {
      DOM.composerInput.value = "";
      DOM.composerInput.style.height = "auto";
    }
    if (DOM.composerSendBtn) DOM.composerSendBtn.disabled = true;
    DOM.heroStage?.classList.remove("hidden-stage");
    DOM.chatStage?.classList.add("hidden-stage");
    setTimeout(() => DOM.composerInput?.focus(), 300);
  }

  function submitComposer() {
    if (isCurrentSessionStreaming()) return;
    const text = DOM.composerInput?.value.trim() || "";
    if (!text && !state.attachedMedia) return;
    DOM.composerInput.value = "";
    DOM.composerInput.style.height = "auto";
    if (DOM.composerSendBtn) DOM.composerSendBtn.disabled = true;
    if (state.isHeroActive) startConversation(text, text.slice(0, 28) + "...");
    else processMessageSubmission(text, state.currentSessionId);
  }

  async function processMessageSubmission(
    userText,
    sessionId = state.currentSessionId,
  ) {
    if (!sessionId) return;
    if (!userText && !state.attachedMedia) return;
    const session = state.sessions.find((s) => s.id === sessionId);
    if (!session) return;
    const media = state.attachedMedia;
    state.attachedMedia = null;
    clearMediaPreview();
    const userMsg = {
      id: "msg_" + Date.now(),
      role: "user",
      content: userText,
      media,
      time: timeNow(),
    };
    session.messages.push(userMsg);
    if (state.currentSessionId === sessionId) {
      state.messages = session.messages;
      appendMessageElement(userMsg, null, false, sessionId);
    }
    await persistSession(sessionId);

    const aiMsgId =
      "msg_" + (Date.now() + 1) + "_" + Math.random().toString(36).slice(2, 6);
    const aiMsg = {
      id: aiMsgId,
      role: "assistant",
      content: "",
      time: timeNow(),
      status: "thinking",
    };
    session.messages.push(aiMsg);
    session.isStreaming = true;

    if (state.currentSessionId === sessionId) {
      state.messages = session.messages;
      appendMessageElement(aiMsg, "chat", true, sessionId);
    } else {
      startThinkingCycle(aiMsgId, sessionId);
    }

    await persistSession(sessionId);

    const requestPromise = (async () => {
      try {
        const wapi = await getWebApi();
        if (!wapi) throw new Error("Python API unavailable");
        const intentResponse = await wapi.detect_intent(userText, true);
        const intent = String(intentResponse.result || "").toLowerCase();
        if (intent.includes("chat")) {
          await streamEditorialResponse(userText, aiMsgId, sessionId);
        } else {
          if (state.currentSessionId === sessionId)
            switchToImageGenerating(aiMsgId);
          await HandleImageGen(userText, aiMsgId, sessionId);
        }
      } catch (e) {
        console.error("Message submission error:", e);
        const targetSession = state.sessions.find((s) => s.id === sessionId);
        const targetMsg = targetSession?.messages.find((m) => m.id === aiMsgId);
        if (targetMsg) {
          targetMsg.content = "Unable to connect to the backend.";
          targetMsg.status = "error";
        }
        if (state.currentSessionId === sessionId) {
          const bodyEl = document.getElementById(`body_${aiMsgId}`);
          if (bodyEl) {
            stopThinkingCycle(aiMsgId);
            bodyEl.innerHTML = renderMarkdown(
              "Unable to connect to the backend.",
            );
          }
        } else {
          stopThinkingCycle(aiMsgId);
        }
        if (targetSession) targetSession.isStreaming = false;
        await persistSession(sessionId);
      } finally {
        activeRequests.delete(sessionId);
      }
    })();

    activeRequests.set(sessionId, { aiMsgId, promise: requestPromise });
  }

  function switchToImageGenerating(msgId) {
    const el = thinkingeffect(msgId);
    if (el) el.textContent = "Generating image";
  }

  function timeNow() {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function HandleImageGen(userPrompt, aiMsgId, sessionId) {
    try {
      const web_api = await getWebApi();
      if (!web_api) throw new Error("Python API unavailable");
      const imageResponse = await web_api.gen_image(userPrompt);
      const imagePath = imageResponse?.result?.response;
      if (!imagePath) throw new Error("Backend returned no image path");
      const session = state.sessions.find((s) => s.id === sessionId);
      const aiMsg = session?.messages.find((m) => m.id === aiMsgId);
      if (aiMsg) {
        aiMsg.isImageCard = true;
        aiMsg.image_url = imagePath;
        aiMsg.content = "";
        aiMsg.status = "complete";
      }
      if (state.currentSessionId === sessionId) {
        const bodyEl = document.getElementById(`body_${aiMsgId}`);
        if (bodyEl) {
          bodyEl.innerHTML = `<div class="image-thumb-card" data-image-url="${escapeHtml(imagePath)}"><img class="generated-image-thumb" src="${escapeHtml(imagePath)}" alt="Generated image" /></div>`;
        }
        const shelfEl = document.getElementById(`actions_${aiMsgId}`);
        if (shelfEl) shelfEl.style.display = "flex";
      }
    } catch (error) {
      console.error("Image generation failed:", error);
      const session = state.sessions.find((s) => s.id === sessionId);
      const aiMsg = session?.messages.find((m) => m.id === aiMsgId);
      if (aiMsg) {
        aiMsg.content = "Sorry, image generation failed.";
        aiMsg.status = "error";
      }
      if (state.currentSessionId === sessionId) {
        const bodyEl = document.getElementById(`body_${aiMsgId}`);
        if (bodyEl)
          bodyEl.innerHTML = renderMarkdown("Sorry, image generation failed.");
      }
    } finally {
      stopThinkingCycle(aiMsgId);
      const session = state.sessions.find((s) => s.id === sessionId);
      if (session) session.isStreaming = false;
      await persistSession(sessionId);
    }
  }

  function openImageLightbox(imageUrl) {
    if (document.querySelector(".lightbox-backdrop")) return;
    const backdrop = document.createElement("div");
    backdrop.className = "lightbox-backdrop";
    backdrop.innerHTML = `<div class="lightbox-toolbar"><button class="lightbox-btn" id="lightboxDownloadBtn" title="Download"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></button><button class="lightbox-btn" id="lightboxCopyBtn" title="Copy image"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button><button class="lightbox-btn lightbox-close-btn" id="lightboxCloseBtn" title="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></div><img class="lightbox-image" src="${imageUrl}" alt="Full size image" />`;
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add("active"));
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeImageLightbox(backdrop);
    });
    backdrop
      .querySelector("#lightboxCloseBtn")
      .addEventListener("click", () => closeImageLightbox(backdrop));
    backdrop
      .querySelector("#lightboxDownloadBtn")
      .addEventListener("click", () => downloadImage(imageUrl));
    backdrop
      .querySelector("#lightboxCopyBtn")
      .addEventListener("click", () => copyImageToClipboard(imageUrl));
    const escHandler = (e) => {
      if (e.key === "Escape") {
        closeImageLightbox(backdrop);
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);
  }
  function closeImageLightbox(backdrop) {
    backdrop.classList.remove("active");
    setTimeout(() => backdrop.remove(), 250);
  }
  async function downloadImage(imageUrl) {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `AURA_Image_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      showToast("Image downloaded");
    } catch (err) {
      console.error("Download failed:", err);
      showToast("Couldn't download image");
    }
  }
  async function copyImageToClipboard(imageUrl) {
    try {
      const pngBlob = await convertImageToPngBlob(imageUrl);
      if (!navigator.clipboard || !window.ClipboardItem)
        throw new Error("Clipboard image API not available");
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": pngBlob }),
      ]);
      showToast("Image copied to clipboard");
    } catch (err) {
      console.error("Copy image failed:", err);
      showToast("Couldn't copy image — try downloading instead");
    }
  }
  function convertImageToPngBlob(imageUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob returned null"));
        }, "image/png");
      };
      img.onerror = () =>
        reject(new Error("Failed to load image for conversion"));
      img.src = imageUrl;
    });
  }
  document.addEventListener("click", (e) => {
    const card = e.target.closest(".image-thumb-card");
    if (!card) return;
    const url = card.getAttribute("data-image-url");
    if (url) openImageLightbox(url);
  });

  function thinkingeffect(messageId) {
    return document.getElementById(`thinkingText_${messageId}`);
  }

  function startThinkingCycle(messageId, sessionId) {
    if (thinkingTimers[messageId]) {
      thinkingTimers[messageId].sessionId =
        sessionId || thinkingTimers[messageId].sessionId;

      const existing = thinkingTimers[messageId];
      const el = thinkingeffect(messageId);
      if (el && state.currentSessionId === existing.sessionId) {
        el.textContent =
          existing.phrases[existing.index] + ".".repeat(existing.dots);
      }
      return;
    }

    const phrases = [
      "Thinking",
      "Reasoning",
      "Synthesizing",
      "Weighing options",
      "Structuring response",
    ];
    let index = 0;
    let dots = 0;

    const effectiveSessionId = sessionId || state.currentSessionId;

    const intervalId = setInterval(() => {
      dots++;
      if (dots > 3) {
        dots = 0;
        index = (index + 1) % phrases.length;
      }

      const entry = thinkingTimers[messageId];
      if (entry) {
        entry.index = index;
        entry.dots = dots;
      }

      if (effectiveSessionId && state.currentSessionId !== effectiveSessionId)
        return;
      const el = thinkingeffect(messageId);
      if (!el) return;
      el.textContent = phrases[index] + ".".repeat(dots);
    }, 450);

    thinkingTimers[messageId] = {
      intervalId,
      sessionId: effectiveSessionId,
      index,
      dots,
      phrases,
    };

    const el = thinkingeffect(messageId);
    if (
      el &&
      (!effectiveSessionId || state.currentSessionId === effectiveSessionId)
    ) {
      el.textContent = phrases[0] + ".";
    }
  }

  function stopThinkingCycle(messageId) {
    const entry = thinkingTimers[messageId];
    if (entry) {
      clearInterval(entry.intervalId);
      delete thinkingTimers[messageId];
    }
  }

  function stopThinkingTimersForSession(sessionId) {
    if (!sessionId) return;
    Object.keys(thinkingTimers).forEach((msgId) => {
      const entry = thinkingTimers[msgId];
      if (entry && entry.sessionId === sessionId) stopThinkingCycle(msgId);
    });
  }

  function stopAllThinkingTimers() {
    Object.keys(thinkingTimers).forEach((id) => {
      const entry = thinkingTimers[id];
      if (entry) clearInterval(entry.intervalId);
    });
    for (const k in thinkingTimers) delete thinkingTimers[k];
  }

  function appendMessageElement(
    msg,
    thinkingstate = null,
    isPlaceholder = false,
    sessionId = null,
  ) {
    if (!DOM.messagesStream) return null;
    const effectiveSessionId = sessionId || state.currentSessionId;
    const row = document.createElement("div");
    row.className = `message-row ${msg.role === "user" ? "user" : "ai"}`;
    row.id = msg.id;
    if (msg.role === "user") {
      row.innerHTML = `<div class="msg-avatar">YOU</div><div class="msg-column">${msg.media ? `<img src="${msg.media.dataUrl}" style="max-width:240px;border-radius:8px;margin-bottom:6px;border:1px solid var(--border-hairline);" alt="Attachment" />` : ""}<div class="msg-bubble">${escapeHtml(msg.content)}</div></div>`;
    } else if (msg.isImageCard) {
      row.innerHTML = `<div class="msg-avatar">AURA</div><div class="msg-column" style="flex:1;"><div class="msg-bubble" id="body_${msg.id}"><div class="image-thumb-card" data-image-url="${msg.image_url}"><img class="generated-image-thumb" src="${msg.image_url}" alt="Generated image" /></div></div><div class="ai-actions-shelf" id="actions_${msg.id}">${copyButtonHtml(msg.id)}</div></div>`;
    } else {
      row.innerHTML = `<div class="msg-avatar">AURA</div><div class="msg-column" style="flex:1;"><div class="msg-bubble" id="body_${msg.id}">${isPlaceholder ? `<span class="thinking-shimmer-text" id="thinkingText_${msg.id}">Thinking.</span>` : renderMarkdown(msg.content)}</div><div class="ai-actions-shelf" id="actions_${msg.id}" style="${isPlaceholder ? "display:none;" : ""}">${copyButtonHtml(msg.id)}</div></div>`;
    }
    DOM.messagesStream.appendChild(row);
    if (thinkingstate == "chat" && msg.role !== "user") {
      startThinkingCycle(msg.id, effectiveSessionId);
    } else if (thinkingstate == "image" && msg.role !== "user") {
      const thinkingElement = thinkingeffect(msg.id);
      if (thinkingElement) thinkingElement.textContent = "Generating Image";
    }
    scrollToStreamBottom();
    bindRowActions(row, msg);
    return row;
  }

  function copyButtonHtml(id) {
    return `<button class="msg-chip-action copy-act" data-id="${id}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>Copy</button>`;
  }

  async function streamEditorialResponse(userPrompt, aiMsgId, sessionId) {
    try {
      const web_api = await getWebApi();
      if (!web_api) throw new Error("Python API unavailable");
      const result = await web_api.chat(userPrompt);
      const response = result.result;
      if (!response?.response)
        throw new Error(response?.error ?? "unknown error");
      const text = response.response;
      const session = state.sessions.find((s) => s.id === sessionId);
      if (!session) return;
      const aiMsg = session.messages.find((m) => m.id === aiMsgId);
      if (aiMsg) {
        aiMsg.content = text;
        aiMsg.status = "complete";
      }
      session.isStreaming = false;
      stopThinkingCycle(aiMsgId);
      if (state.currentSessionId === sessionId) {
        const bodyEl = document.getElementById(`body_${aiMsgId}`);
        const shelfEl = document.getElementById(`actions_${aiMsgId}`);
        if (bodyEl) initTextGenerateEffect(text, bodyEl, renderMarkdown(text));
        if (shelfEl) shelfEl.style.display = "flex";
      }
      await persistSession(sessionId);
    } catch (err) {
      console.warn("Chat failed:", err);
      const session = state.sessions.find((s) => s.id === sessionId);
      if (!session) return;
      const aiMsg = session.messages.find((m) => m.id === aiMsgId);
      const fallbackText = "Unable to connect to backend pywebview.";
      if (aiMsg) {
        aiMsg.content = fallbackText;
        aiMsg.status = "error";
      }
      session.isStreaming = false;
      stopThinkingCycle(aiMsgId);
      if (state.currentSessionId === sessionId) {
        const bodyEl = document.getElementById(`body_${aiMsgId}`);
        if (bodyEl)
          initTextGenerateEffect(
            fallbackText,
            bodyEl,
            renderMarkdown(fallbackText),
          );
      }
      await persistSession(sessionId);
    }
  }

  function initTextGenerateEffect(
    rawText,
    container,
    formattedHtml,
    stagger = 0.03,
  ) {
    if (!container) return;
    container.innerHTML = "";
    const words = escapeHtml(rawText).trim().split(/\s+/);
    words.forEach((word, i) => {
      const span = document.createElement("span");
      span.className = "tg-word";
      span.textContent = word;
      span.style.transitionDelay = `${i * stagger}s`;
      container.appendChild(span);
      container.appendChild(document.createTextNode(" "));
    });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container
          .querySelectorAll(".tg-word")
          .forEach((el) => el.classList.add("tg-visible"));
      });
    });
    const totalDuration = words.length * stagger * 1000 + 400;
    setTimeout(() => {
      container.innerHTML = formattedHtml;
    }, totalDuration);
  }

  function renderMarkdown(raw) {
    if (!raw) return "";
    let text = escapeHtml(raw);
    text = text.replace(
      /```([a-zA-Z0-9]*)\n([\s\S]*?)```/g,
      (match, lang, code) => {
        const language = lang || "typescript";
        const cleanCode = code.trim();
        const codeId = `code_${Math.random().toString(36).slice(2, 10)}`;
        return `<div class="code-container"><div class="code-header"><span>${language}</span><button class="code-copy-btn" data-copy-target="${codeId}"><svg class="copy-icon-default" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><svg class="copy-icon-check" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none;"><polyline points="20 6 9 17 4 12"></polyline></svg><span class="copy-btn-label">Copy</span></button></div><pre><code id="${codeId}">${escapeHtml(cleanCode)}</code></pre></div>`;
      },
    );
    text = text.replace(
      /`([^`]+)`/g,
      '<code style="font-family:var(--font-mono);font-size:12px;background:var(--bg-surface-subtle);padding:2px 6px;border-radius:4px;color:var(--accent-gold);border:1px solid var(--border-hairline);">$1</code>',
    );
    text = text.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    text = text.replace(/^## (.*$)/gim, "<h2>$1</h2>");
    text = text.replace(/^# (.*$)/gim, "<h1>$1</h1>");
    text = text.replace(/^\> (.*$)/gim, "<blockquote>$1</blockquote>");
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    text = text.replace(/^\s*-\s+(.*$)/gim, "<li>$1</li>");
    text = text.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");
    return text;
  }
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".code-copy-btn");
    if (!btn) return;
    const targetId = btn.getAttribute("data-copy-target");
    const codeEl = document.getElementById(targetId);
    if (!codeEl) return;
    const code = codeEl.textContent;
    navigator.clipboard.writeText(code);
    window.showAuraToast("Code copied to clipboard");
    const label = btn.querySelector(".copy-btn-label");
    const iconDefault = btn.querySelector(".copy-icon-default");
    const iconCheck = btn.querySelector(".copy-icon-check");
    if (btn.dataset.resetTimer) clearTimeout(Number(btn.dataset.resetTimer));
    label.textContent = "Copied";
    iconDefault.style.display = "none";
    iconCheck.style.display = "inline-block";
    btn.classList.add("copied");
    const timer = setTimeout(() => {
      label.textContent = "Copy";
      iconDefault.style.display = "inline-block";
      iconCheck.style.display = "none";
      btn.classList.remove("copied");
    }, 2000);
    btn.dataset.resetTimer = timer;
  });
  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function scrollToStreamBottom() {
    if (DOM.messagesStream)
      DOM.messagesStream.scrollTop = DOM.messagesStream.scrollHeight;
  }
  function bindRowActions(row, msg) {
    row.querySelector(".copy-act")?.addEventListener("click", () => {
      navigator.clipboard.writeText(msg.content);
      showToast("Copied to clipboard");
    });
  }
  function renderMediaPreview() {
    if (!DOM.composerMediaPreview) return;
    if (!state.attachedMedia) {
      DOM.composerMediaPreview.innerHTML = "";
      return;
    }
    DOM.composerMediaPreview.innerHTML = `<div class="media-chip"><img src="${state.attachedMedia.dataUrl}" alt="Media" /><span>${state.attachedMedia.name}</span><button class="media-chip-remove" id="removeMediaBtn">&times;</button></div>`;
    document.getElementById("removeMediaBtn")?.addEventListener("click", () => {
      state.attachedMedia = null;
      renderMediaPreview();
    });
  }
  function clearMediaPreview() {
    state.attachedMedia = null;
    renderMediaPreview();
  }
  function filterMessages(query) {
    const rows = document.querySelectorAll(".message-row");
    rows.forEach((row) => {
      if (!query) row.style.display = "flex";
      else {
        const match = row.innerText.toLowerCase().includes(query);
        row.style.display = match ? "flex" : "none";
      }
    });
  }

  function exportConversation() {
    if (!state.messages.length) {
      showToast("No messages to export");
      return;
    }
    let markdown = `# AURA Editorial Inquiry Archive\nDate: ${new Date().toISOString()}\n\n`;
    state.messages.forEach((m) => {
      markdown += `### ${m.role === "user" ? "User" : "AURA"} (${m.time})\n${m.content}\n\n---\n\n`;
    });
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AURA_Inquiry_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported to Markdown");
  }
  async function clearCurrentStream() {
    if (confirm("Clear current messages?")) {
      state.messages = [];
      if (DOM.messagesStream) DOM.messagesStream.innerHTML = "";
      await persistSession();
      showToast("Stream cleared");
    }
  }
  function serializableMessages(messages) {
    return messages.map((m) => {
      if (m.media) {
        const { dataUrl, ...mediaMeta } = m.media;
        return { ...m, media: mediaMeta };
      }
      return m;
    });
  }
  async function persistSession(sessionId = state.currentSessionId) {
    if (!sessionId) return;
    const session = state.sessions.find((s) => s.id === sessionId);
    if (!session) return;
    try {
      const sessionsToSave = state.sessions.map((s) => ({
        ...s,
        messages: serializableMessages(s.messages || []),
        isStreaming: undefined,
      }));
      const saved = await window.StoreItem(
        "aura_editorial_sessions",
        JSON.stringify(sessionsToSave),
      );
      console.log("[AURA] Sessions saved:", saved);
      renderSidebarChats();
    } catch (e) {
      console.error("[AURA] Failed to persist sessions:", e);
      showToast("Couldn't save chat");
    }
  }
  function renderSidebarChats(filterQuery = "") {
    if (!DOM.sidebarChatList) return;
    DOM.sidebarChatList.innerHTML = "";
    const query = (
      filterQuery !== undefined
        ? filterQuery
        : DOM.sidebarSearchInput
          ? DOM.sidebarSearchInput.value
          : ""
    )
      .toLowerCase()
      .trim();
    const filtered = query
      ? state.sessions.filter((s) =>
        (s.title || "").toLowerCase().includes(query),
      )
      : state.sessions;
    if (DOM.sidebarChatCount)
      DOM.sidebarChatCount.innerText = filtered.length.toString();
    if (filtered.length === 0) {
      DOM.sidebarChatList.innerHTML = `<li style="padding: 20px 8px; text-align: center; color: var(--text-subtle); font-size: 11px; font-family: var(--font-mono);">${query ? "No matching chats" : "No recorded chats"}</li>`;
      return;
    }
    filtered.slice(0, 40).forEach((s) => {
      const li = document.createElement("li");
      li.className = `sidebar-chat-item ${s.id === state.currentSessionId ? "active" : ""}`;
      const timeStr = s.createdAt
        ? new Date(s.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
        : "Recent";
      const msgCount = s.messages ? `${s.messages.length} msgs` : "1 inquiry";
      li.innerHTML = `<div class="chat-item-text-wrap"><span class="chat-item-title">${escapeHtml(s.title || "Untitled Chat")}</span><span class="chat-item-meta">${timeStr} • ${msgCount}</span></div><button class="chat-item-del-btn" data-id="${s.id}" title="Delete chat">&times;</button>`;
      li.addEventListener("click", (e) => {
        if (
          e.target.classList.contains("chat-item-del-btn") ||
          e.target.closest(".chat-item-del-btn")
        ) {
          e.stopPropagation();
          deleteSession(s.id);
          renderSidebarChats();
        } else {
          loadSession(s.id);
          if (window.innerWidth <= 768) closeMobileSidebar();
        }
      });
      DOM.sidebarChatList.appendChild(li);
    });
  }

  function loadSession(sessionId) {
    const session = state.sessions.find((s) => s.id === sessionId);
    if (!session) return;

    state.currentSessionId = session.id;
    state.messages = session.messages || [];
    state.isHeroActive = false;
    DOM.heroStage?.classList.add("hidden-stage");
    DOM.chatStage?.classList.remove("hidden-stage");
    if (DOM.threadTitle)
      DOM.threadTitle.innerText = session.title || "Untitled Chat";
    if (DOM.messagesStream) {
      DOM.messagesStream.innerHTML = "";
      state.messages.forEach((msg) => {
        const isThinking =
          msg.role === "assistant" && msg.status === "thinking";
        appendMessageElement(
          msg,
          isThinking ? "chat" : null,
          isThinking,
          session.id,
        );

        if (isThinking && thinkingTimers[msg.id]) {
          const t = thinkingTimers[msg.id];
          const el = thinkingeffect(msg.id);
          if (el) el.textContent = t.phrases[t.index] + ".".repeat(t.dots);
        }
      });
    }
    renderSidebarChats();
  }

  function isCurrentSessionStreaming() {
    const session = state.sessions.find((s) => s.id === state.currentSessionId);
    return !!session?.isStreaming;
  }

  function deleteSession(sessionId) {
    stopThinkingTimersForSession(sessionId);
    activeRequests.delete(sessionId);
    state.sessions = state.sessions.filter((s) => s.id !== sessionId);
    window.StoreItem("aura_editorial_sessions", JSON.stringify(state.sessions));
    if (state.currentSessionId === sessionId) returnToHero();
    else renderSidebarChats();
  }

  function positionPopover(popover, trigger) {
    if (!popover || !trigger) return;
    const rect = trigger.getBoundingClientRect();
    popover.style.bottom = `${window.innerHeight - rect.top + 8}px`;
    popover.style.right = `${window.innerWidth - rect.right}px`;
  }
  function openSettings() {
    if (DOM.settingsModalBackdrop) window.location.href = "pages/settings.html";
  }
  function openHelp() {
    if (DOM.helpButtonLink) window.location.href = "pages/help.html";
  }
  function toggleTheme() {
    const isDark = document.body.classList.toggle("dark-theme");
    window.StoreItem("aura_theme_mode", isDark ? "dark" : "light");
    showToast(`Theme: ${isDark ? "Obsidian Dark" : "Warm Linen Light"}`);
  }
  async function applyPreferences() {
    const savedTheme = await window.GetItem("aura_theme_mode");
    if (savedTheme === "dark") document.body.classList.add("dark-theme");
  }
  function showToast(msg) {
    if (!DOM.toastContainer) return;
    const toast = document.createElement("div");
    toast.className = "editorial-toast";
    toast.innerText = msg;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-6px)";
      setTimeout(() => toast.remove(), 250);
    }, 2200);
  }
  window.showAuraToast = showToast;
  document.addEventListener("DOMContentLoaded", init);
})();
