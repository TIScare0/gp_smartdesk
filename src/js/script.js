(function () {
  "use strict";

  const IMAGES = [
    {
      thumb: "images/ai_interface.jpg",
      pos: { top: "10%", left: "7%" },
    },

    {
      thumb: "images/ai_workspace.jpg",
      pos: { top: "34%", right: "6%" },
    },

    {
      thumb: "images/app_development.jpg",
      pos: { bottom: "12%", left: "10%" },
    },

    {
      thumb: "images/code_data.jpg",
      pos: { top: "44%", left: "4%" },
    },

    {
      thumb: "images/digital_intelligence.jpg",
      pos: { bottom: "14%", right: "9%" },
    },
  ];

  let storedSessions = [];
  try {
    const rawSessions = localStorage.getItem("aura_editorial_sessions");
    if (rawSessions) {
      storedSessions = JSON.parse(rawSessions);
    }
  } catch (e) {
    storedSessions = [];
  }

  const state = {
    isHeroActive: true,
    isStreaming: false,
    currentSessionId: null,
    sessions: storedSessions,
    attachedMedia: null,
    isListening: false,
    messages: [],
  };

  // DOM Handles
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
    customCursor: document.getElementById("customCursor"),
    customCursorFollower: document.getElementById("customCursorFollower"),
    kineticCanvas: document.getElementById("kineticCanvas"),
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
    composerModelSelectorBtn: document.getElementById(
      "composerModelSelectorBtn",
    ),
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

  function init() {
    setupSidebarState();
    renderKineticCards();
    renderSidebarChats();
    setupCursor();
    setupListeners();
    applyPreferences();
  }

  async function getWebApi() {
    try {
      console.log("[CORE] Waiting for Python API...");

      const timeout = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("Python API connection timed out"));
        }, 5000);
      });

      const bridge = await Promise.race([window.web_api_ready, timeout]);

      console.log("[CORE] Python API received:", bridge);

      if (!bridge) {
        throw new Error("Python API is null");
      }

      return bridge;
    } catch (error) {
      console.error("[CORE] Failed to get Python API:", error);

      showWebApiErrorCard();

      return null;
    }
  }

  function showWebApiErrorCard(message) {
    if (document.querySelector(".web-api-error-card")) {
      return;
    }

    const card = document.createElement("div");
    card.className = "web-api-error-card";

    card.innerHTML = `
    <div class="web-api-error-icon">⚠️</div>

    <div class="web-api-error-content">
      <h3>Unable to connect to WebView API</h3>

      <p class="web-api-error-message"></p>

      <a
        href="https://github.com/TIScare0/gp_smartdesk/issues/new"
        target="_blank"
        rel="noopener noreferrer"
      >
        Report on GitHub →
      </a>
    </div>
  `;

    card.querySelector(".web-api-error-message").textContent =
      message || "The Python API could not be reached within 5 seconds.";

    document.body.appendChild(card);
  }

  function setupSidebarState() {
    const savedState = localStorage.getItem("aura_sidebar_state") || "expanded";
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
        localStorage.setItem("aura_sidebar_state", "expanded");
      } else {
        DOM.appContainer?.classList.remove("sidebar-expanded");
        DOM.appContainer?.classList.add("sidebar-collapsed");
        localStorage.setItem("aura_sidebar_state", "collapsed");
      }
    }
  }

  function closeMobileSidebar() {
    DOM.appContainer?.classList.remove("sidebar-mobile-open");
  }

  function renderKineticCards() {
    if (!DOM.kineticCanvas) return;
    DOM.kineticCanvas.innerHTML = "";

    IMAGES.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "kinetic-card";
      const delaySec = `${index * 0.15}s`;
      card.style.setProperty("--card-delay", delaySec);
      card.style.animationDelay = `${delaySec}, ${index * 3}s`;

      Object.entries(item.pos).forEach(([k, v]) => {
        card.style[k] = v;
      });

      card.innerHTML = `
        <div class="kinetic-card-inner">
          <div class="card-img-wrap">
            <img class="kinetic-thumb" src="${item.thumb}" loading="lazy" />
          </div>
        </div>
      `;
      DOM.kineticCanvas.appendChild(card);
    });

    window.addEventListener("mousemove", (e) => {
      const { innerWidth, innerHeight } = window;
      const xOffset = (e.clientX / innerWidth - 0.5) * 16;
      const yOffset = (e.clientY / innerHeight - 0.5) * 16;

      document
        .querySelectorAll(".kinetic-card-inner")
        .forEach((innerEl, idx) => {
          const factor = (idx + 1) * 0.35;
          innerEl.style.transform = `translate(${xOffset * factor}px, ${yOffset * factor}px)`;
        });
    });
  }

  function setupCursor() {
    let mouseX = 0,
      mouseY = 0;
    let followerX = 0,
      followerY = 0;

    window.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (DOM.customCursor) {
        DOM.customCursor.style.left = `${mouseX}px`;
        DOM.customCursor.style.top = `${mouseY}px`;
      }
    });

    function loop() {
      followerX += (mouseX - followerX) * 0.18;
      followerY += (mouseY - followerY) * 0.18;
      if (DOM.customCursorFollower) {
        DOM.customCursorFollower.style.left = `${followerX}px`;
        DOM.customCursorFollower.style.top = `${followerY}px`;
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    document.addEventListener("mouseover", (e) => {
      if (
        e.target.closest(
          "button, a, .inquiry-pill, .kinetic-card, input, textarea, .model-option-row, .pixel-gen-card",
        )
      ) {
        document.body.classList.add("cursor-hover");
      } else {
        document.body.classList.remove("cursor-hover");
      }
    });
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
      if (DOM.appContainer?.classList.contains("sidebar-collapsed")) {
        toggleSidebar();
      } else {
        returnToHero();
      }
    });

    DOM.sidebarToggleCollapseBtn?.addEventListener("click", toggleSidebar);
    DOM.headerSidebarToggleBtn?.addEventListener("click", toggleSidebar);
    DOM.sidebarMobileBackdrop?.addEventListener("click", closeMobileSidebar);

    DOM.brandLogoBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      if (window.innerWidth <= 768) {
        toggleSidebar();
      } else {
        returnToHero();
      }
    });

    DOM.newChatTopBtn?.addEventListener("click", returnToHero);
    DOM.sidebarNewChatBtn?.addEventListener("click", () => {
      returnToHero();
      if (window.innerWidth <= 768) closeMobileSidebar();
    });

    DOM.sidebarSearchInput?.addEventListener("input", (e) => {
      renderSidebarChats(e.target.value);
    });

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

    // Composer Input Events
    DOM.composerInput?.addEventListener("input", () => {
      DOM.composerInput.style.height = "auto";
      DOM.composerInput.style.height =
        Math.min(DOM.composerInput.scrollHeight, 140) + "px";
      if (DOM.composerSendBtn) {
        DOM.composerSendBtn.disabled =
          !DOM.composerInput.value.trim() && !state.attachedMedia;
      }
    });

    DOM.composerInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitComposer();
      }
    });

    DOM.composerSendBtn?.addEventListener("click", submitComposer);

    // Attach File
    DOM.composerAttachBtn?.addEventListener("click", () => {
      DOM.hiddenMediaInput?.click();
    });

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

    // Model Selector Popover
    DOM.composerModelSelectorBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      DOM.modelPickerPopover?.classList.toggle("open");
      positionPopover(DOM.modelPickerPopover, DOM.composerModelSelectorBtn);
    });

    document.querySelectorAll(".model-option-row").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget;
        const modelId = target.getAttribute("data-model");
        const modelName = target.getAttribute("data-name");
        setModel(modelId, modelName);
        DOM.modelPickerPopover?.classList.remove("open");
      });
    });

    // Thread Search
    DOM.threadSearchInput?.addEventListener("input", (e) => {
      filterMessages(e.target.value.toLowerCase().trim());
    });

    // Thread Actions
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

    if (DOM.threadTitle) {
      DOM.threadTitle.innerText = title;
    }

    state.currentSessionId = "session_" + Date.now();
    state.messages = [];

    if (DOM.messagesStream) {
      DOM.messagesStream.innerHTML = "";
    }

    processMessageSubmission(promptText);

    setTimeout(() => {
      DOM.composerInput?.focus();
    }, 400);
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

    renderKineticCards();

    setTimeout(() => {
      DOM.composerInput?.focus();
    }, 300);
  }

  function submitComposer() {
    if (state.isStreaming) return;
    const text = DOM.composerInput?.value.trim() || "";
    if (!text && !state.attachedMedia) return;

    DOM.composerInput.value = "";
    DOM.composerInput.style.height = "auto";
    if (DOM.composerSendBtn) DOM.composerSendBtn.disabled = true;

    if (state.isHeroActive) {
      startConversation(text, text.slice(0, 28) + "...");
    } else {
      processMessageSubmission(text);
    }
  }

  async function processMessageSubmission(userText) {
    if (!userText && !state.attachedMedia) return;

    const media = state.attachedMedia;
    state.attachedMedia = null;
    clearMediaPreview();

    // 1. Add user's message
    const userMsg = {
      id: "msg_" + Date.now(),
      role: "user",
      content: userText,
      media: media,
      time: timeNow(),
    };
    state.messages.push(userMsg);
    appendMessageElement(userMsg);
    persistSession(userText);

    const aiMsgId = "msg_" + (Date.now() + 1);
    const aiMsg = {
      id: aiMsgId,
      role: "assistant",
      content: "",
      time: timeNow(),
    };
    state.messages.push(aiMsg);
    appendMessageElement(aiMsg, true, true);

    state.isStreaming = true;

    try {
      const wapi = await getWebApi();
      if (!wapi) return;

      const intentResponse = await wapi.detect_intent(userText, true);
      const intent = String(intentResponse.result || "").toLowerCase();

      if (intent.includes("chat")) {
        await streamEditorialResponse(userText, aiMsgId);
      } else {
        await HandleImageGen(userText, aiMsgId);
      }
    } catch (e) {
      console.error("Message submission error:", e);
      showWebApiErrorCard(e.message);
      state.isStreaming = false;
    }
  }

  function timeNow() {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Simple image-gen flow: no canvas/pixel-grid junk, just a status text
  // then a plain <img> when the backend returns a path.
  async function HandleImageGen(userPrompt, aiMsgId) {
    const bodyEl = document.getElementById(`body_${aiMsgId}`);
    const thinkingEl = document.getElementById(`thinkingText_${aiMsgId}`);
    if (thinkingEl) thinkingEl.textContent = "Generating image";

    try {
      const web_api = await getWebApi();
      if (!web_api) return;

      const imageResponse = await web_api.gen_image(userPrompt);
      const imagePath = imageResponse.result.response;

      const aiMsg = state.messages.find((m) => m.id === aiMsgId);
      if (aiMsg) {
        aiMsg.isImageCard = true;
        aiMsg.image_url = imagePath;
      }

      if (bodyEl) {
        bodyEl.innerHTML = `<img class="generated-image" src="${imagePath}" alt="Generated image" />`;
      }

      const shelfEl = document.getElementById(`actions_${aiMsgId}`);
      if (shelfEl) shelfEl.style.display = "flex";
    } catch (error) {
      console.error("Image generation failed:", error);
      if (bodyEl)
        bodyEl.innerHTML = renderMarkdown("Sorry, image generation failed.");
    } finally {
      state.isStreaming = false;
      persistSession();
    }
  }

  function thinkingeffect(messageId) {
    const element = document.getElementById(`thinkingText_${messageId}`);
    if (!element) {
      return;
    }
    return element;
  }

  function startThinkingCycle(messageId) {
    const phrases = [
      "Thinking",
      "Reasoning",
      "Synthesizing",
      "Weighing options",
      "Structuring response",
    ];

    let index = 0;
    let dots = 0;

    const element = thinkingeffect(messageId);
    const update = () => {
      element.textContent = phrases[index] + ".".repeat(dots);
    };

    update();

    const timer = setInterval(() => {
      dots++;

      if (dots > 3) {
        dots = 0;
        index = (index + 1) % phrases.length;
      }

      update();
    }, 450);
  }

  // Replace the whole appendMessageElement function with this — drop the
  // old pixel-grid/scene branch entirely.
  function appendMessageElement(
    msg,
    startThinking = false,
    isPlaceholder = false,
  ) {
    if (!DOM.messagesStream) return null;

    const row = document.createElement("div");
    row.className = `message-row ${msg.role === "user" ? "user" : "ai"}`;
    row.id = msg.id;

    if (msg.role === "user") {
      row.innerHTML = `
      <div class="msg-avatar">YOU</div>
      <div class="msg-column">
        ${
          msg.media
            ? `<img src="${msg.media.dataUrl}" style="max-width:240px;border-radius:8px;margin-bottom:6px;border:1px solid var(--border-hairline);" alt="Attachment" />`
            : ""
        }
        <div class="msg-bubble">${escapeHtml(msg.content)}</div>
      </div>
    `;
    } else if (msg.isImageCard) {
      row.innerHTML = `
      <div class="msg-avatar">AURA</div>
      <div class="msg-column" style="flex:1;">
        <div class="msg-bubble" id="body_${msg.id}">
          <img class="generated-image" src="${msg.image_url}" alt="Generated image" />
        </div>
        <div class="ai-actions-shelf" id="actions_${msg.id}">${copyButtonHtml(msg.id)}</div>
      </div>
    `;
    } else {
      row.innerHTML = `
      <div class="msg-avatar">AURA</div>
      <div class="msg-column" style="flex:1;">
        <div class="msg-bubble" id="body_${msg.id}">
          ${
            isPlaceholder
              ? `<span class="thinking-shimmer-text" id="thinkingText_${msg.id}">Thinking.</span>`
              : renderMarkdown(msg.content)
          }
        </div>
        <div class="ai-actions-shelf" id="actions_${msg.id}" style="${isPlaceholder ? "display:none;" : ""}">
          ${copyButtonHtml(msg.id)}
        </div>
      </div>
    `;
    }

    DOM.messagesStream.appendChild(row);

    if (startThinking && msg.role !== "user") {
      startThinkingCycle(msg.id);
    }

    scrollToStreamBottom();
    bindRowActions(row, msg);

    return row;
  }

  function copyButtonHtml(id) {
    return `
    <button class="msg-chip-action copy-act" data-id="${id}">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      Copy
    </button>
  `;
  }

  async function streamEditorialResponse(userPrompt, aiMsgId) {
    const bodyEl = document.getElementById(`body_${aiMsgId}`);
    const shelfEl = document.getElementById(`actions_${aiMsgId}`);

    try {
      const web_api = await getWebApi();
      if (!web_api) return;

      const result = await web_api.chat(userPrompt);
      const response = result.result;
      if (!response?.response) {
        throw new Error(response?.error ?? "unknown error");
      }

      const text = response.response;
      const aiMsg = state.messages.find((m) => m.id === aiMsgId);
      if (aiMsg) aiMsg.content = text;

      if (bodyEl) initTextGenerateEffect(text, bodyEl, renderMarkdown(text));
      if (shelfEl) shelfEl.style.display = "flex";
    } catch (err) {
      console.warn("Chat failed:", err);
      const fallbackText = "Unable to connect to backend pywebview. If you're on the latest version, please report this on GitHub: https://github.com/TIScare0/gp_smartdesk/issues/new";

      const aiMsg = state.messages.find((m) => m.id === aiMsgId);
      if (aiMsg) aiMsg.content = fallbackText;

      if (bodyEl)
        initTextGenerateEffect(
          fallbackText,
          bodyEl,
          renderMarkdown(fallbackText),
        );
      if (shelfEl) shelfEl.style.display = "flex";
    } finally {
      state.isStreaming = false;
      persistSession();
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

  // Markdown Parser
  function renderMarkdown(raw) {
    if (!raw) return "";
    let text = escapeHtml(raw);

    // Code Blocks
    text = text.replace(
      /```([a-zA-Z0-9]*)\n([\s\S]*?)```/g,
      (match, lang, code) => {
        const language = lang || "typescript";
        const cleanCode = code.trim();
        const codeId = `code_${Math.random().toString(36).slice(2, 10)}`;

        // Stash the code in a hidden element instead of embedding it in an attribute
        return `
        <div class="code-container">
          <div class="code-header">
            <span>${language}</span>
            <button class="code-copy-btn" data-copy-target="${codeId}">
              <svg class="copy-icon-default" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              <svg class="copy-icon-check" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none;"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span class="copy-btn-label">Copy</span>
            </button>
          </div>
          <pre><code id="${codeId}">${escapeHtml(cleanCode)}</code></pre>
        </div>
      `;
      },
    );
    // Inline Code
    text = text.replace(
      /`([^`]+)`/g,
      '<code style="font-family:var(--font-mono);font-size:12px;background:var(--bg-surface-subtle);padding:2px 6px;border-radius:4px;color:var(--accent-gold);border:1px solid var(--border-hairline);">$1</code>',
    );

    text = text.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    text = text.replace(/^## (.*$)/gim, "<h2>$1</h2>");
    text = text.replace(/^# (.*$)/gim, "<h1>$1</h1>");

    // Blockquotes
    text = text.replace(/^\> (.*$)/gim, "<blockquote>$1</blockquote>");

    // Bold & Italics
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");

    // Unordered lists
    text = text.replace(/^\s*-\s+(.*$)/gim, "<li>$1</li>");
    text = text.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");

    // Paragraph breaks
    // text = text.replace(/\n\n/g, '</p><p>');
    // text = `<p>${text}</p>`;
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
    if (DOM.messagesStream) {
      DOM.messagesStream.scrollTop = DOM.messagesStream.scrollHeight;
    }
  }

  function bindRowActions(row, msg) {
    row.querySelector(".copy-act")?.addEventListener("click", () => {
      navigator.clipboard.writeText(msg.content);
      showToast("Copied to clipboard");
    });
  }

  // Media Attachment Rendering
  function renderMediaPreview() {
    if (!DOM.composerMediaPreview) return;
    if (!state.attachedMedia) {
      DOM.composerMediaPreview.innerHTML = "";
      return;
    }

    DOM.composerMediaPreview.innerHTML = `
      <div class="media-chip">
        <img src="${state.attachedMedia.dataUrl}" alt="Media" />
        <span>${state.attachedMedia.name}</span>
        <button class="media-chip-remove" id="removeMediaBtn">&times;</button>
      </div>
    `;

    document.getElementById("removeMediaBtn")?.addEventListener("click", () => {
      state.attachedMedia = null;
      renderMediaPreview();
    });
  }

  function clearMediaPreview() {
    state.attachedMedia = null;
    renderMediaPreview();
  }

  // Model Selection
  function setModel(modelId, modelName) {
    state.activeModel = modelId;
    localStorage.setItem("aura_active_model", modelId);
    if (DOM.activeModelLabel) DOM.activeModelLabel.innerText = modelName;
    document.querySelectorAll(".model-option-row").forEach((row) => {
      row.classList.toggle(
        "active",
        row.getAttribute("data-model") === modelId,
      );
    });
    showToast(`Model set to ${modelName}`);
  }

  // Filter in Stream
  function filterMessages(query) {
    const rows = document.querySelectorAll(".message-row");
    rows.forEach((row) => {
      if (!query) {
        row.style.display = "flex";
      } else {
        const match = row.innerText.toLowerCase().includes(query);
        row.style.display = match ? "flex" : "none";
      }
    });
  }

  // Export Conversation
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

  function clearCurrentStream() {
    if (confirm("Clear current messages?")) {
      state.messages = [];
      if (DOM.messagesStream) DOM.messagesStream.innerHTML = "";
      persistSession();
      showToast("Stream cleared");
    }
  }

  function serializableMessages(messages) {
    return messages.map((m) => {
      if (m.media) {
        const { dataUrl, ...mediaMeta } = m.media; // drop the heavy base64 payload
        return { ...m, media: mediaMeta };
      }
      return m;
    });
  }

  // Session Storage & Sidebar History
  function persistSession(initialPrompt = "") {
    if (!state.currentSessionId) return;

    let session = state.sessions.find((s) => s.id === state.currentSessionId);
    if (!session) {
      session = {
        id: state.currentSessionId,
        title: initialPrompt
          ? initialPrompt.slice(0, 32) +
            (initialPrompt.length > 32 ? "..." : "")
          : "Editorial Inquiry",
        createdAt: Date.now(),
        messages: state.messages,
      };
      state.sessions.unshift(session);
    } else {
      session.messages = serializableMessages(state.messages);
    }

    try {
      localStorage.setItem(
        "aura_editorial_sessions",
        JSON.stringify(state.sessions),
      );
    } catch (e) {
      console.error("Failed to persist session (likely quota exceeded):", e);
      showToast("Couldn't save chat — storage full (attachments too large?)");
    }

    renderSidebarChats();
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

    if (DOM.sidebarChatCount) {
      DOM.sidebarChatCount.innerText = filtered.length.toString();
    }

    if (filtered.length === 0) {
      DOM.sidebarChatList.innerHTML = `
        <li style="padding: 20px 8px; text-align: center; color: var(--text-subtle); font-size: 11px; font-family: var(--font-mono);">
          ${query ? "No matching chats" : "No recorded chats"}
        </li>
      `;
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

      li.innerHTML = `
        <div class="chat-item-text-wrap">
          <span class="chat-item-title">${escapeHtml(s.title || "Untitled Chat")}</span>
          <span class="chat-item-meta">${timeStr} • ${msgCount}</span>
        </div>
        <button class="chat-item-del-btn" data-id="${s.id}" title="Delete chat">&times;</button>
      `;

      li.addEventListener("click", (e) => {
        if (
          e.target.classList.contains("chat-item-del-btn") ||
          e.target.closest(".chat-item-del-btn")
        ) {
          e.stopPropagation();
          deleteSession(s.id);
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

    if (DOM.threadTitle) DOM.threadTitle.innerText = session.title;
    if (DOM.messagesStream) {
      DOM.messagesStream.innerHTML = "";
      state.messages.forEach((msg) => appendMessageElement(msg));
    }

    renderSidebarChats();
  }

  function deleteSession(sessionId) {
    state.sessions = state.sessions.filter((s) => s.id !== sessionId);
    localStorage.setItem(
      "aura_editorial_sessions",
      JSON.stringify(state.sessions),
    );
    if (state.currentSessionId === sessionId) {
      returnToHero();
    } else {
      renderSidebarChats();
    }
  }

  // Popover Positioning
  function positionPopover(popover, trigger) {
    if (!popover || !trigger) return;
    const rect = trigger.getBoundingClientRect();
    popover.style.bottom = `${window.innerHeight - rect.top + 8}px`;
    popover.style.right = `${window.innerWidth - rect.right}px`;
  }

  function openSettings() {
    if (DOM.settingsModalBackdrop) {
      window.location.href = "pages/settings.html";
    }
  }

  function openHelp() {
    if (DOM.helpButtonLink) {
      window.location.href = "pages/help.html";
    }
  }

  // Theme Switcher
  function toggleTheme() {
    const isDark = document.body.classList.toggle("dark-theme");
    localStorage.setItem("aura_theme_mode", isDark ? "dark" : "light");
    showToast(`Theme: ${isDark ? "Obsidian Dark" : "Warm Linen Light"}`);
  }

  function applyPreferences() {
    const savedTheme = localStorage.getItem("aura_theme_mode");
    if (savedTheme === "dark") {
      document.body.classList.add("dark-theme");
    }
    const savedModel = localStorage.getItem("aura_active_model");
    if (savedModel) {
      state.activeModel = savedModel;
      const matched = document.querySelector(
        `.model-option-row[data-model="${savedModel}"]`,
      );
      if (matched) {
        const name = matched.getAttribute("data-name");
        if (DOM.activeModelLabel) DOM.activeModelLabel.innerText = name;
        document
          .querySelectorAll(".model-option-row")
          .forEach((r) => r.classList.remove("active"));
        matched.classList.add("active");
      }
    }
  }

  // Toast System
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

  // Boot on DOM Ready
  document.addEventListener("DOMContentLoaded", init);
})();
