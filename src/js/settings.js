(function () {
  "use strict";

  const MODELS = [
    {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      provider: "Gemini",
      tier: "free",
      meta: "250K TPM · 5 RPM · 20 RPD",
      modality: "text",
    },
    {
      id: "gemini-2.5-flash-lite",
      name: "Gemini 2.5 Flash Lite",
      provider: "Gemini",
      tier: "free",
      meta: "250K TPM · 15 RPM · 500 RPD",
      modality: "text",
    },
    {
      id: "gemini-2.5-flash-previous",
      name: "Gemini 2.5 Flash Previous",
      provider: "Gemini",
      tier: "free",
      meta: "250K TPM · 5 RPM · 20 RPD",
      modality: "text",
    },

    // NVIDIA
    {
      id: "meta-glimmer-30b",
      name: "Meta Glimmer 30B",
      provider: "NVIDIA",
      tier: "free",
      meta: "40 RPM · Text + Image",
      modality: "text,image",
    },

    // Mistral
    {
      id: "mistral-3b",
      name: "Mistral 3B",
      provider: "Mistral",
      tier: "free",
      meta: "1.3M TPM · 750 RPM",
      modality: "text",
    },
    {
      id: "mistral-8b",
      name: "Mistral 8B",
      provider: "Mistral",
      tier: "free",
      meta: "625K TPM · 187 RPM",
      modality: "text",
    },

    // OpenRouter
    {
      id: "nvidia-3-ultra",
      name: "NVIDIA 3 Ultra",
      provider: "OpenRouter",
      tier: "free",
      meta: "12 RPM · 30/day · 900/month",
      modality: "text",
    },
    {
      id: "openrouter-free",
      name: "OpenRouter Free",
      provider: "OpenRouter",
      tier: "free",
      meta: "8 RPM · 20/day · 600/month",
      modality: "text",
    },

    // Bing
    {
      id: "bing-2.5-image",
      name: "Bing 2.5 Image",
      provider: "Bing",
      tier: "free",
      meta: "20 images",
      modality: "image",
    },

    // Cohere
    {
      id: "cohere-03",
      name: "Cohere 03",
      provider: "Cohere",
      tier: "free",
      meta: "20 RPM · 1,000/month",
      modality: "text",
    },

    // Perchance
    {
      id: "perc-anime",
      name: "Perchance Anime",
      provider: "Perchance",
      tier: "free",
      meta: "20 images/day",
      modality: "image",
    },
    {
      id: "perc-cinematic",
      name: "Perchance Cinematic",
      provider: "Perchance",
      tier: "free",
      meta: "20 images/day",
      modality: "image",
    },
    {
      id: "perc-oil-painting",
      name: "Perchance Oil Painting",
      provider: "Perchance",
      tier: "free",
      meta: "20 images/day",
      modality: "image",
    },
    {
      id: "perc-sketch",
      name: "Perchance Sketch",
      provider: "Perchance",
      tier: "free",
      meta: "20 images/day",
      modality: "image",
    },
    {
      id: "perc-normal",
      name: "Perchance Normal",
      provider: "Perchance",
      tier: "free",
      meta: "20 images/day · 20 images",
      modality: "image",
    },
  ];

  const PROVIDERS_AND_APIS = {
    gemini: {
      url: "https://generativelanguage.googleapis.com/v1beta/models",
      auth: "query",
    },

    openrouter: {
      url: "https://openrouter.ai/api/v1/models",
      auth: "bearer",
    },

    cohere: {
      url: "https://api.cohere.com/v2/models",
      auth: "bearer",
    },

    nvidia: {
      url: "https://integrate.api.nvidia.com/v1",
      auth: "bearer",
    },

    mistral: {
      url: "https://api.mistral.ai/v1/models",
      auth: "bearer",
    },
  };

  const DOM = {
    navItems: document.querySelectorAll(".settings-nav-item"),
    panels: document.querySelectorAll(".settings-panel"),
    modelGrid: document.getElementById("modelGrid"),
    fallbackModelSelect: document.getElementById("fallbackModelSelect"),
    settingSystemPrompt: document.getElementById("settingSystemPrompt"),
    settingTemperature: document.getElementById("settingTemperature"),
    tempValueLabel: document.getElementById("tempValueLabel"),
    settingMaxTokens: document.getElementById("settingMaxTokens"),
    maxTokensLabel: document.getElementById("maxTokensLabel"),
    settingStreaming: document.getElementById("settingStreaming"),
    settingUsageAlerts: document.getElementById("settingUsageAlerts"),
    themeSegments: document.getElementById("themeSegments"),
    lengthSegments: document.getElementById("lengthSegments"),
    densitySegments: document.getElementById("densitySegments"),
    voiceLangSelect: document.getElementById("voiceLangSelect"),
    exportAllBtn: document.getElementById("exportAllBtn"),
    clearAllBtn: document.getElementById("clearAllBtn"),
    saveStatus: document.getElementById("saveStatus"),
    toastContainer: document.getElementById("toastContainer"),
    usageBarFill: document.getElementById("usageBarFill"),
    usageCountLabel: document.getElementById("usageCountLabel"),
    usageResetNote: document.getElementById("usageResetNote"),
  };

  function init() {
    setupNav();
    renderModelGrid();
    loadValues();
    bindFieldEvents();
  }

  // ---------- Sidebar nav / panel switching ----------
  function setupNav() {
    DOM.navItems.forEach((item) => {
      item.addEventListener("click", () => {
        const target = item.getAttribute("data-panel");
        DOM.navItems.forEach((i) => i.classList.remove("active"));
        item.classList.add("active");
        DOM.panels.forEach((p) =>
          p.classList.toggle("active", p.id === `panel-${target}`),
        );
      });
    });
  }

  // ---------- Model grid ----------
  function renderModelGrid() {
    if (!DOM.modelGrid) return;
    const activeModel =
      localStorage.getItem("aura_active_model") || "gemini-2.5-pro";

    DOM.modelGrid.innerHTML = MODELS.map(
      (m) => `
      <button class="model-option-card ${m.id === activeModel ? "selected" : ""}" data-model="${m.id}">
        <div class="model-option-top">
          <span class="model-option-name">${m.name}</span>
        </div>
        <span class="model-option-meta">${m.meta}</span>
      </button>
    `,
    ).join("");
  }

  // ---------- Load stored values ----------
  function loadValues() {
    if (DOM.settingSystemPrompt) {
      DOM.settingSystemPrompt.value =
        localStorage.getItem("aura_system_prompt") ||
        "You are AURA, an elite editorial intelligence. Provide articulated reasoning, elegant typography-aware output, pristine code structures with TypeScript/Tailwind, and refined prose with genuine clarity.";
    }

    const theme = localStorage.getItem("aura_theme_mode") || "light";
    setSegmentActive(
      DOM.themeSegments,
      theme === "dark" ? "dark" : "light",
      "theme",
    );

    const length = localStorage.getItem("aura_response_length") || "balanced";
    setSegmentActive(DOM.lengthSegments, length, "length");

    const density =
      localStorage.getItem("aura_message_density") || "comfortable";
    setSegmentActive(DOM.densitySegments, density, "density");

    if (DOM.voiceLangSelect) {
      DOM.voiceLangSelect.value =
        localStorage.getItem("aura_voice_lang") || "en-US";
    }

    applyThemeToPage(theme === "dark");
  }

  function setSegmentActive(container, value, dataKey) {
    if (!container) return;
    container.querySelectorAll(".segment").forEach((seg) => {
      seg.classList.toggle(
        "active",
        seg.getAttribute(`data-${dataKey}`) === value,
      );
    });
  }

  // ---------- Bind events ----------
  function bindFieldEvents() {
    DOM.settingSystemPrompt?.addEventListener("input", () => {
      localStorage.setItem("aura_system_prompt", DOM.settingSystemPrompt.value);
      flashSaved();
    });

    DOM.settingTemperature?.addEventListener("input", () => {
      const val = parseFloat(DOM.settingTemperature.value);
      localStorage.setItem("aura_temperature", String(val));
      updateTempLabel(val);
      flashSaved();
    });

    DOM.settingMaxTokens?.addEventListener("input", () => {
      const val = parseInt(DOM.settingMaxTokens.value, 10);
      localStorage.setItem("aura_max_tokens", String(val));
      updateMaxTokensLabel(val);
      flashSaved();
    });

    DOM.settingStreaming?.addEventListener("change", () => {
      localStorage.setItem(
        "aura_streaming",
        String(DOM.settingStreaming.checked),
      );
      flashSaved();
    });

    DOM.settingUsageAlerts?.addEventListener("change", () => {
      localStorage.setItem(
        "aura_usage_alerts",
        String(DOM.settingUsageAlerts.checked),
      );
      flashSaved();
    });

    DOM.fallbackModelSelect?.addEventListener("change", () => {
      localStorage.setItem(
        "aura_fallback_model",
        DOM.fallbackModelSelect.value,
      );
      flashSaved();
    });

    document.querySelectorAll(".api-key-check-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const row = button.closest(".api-key-row");
        const provider = button.dataset.provider;
        const input = row.querySelector(".api-key-input");

        const key = input.value.trim();

        row.classList.remove("checking", "valid", "invalid");

        if (!key) {
          row.classList.add("invalid");
          button.textContent = "Invalid";

          setTimeout(() => {
            row.classList.remove("checking", "valid", "invalid");
            button.textContent = "Check API key";
          }, 4000);

          return;
        }

        row.classList.add("checking");

        button.disabled = true;
        button.textContent = "Checking...";

        try {
          let valid = false;
          let wapi = null;

          try {
              wapi = await window.web_api_ready;
          } catch (e) {
              console.error("[SETTING] Unable to load pywebview", e);
          }

          if (provider === "nvidia") {
            try {
              const response = await wapi.checkNvidiaApiKey(key);
              console.log(response);
              valid = response.valid === true;
            } catch (e) {
              console.error("NVIDIA API check failed:", e);
              valid = false;
            }
          } else {
            valid = await checkApiKey(key, provider);
          }

          row.classList.remove("checking");

          if (valid) {
            row.classList.add("valid");
            button.textContent = "Valid";
            wapi.save_key(String(provider).toUpperCase(), key)
          } else {
            row.classList.add("invalid");
            button.textContent = "Invalid";
          }

          setTimeout(() => {
            row.classList.remove("checking", "valid", "invalid");
            button.textContent = "Check API key";
            button.disabled = false;
            input.value = '';
          }, 2000);
        } catch (error) {
          console.error("API key check error:", error);

          row.classList.remove("checking", "valid");
          row.classList.add("invalid");
          
          button.textContent = "Invalid";
          
          setTimeout(() => {
            row.classList.remove("checking", "valid", "invalid");
            button.textContent = "Check API key";
            button.disabled = false;
            input.value = '';
          }, 2000);
        }
      });
    });

    DOM.themeSegments?.querySelectorAll(".segment").forEach((seg) => {
      seg.addEventListener("click", () => {
        const theme = seg.getAttribute("data-theme");
        setSegmentActive(DOM.themeSegments, theme, "theme");
        localStorage.setItem("aura_theme_mode", theme);
        applyThemeToPage(theme === "dark");
        flashSaved();
      });
    });

    DOM.lengthSegments?.querySelectorAll(".segment").forEach((seg) => {
      seg.addEventListener("click", () => {
        const val = seg.getAttribute("data-length");
        setSegmentActive(DOM.lengthSegments, val, "length");
        localStorage.setItem("aura_response_length", val);
        flashSaved();
      });
    });

    DOM.densitySegments?.querySelectorAll(".segment").forEach((seg) => {
      seg.addEventListener("click", () => {
        const val = seg.getAttribute("data-density");
        setSegmentActive(DOM.densitySegments, val, "density");
        localStorage.setItem("aura_message_density", val);
        flashSaved();
      });
    });

    DOM.voiceLangSelect?.addEventListener("change", () => {
      localStorage.setItem("aura_voice_lang", DOM.voiceLangSelect.value);
      flashSaved();
    });

    DOM.exportAllBtn?.addEventListener("click", exportAllConversations);
    DOM.clearAllBtn?.addEventListener("click", clearAllConversations);
  }

  function updateTempLabel(val) {
    if (!DOM.tempValueLabel) return;
    let descriptor = "balanced";
    if (val <= 0.3) descriptor = "precise";
    else if (val >= 0.8) descriptor = "highly creative";
    DOM.tempValueLabel.textContent = `${val.toFixed(2)} — ${descriptor}`;
  }

  function updateMaxTokensLabel(val) {
    if (!DOM.maxTokensLabel) return;
    DOM.maxTokensLabel.textContent = `${val.toLocaleString()} tokens`;
  }

  function applyThemeToPage(isDark) {
    document.body.classList.toggle("dark-theme", isDark);
  }

  function exportAllConversations() {
    let sessions = [];
    try {
      sessions = JSON.parse(
        localStorage.getItem("aura_editorial_sessions") || "[]",
      );
    } catch (e) {
      sessions = [];
    }

    if (!sessions.length) {
      showToast("No conversations to export");
      return;
    }

    let markdown = `# AURA — Full Conversation Archive\nExported: ${new Date().toISOString()}\n\n`;
    sessions.forEach((s) => {
      markdown += `## ${s.title || "Untitled"}\n\n`;
      (s.messages || []).forEach((m) => {
        markdown += `**${m.role === "user" ? "You" : "AURA"}:** ${m.content}\n\n`;
      });
      markdown += `---\n\n`;
    });

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AURA_Full_Archive_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("All conversations exported");
  }

  function clearAllConversations() {
    if (
      !confirm(
        "This permanently deletes every conversation on this device. Continue?",
      )
    )
      return;
    localStorage.removeItem("aura_editorial_sessions");
    showToast("All chat history cleared");
  }

  async function checkApiStatus(api, key, auth = "bearer") {
    try {
      let url = api;
      const headers = {};

      if (auth === "query") {
        url += `?key=${encodeURIComponent(key)}`;
      } else {
        headers.Authorization = `Bearer ${key}`;
      }

      const response = await fetch(url, {
        headers,
      });

      return response.ok;
    } catch (e) {
      return false;
    }
  }

  async function checkApiKey(key, provider) {
    const config = PROVIDERS_AND_APIS[provider];

    if (!config) {
      return false;
    }

    return await checkApiStatus(config.url, key, config.auth);
  }

  let saveFlashTimer = null;
  function flashSaved() {
    if (!DOM.saveStatus) return;
    DOM.saveStatus.textContent = "Saving...";
    if (saveFlashTimer) clearTimeout(saveFlashTimer);
    saveFlashTimer = setTimeout(() => {
      DOM.saveStatus.textContent = "All changes saved";
    }, 500);
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

  document.addEventListener("DOMContentLoaded", init);
})();
