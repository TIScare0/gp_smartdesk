(function () {
  'use strict';

  // Keep these in sync with script.js's model options / storage keys
  const MODELS = [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', tier: 'free', meta: '1M context · fast' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tier: 'free', meta: '1M context · fastest' },
    { id: 'cohere-command-r', name: 'Cohere Command R', tier: 'free', meta: '128K context' },
    { id: 'gpt-4o-mini', name: 'GPT-4o mini', tier: 'pro', meta: '128K context · BYO key' }
  ];

  const DOM = {
    navItems: document.querySelectorAll('.settings-nav-item'),
    panels: document.querySelectorAll('.settings-panel'),
    modelGrid: document.getElementById('modelGrid'),
    fallbackModelSelect: document.getElementById('fallbackModelSelect'),
    apiKeyGemini: document.getElementById('apiKeyGemini'),
    apiKeyCohere: document.getElementById('apiKeyCohere'),
    apiKeyOpenAI: document.getElementById('apiKeyOpenAI'),
    settingSystemPrompt: document.getElementById('settingSystemPrompt'),
    settingTemperature: document.getElementById('settingTemperature'),
    tempValueLabel: document.getElementById('tempValueLabel'),
    settingMaxTokens: document.getElementById('settingMaxTokens'),
    maxTokensLabel: document.getElementById('maxTokensLabel'),
    settingStreaming: document.getElementById('settingStreaming'),
    settingUsageAlerts: document.getElementById('settingUsageAlerts'),
    themeSegments: document.getElementById('themeSegments'),
    lengthSegments: document.getElementById('lengthSegments'),
    densitySegments: document.getElementById('densitySegments'),
    voiceLangSelect: document.getElementById('voiceLangSelect'),
    exportAllBtn: document.getElementById('exportAllBtn'),
    clearAllBtn: document.getElementById('clearAllBtn'),
    saveStatus: document.getElementById('saveStatus'),
    toastContainer: document.getElementById('toastContainer'),
    usageBarFill: document.getElementById('usageBarFill'),
    usageCountLabel: document.getElementById('usageCountLabel'),
    usageResetNote: document.getElementById('usageResetNote')
  };

  function init() {
    setupNav();
    renderModelGrid();
    loadValues();
    bindFieldEvents();
    updateUsageDisplay();
  }

  // ---------- Sidebar nav / panel switching ----------
  function setupNav() {
    DOM.navItems.forEach((item) => {
      item.addEventListener('click', () => {
        const target = item.getAttribute('data-panel');
        DOM.navItems.forEach((i) => i.classList.remove('active'));
        item.classList.add('active');
        DOM.panels.forEach((p) => p.classList.toggle('active', p.id === `panel-${target}`));
      });
    });
  }

  // ---------- Model grid ----------
  function renderModelGrid() {
    if (!DOM.modelGrid) return;
    const activeModel = localStorage.getItem('aura_active_model') || 'gemini-2.5-pro';

    DOM.modelGrid.innerHTML = MODELS.map((m) => `
      <button class="model-option-card ${m.id === activeModel ? 'selected' : ''}" data-model="${m.id}">
        <div class="model-option-top">
          <span class="model-option-name">${m.name}</span>
          <span class="model-tier-badge ${m.tier}">${m.tier}</span>
        </div>
        <span class="model-option-meta">${m.meta}</span>
      </button>
    `).join('');

    DOM.modelGrid.querySelectorAll('.model-option-card').forEach((card) => {
      card.addEventListener('click', () => {
        const modelId = card.getAttribute('data-model');
        localStorage.setItem('aura_active_model', modelId);
        DOM.modelGrid.querySelectorAll('.model-option-card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        flashSaved();
      });
    });
  }

  // ---------- Load stored values ----------
  function loadValues() {
    if (DOM.settingSystemPrompt) {
      DOM.settingSystemPrompt.value = localStorage.getItem('aura_system_prompt') ||
        'You are AURA, an elite editorial intelligence. Provide articulated reasoning, elegant typography-aware output, pristine code structures with TypeScript/Tailwind, and refined prose with genuine clarity.';
    }

    const temp = parseFloat(localStorage.getItem('aura_temperature') || '0.7');
    if (DOM.settingTemperature) {
      DOM.settingTemperature.value = temp;
      updateTempLabel(temp);
    }

    const maxTokens = parseInt(localStorage.getItem('aura_max_tokens') || '2048', 10);
    if (DOM.settingMaxTokens) {
      DOM.settingMaxTokens.value = maxTokens;
      updateMaxTokensLabel(maxTokens);
    }

    if (DOM.settingStreaming) {
      DOM.settingStreaming.checked = localStorage.getItem('aura_streaming') !== 'false';
    }

    if (DOM.settingUsageAlerts) {
      DOM.settingUsageAlerts.checked = localStorage.getItem('aura_usage_alerts') !== 'false';
    }

    if (DOM.fallbackModelSelect) {
      DOM.fallbackModelSelect.value = localStorage.getItem('aura_fallback_model') || 'none';
    }

    if (DOM.apiKeyGemini) DOM.apiKeyGemini.value = localStorage.getItem('aura_api_key_gemini') || '';
    if (DOM.apiKeyCohere) DOM.apiKeyCohere.value = localStorage.getItem('aura_api_key_cohere') || '';
    if (DOM.apiKeyOpenAI) DOM.apiKeyOpenAI.value = localStorage.getItem('aura_api_key_openai') || '';

    const theme = localStorage.getItem('aura_theme_mode') || 'light';
    setSegmentActive(DOM.themeSegments, theme === 'dark' ? 'dark' : 'light', 'theme');

    const length = localStorage.getItem('aura_response_length') || 'balanced';
    setSegmentActive(DOM.lengthSegments, length, 'length');

    const density = localStorage.getItem('aura_message_density') || 'comfortable';
    setSegmentActive(DOM.densitySegments, density, 'density');

    if (DOM.voiceLangSelect) {
      DOM.voiceLangSelect.value = localStorage.getItem('aura_voice_lang') || 'en-US';
    }

    applyThemeToPage(theme === 'dark');
  }

  function setSegmentActive(container, value, dataKey) {
    if (!container) return;
    container.querySelectorAll('.segment').forEach((seg) => {
      seg.classList.toggle('active', seg.getAttribute(`data-${dataKey}`) === value);
    });
  }

  // ---------- Bind events ----------
  function bindFieldEvents() {
    DOM.settingSystemPrompt?.addEventListener('input', () => {
      localStorage.setItem('aura_system_prompt', DOM.settingSystemPrompt.value);
      flashSaved();
    });

    DOM.settingTemperature?.addEventListener('input', () => {
      const val = parseFloat(DOM.settingTemperature.value);
      localStorage.setItem('aura_temperature', String(val));
      updateTempLabel(val);
      flashSaved();
    });

    DOM.settingMaxTokens?.addEventListener('input', () => {
      const val = parseInt(DOM.settingMaxTokens.value, 10);
      localStorage.setItem('aura_max_tokens', String(val));
      updateMaxTokensLabel(val);
      flashSaved();
    });

    DOM.settingStreaming?.addEventListener('change', () => {
      localStorage.setItem('aura_streaming', String(DOM.settingStreaming.checked));
      flashSaved();
    });

    DOM.settingUsageAlerts?.addEventListener('change', () => {
      localStorage.setItem('aura_usage_alerts', String(DOM.settingUsageAlerts.checked));
      flashSaved();
    });

    DOM.fallbackModelSelect?.addEventListener('change', () => {
      localStorage.setItem('aura_fallback_model', DOM.fallbackModelSelect.value);
      flashSaved();
    });

    DOM.apiKeyGemini?.addEventListener('input', () => {
      localStorage.setItem('aura_api_key_gemini', DOM.apiKeyGemini.value);
      flashSaved();
    });
    DOM.apiKeyCohere?.addEventListener('input', () => {
      localStorage.setItem('aura_api_key_cohere', DOM.apiKeyCohere.value);
      flashSaved();
    });
    DOM.apiKeyOpenAI?.addEventListener('input', () => {
      localStorage.setItem('aura_api_key_openai', DOM.apiKeyOpenAI.value);
      flashSaved();
    });

    DOM.themeSegments?.querySelectorAll('.segment').forEach((seg) => {
      seg.addEventListener('click', () => {
        const theme = seg.getAttribute('data-theme');
        setSegmentActive(DOM.themeSegments, theme, 'theme');
        localStorage.setItem('aura_theme_mode', theme);
        applyThemeToPage(theme === 'dark');
        flashSaved();
      });
    });

    DOM.lengthSegments?.querySelectorAll('.segment').forEach((seg) => {
      seg.addEventListener('click', () => {
        const val = seg.getAttribute('data-length');
        setSegmentActive(DOM.lengthSegments, val, 'length');
        localStorage.setItem('aura_response_length', val);
        flashSaved();
      });
    });

    DOM.densitySegments?.querySelectorAll('.segment').forEach((seg) => {
      seg.addEventListener('click', () => {
        const val = seg.getAttribute('data-density');
        setSegmentActive(DOM.densitySegments, val, 'density');
        localStorage.setItem('aura_message_density', val);
        flashSaved();
      });
    });

    DOM.voiceLangSelect?.addEventListener('change', () => {
      localStorage.setItem('aura_voice_lang', DOM.voiceLangSelect.value);
      flashSaved();
    });

    DOM.exportAllBtn?.addEventListener('click', exportAllConversations);
    DOM.clearAllBtn?.addEventListener('click', clearAllConversations);
  }

  function updateTempLabel(val) {
    if (!DOM.tempValueLabel) return;
    let descriptor = 'balanced';
    if (val <= 0.3) descriptor = 'precise';
    else if (val >= 0.8) descriptor = 'highly creative';
    DOM.tempValueLabel.textContent = `${val.toFixed(2)} — ${descriptor}`;
  }

  function updateMaxTokensLabel(val) {
    if (!DOM.maxTokensLabel) return;
    DOM.maxTokensLabel.textContent = `${val.toLocaleString()} tokens`;
  }

  function applyThemeToPage(isDark) {
    document.body.classList.toggle('dark-theme', isDark);
  }

  // ---------- Usage display (reads sessions from localStorage as a proxy) ----------
  function updateUsageDisplay() {
    if (!DOM.usageBarFill) return;
    let sessions = [];
    try {
      sessions = JSON.parse(localStorage.getItem('aura_editorial_sessions') || '[]');
    } catch (e) {
      sessions = [];
    }
    const todayCount = sessions.reduce((sum, s) => sum + (s.messages ? s.messages.length : 0), 0);
    const limit = 100;
    const pct = Math.min(100, Math.round((todayCount / limit) * 100));

    DOM.usageBarFill.style.width = `${pct}%`;
    if (DOM.usageCountLabel) DOM.usageCountLabel.textContent = `${todayCount} / ${limit}`;
  }

  // ---------- Data actions ----------
  function exportAllConversations() {
    let sessions = [];
    try {
      sessions = JSON.parse(localStorage.getItem('aura_editorial_sessions') || '[]');
    } catch (e) {
      sessions = [];
    }

    if (!sessions.length) {
      showToast('No conversations to export');
      return;
    }

    let markdown = `# AURA — Full Conversation Archive\nExported: ${new Date().toISOString()}\n\n`;
    sessions.forEach((s) => {
      markdown += `## ${s.title || 'Untitled'}\n\n`;
      (s.messages || []).forEach((m) => {
        markdown += `**${m.role === 'user' ? 'You' : 'AURA'}:** ${m.content}\n\n`;
      });
      markdown += `---\n\n`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AURA_Full_Archive_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('All conversations exported');
  }

  function clearAllConversations() {
    if (!confirm('This permanently deletes every conversation on this device. Continue?')) return;
    localStorage.removeItem('aura_editorial_sessions');
    showToast('All chat history cleared');
    updateUsageDisplay();
  }

  // ---------- Save indicator ----------
  let saveFlashTimer = null;
  function flashSaved() {
    if (!DOM.saveStatus) return;
    DOM.saveStatus.textContent = 'Saving...';
    if (saveFlashTimer) clearTimeout(saveFlashTimer);
    saveFlashTimer = setTimeout(() => {
      DOM.saveStatus.textContent = 'All changes saved';
    }, 500);
  }

  // ---------- Toast (standalone copy since this page loads independently) ----------
  function showToast(msg) {
    if (!DOM.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'editorial-toast';
    toast.innerText = msg;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-6px)';
      setTimeout(() => toast.remove(), 250);
    }, 2200);
  }

  document.addEventListener('DOMContentLoaded', init);
})();