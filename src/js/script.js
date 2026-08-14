/**
 * AURA — Intelligent Editorial AI Engine
 * Inspired by a-lign.studio & studenterkilden.dk
 * Pure HTML, CSS, JavaScript
 */

(function () {
  'use strict';

  // Editorial Kinetic Cards (High-resolution curated Nordic architecture, spatial & sensory design)
  const KINETIC_PROMPTS = [
    {
      id: 'card-1',
      tag: 'ARCHITECTURE',
      title: 'Nordic Monolith & Tactile Timber',
      thumb: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80',
      prompt: 'Formulate an architectural essay on Nordic structural minimalism, tactile timber joinery, and the orchestration of natural northern daylight.',
      pos: { top: '10%', left: '7%' },
      delay: '0s'
    },
    {
      id: 'card-2',
      tag: 'SENSORY DESIGN',
      title: 'Kilden Botanical Gastronomy',
      thumb: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=600&q=80',
      prompt: 'Explore the culinary choreography of Copenhagen fine dining: seasonal foraging, ceramic materiality, and ambient acoustic pacing.',
      pos: { top: '34%', right: '6%' },
      delay: '-4s'
    },
    {
      id: 'card-3',
      tag: 'TYPOGRAPHIC CODE',
      title: 'Mathematical Design Token System',
      thumb: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&q=80',
      prompt: 'Write a production-grade TypeScript design token compiler with dynamic modular scale typography and fluid rem conversions.',
      pos: { bottom: '12%', left: '10%' },
      delay: '-8s'
    },
    {
      id: 'card-4',
      tag: 'EDITORIAL ESSAY',
      title: 'Artificial Cognition & Spatial Form',
      thumb: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&q=80',
      prompt: 'Synthesize a critique examining how artificial neural models perceive spatial rhythm, negative space, and human aesthetic balance.',
      pos: { top: '44%', left: '4%' },
      delay: '-12s'
    },
    {
      id: 'card-5',
      tag: 'BRAND DIRECTION',
      title: 'Aura Studio Identity & Tone',
      thumb: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=600&q=80',
      prompt: 'Draft an editorial brand guideline book featuring quiet luxury tone of voice, grid typography systems, and tactile packaging materials.',
      pos: { bottom: '14%', right: '9%' },
      delay: '-6s'
    }
  ];

  // State
  const DEFAULT_SESSIONS = [
    {
      id: 'session-sample-1',
      title: 'Nordic Architectural Discourse & Light',
      createdAt: Date.now() - 3600 * 1000 * 2,
      messages: [
        {
          role: 'user',
          text: 'Explore the architectural philosophy of Nordic modernism and tactile materiality.'
        },
        {
          role: 'assistant',
          text: 'Nordic architectural modernism rests upon the subtle interplay of natural daylight, organic timber grain, and deliberate spatial silence. Rather than imposing monumental geometry, the form yields to landscape, allowing low-angled Scandinavian sunbeams to sculpt atmospheric warmth within restrained minimalist volumes.'
        }
      ]
    },
    {
      id: 'session-sample-2',
      title: 'Tactile Typography & Serif Proportions',
      createdAt: Date.now() - 3600 * 1000 * 24,
      messages: [
        {
          role: 'user',
          text: 'How do high-contrast display serifs maintain baseline rhythm in editorial design?'
        },
        {
          role: 'assistant',
          text: 'In refined editorial typesetting, high-contrast serifs achieve visual tension through mathematical stroke modulation. Optical size adjustments, generous leading ratios (1.5–1.7), and intentional tracking ensure that headline rhythm feels sculpted and commanding without sacrificing legibility.'
        }
      ]
    },
    {
      id: 'session-sample-3',
      title: 'Kinetic UI Physics & Fluid States',
      createdAt: Date.now() - 3600 * 1000 * 48,
      messages: [
        {
          role: 'user',
          text: 'Draft principles for micro-interactions with cubic-bezier easing.'
        },
        {
          role: 'assistant',
          text: 'Micro-interactions should feel tactile and mass-aware. Utilizing asymmetric cubic-bezier curves like `cubic-bezier(0.2, 0, 0, 1)` yields an immediate mechanical response followed by an elegant, protracted deceleration that mimics physical inertia.'
        }
      ]
    }
  ];

  let storedSessions = [];
  try {
    const rawSessions = localStorage.getItem('aura_editorial_sessions');
    if (rawSessions) {
      storedSessions = JSON.parse(rawSessions);
    }
    if (!storedSessions || storedSessions.length === 0) {
      storedSessions = DEFAULT_SESSIONS;
      localStorage.setItem('aura_editorial_sessions', JSON.stringify(DEFAULT_SESSIONS));
    }
  } catch (e) {
    storedSessions = DEFAULT_SESSIONS;
  }

  const state = {
    isHeroActive: true,
    isStreaming: false,
    currentSessionId: null,
    sessions: storedSessions,
    activeModel: localStorage.getItem('aura_active_model') || 'gemini-2.5-pro',
    temperature: parseFloat(localStorage.getItem('aura_temperature') || '0.7'),
    systemPrompt: localStorage.getItem('aura_system_prompt') || 'You are AURA, an elite editorial intelligence. Provide articulated reasoning, elegant typography-aware output, pristine code structures with TypeScript/Tailwind, and refined prose with genuine clarity.',
    apiKey: localStorage.getItem('aura_api_key') || '',
    attachedMedia: null,
    isListening: false,
    messages: []
  };

  // DOM Handles
  const DOM = {
    appContainer: document.getElementById('appContainer'),
    editorialSidebar: document.getElementById('editorialSidebar'),
    sidebarMobileBackdrop: document.getElementById('sidebarMobileBackdrop'),
    sidebarBrandBtn: document.getElementById('sidebarLogoBtn') || document.getElementById('sidebarBrandBtn'),
    sidebarToggleCollapseBtn: document.getElementById('sidebarCollapseToggleBtn') || document.getElementById('sidebarToggleCollapseBtn'),
    headerSidebarToggleBtn: document.getElementById('headerSidebarToggleBtn'),
    sidebarNewChatBtn: document.getElementById('sidebarNewChatBtn'),
    sidebarSearchInput: document.getElementById('sidebarSearchInput'),
    sidebarSearchRailBtn: document.getElementById('railSearchIconBtn') || document.getElementById('sidebarSearchRailBtn'),
    sidebarInspirationLink: document.getElementById('sidebarGalleryBtn') || document.getElementById('sidebarInspirationLink'),
    sidebarNotebooksLink: document.getElementById('sidebarNotebooksBtn') || document.getElementById('sidebarNotebooksLink'),
    sidebarChatCount: document.getElementById('sidebarHistoryCount') || document.getElementById('sidebarChatCount'),
    sidebarChatList: document.getElementById('sidebarHistoryList') || document.getElementById('sidebarChatList'),
    sidebarUserProfile: document.getElementById('userProfileRow') || document.getElementById('sidebarUserProfile'),
    sidebarSettingsBtn: document.getElementById('settingsModalBtn') || document.getElementById('sidebarSettingsBtn'),
    customCursor: document.getElementById('customCursor'),
    customCursorFollower: document.getElementById('customCursorFollower'),
    kineticCanvas: document.getElementById('kineticCanvas'),
    heroStage: document.getElementById('heroInquiryStage'),
    heroCuratedPills: document.getElementById('heroCuratedPills'),
    chatStage: document.getElementById('chatConversationStage'),
    messagesStream: document.getElementById('messagesStreamContainer'),
    threadTitle: document.getElementById('threadTitleDisplay'),
    threadSearchInput: document.getElementById('threadSearchInput'),
    newChatTopBtn: document.getElementById('newChatTopBtn'),
    exportChatBtn: document.getElementById('exportChatBtn'),
    clearStreamBtn: document.getElementById('clearStreamBtn'),
    composerInput: document.getElementById('composerMainInput'),
    composerSendBtn: document.getElementById('composerSendBtn'),
    composerAttachBtn: document.getElementById('composerAttachBtn'),
    hiddenMediaInput: document.getElementById('hiddenMediaInput'),
    composerMediaPreview: document.getElementById('composerMediaPreview'),
    composerVoiceBtn: document.getElementById('composerVoiceBtn'),
    composerModelSelectorBtn: document.getElementById('composerModelSelectorBtn'),
    activeModelLabel: document.getElementById('activeModelLabel'),
    modelPickerPopover: document.getElementById('modelPickerPopover'),
    brandLogoBtn: document.getElementById('brandLogoBtn'),
    liveClock: document.getElementById('liveClock'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    settingsModalBackdrop: document.getElementById('settingsModalBackdrop'),
    closeSettingsModalBtn: document.getElementById('closeSettingsModalBtn'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    settingSystemPrompt: document.getElementById('settingSystemPrompt'),
    settingTemperature: document.getElementById('settingTemperature'),
    tempValueLabel: document.getElementById('tempValueLabel'),
    settingCustomApiKey: document.getElementById('settingCustomApiKey'),
    toastContainer: document.getElementById('toastContainer')
  };

  // Initializer
  function init() {
    setupSidebarState();
    renderKineticCards();
    renderSidebarChats();
    setupCursor();
    setupLiveClock();
    setupListeners();
    applyPreferences();
  }

  // Sidebar Layout Management (Expanded vs Collapsed Icon Rail)
  function setupSidebarState() {
    const savedState = localStorage.getItem('aura_sidebar_state') || 'expanded';
    if (window.innerWidth > 768) {
      if (savedState === 'collapsed') {
        DOM.appContainer?.classList.remove('sidebar-expanded');
        DOM.appContainer?.classList.add('sidebar-collapsed');
      } else {
        DOM.appContainer?.classList.remove('sidebar-collapsed');
        DOM.appContainer?.classList.add('sidebar-expanded');
      }
    } else {
      DOM.appContainer?.classList.remove('sidebar-collapsed');
      DOM.appContainer?.classList.add('sidebar-expanded');
    }
  }

  function toggleSidebar() {
    if (window.innerWidth <= 768) {
      DOM.appContainer?.classList.toggle('sidebar-mobile-open');
    } else {
      const isCollapsed = DOM.appContainer?.classList.contains('sidebar-collapsed');
      if (isCollapsed) {
        DOM.appContainer?.classList.remove('sidebar-collapsed');
        DOM.appContainer?.classList.add('sidebar-expanded');
        localStorage.setItem('aura_sidebar_state', 'expanded');
      } else {
        DOM.appContainer?.classList.remove('sidebar-expanded');
        DOM.appContainer?.classList.add('sidebar-collapsed');
        localStorage.setItem('aura_sidebar_state', 'collapsed');
      }
    }
  }

  function closeMobileSidebar() {
    DOM.appContainer?.classList.remove('sidebar-mobile-open');
  }

  // Render Floating Kinetic Inspiration Cards
  function renderKineticCards() {
    if (!DOM.kineticCanvas) return;
    DOM.kineticCanvas.innerHTML = '';

    KINETIC_PROMPTS.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'kinetic-card';
      const delaySec = `${index * 0.15}s`;
      card.style.setProperty('--card-delay', delaySec);
      card.style.animationDelay = `${delaySec}, ${index * 3}s`;

      Object.entries(item.pos).forEach(([k, v]) => {
        card.style[k] = v;
      });

      card.innerHTML = `
        <div class="kinetic-card-inner">
          <div class="card-img-wrap">
            <img class="kinetic-thumb" src="${item.thumb}" alt="${item.title}" loading="lazy" />
          </div>
          <div class="card-content">
            <div class="card-tag">${item.tag}</div>
            <div class="card-title">${item.title}</div>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        startConversation(item.prompt, item.title);
      });

      DOM.kineticCanvas.appendChild(card);
    });

    // 3D Parallax & Mouse Response on Kinetic Card Inners (preserves outer upward float)
    window.addEventListener('mousemove', (e) => {
      const { innerWidth, innerHeight } = window;
      const xOffset = (e.clientX / innerWidth - 0.5) * 16;
      const yOffset = (e.clientY / innerHeight - 0.5) * 16;

      document.querySelectorAll('.kinetic-card-inner').forEach((innerEl, idx) => {
        const factor = (idx + 1) * 0.35;
        innerEl.style.transform = `translate(${xOffset * factor}px, ${yOffset * factor}px)`;
      });
    });
  }

  // Custom Magnetic Cursor (Editorial Polish)
  function setupCursor() {
    let mouseX = 0, mouseY = 0;
    let followerX = 0, followerY = 0;

    window.addEventListener('mousemove', (e) => {
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

    // Hover state for interactive controls
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('button, a, .inquiry-pill, .kinetic-card, input, textarea, .model-option-row')) {
        document.body.classList.add('cursor-hover');
      } else {
        document.body.classList.remove('cursor-hover');
      }
    });
  }

  // Live Copenhagen / Studio Clock
  function setupLiveClock() {
    function tick() {
      if (DOM.liveClock) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        DOM.liveClock.innerText = timeStr;
      }
    }
    tick();
    setInterval(tick, 1000);
  }

  // Attach Event Listeners
  function setupListeners() {
    // Curated Inquiry Pills
    DOM.heroCuratedPills?.addEventListener('click', (e) => {
      const pill = e.target.closest('.inquiry-pill');
      if (!pill) return;
      const prompt = pill.getAttribute('data-prompt');
      const title = pill.querySelector('.pill-label')?.innerText || 'Inquiry';
      startConversation(prompt, title);
    });

    // Sidebar Brand Monogram & Collapse Toggles
    DOM.sidebarBrandBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      if (DOM.appContainer?.classList.contains('sidebar-collapsed')) {
        toggleSidebar();
      } else {
        returnToHero();
      }
    });

    DOM.sidebarToggleCollapseBtn?.addEventListener('click', toggleSidebar);
    DOM.headerSidebarToggleBtn?.addEventListener('click', toggleSidebar);

    // Sidebar Mobile Backdrop
    DOM.sidebarMobileBackdrop?.addEventListener('click', closeMobileSidebar);

    // Top Header Brand Click
    DOM.brandLogoBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.innerWidth <= 768) {
        toggleSidebar();
      } else {
        returnToHero();
      }
    });

    // New Chat Action Buttons
    DOM.newChatTopBtn?.addEventListener('click', returnToHero);
    DOM.sidebarNewChatBtn?.addEventListener('click', () => {
      returnToHero();
      if (window.innerWidth <= 768) closeMobileSidebar();
    });

    // Sidebar Search & Rail Action
    DOM.sidebarSearchInput?.addEventListener('input', (e) => {
      renderSidebarChats(e.target.value);
    });

    DOM.sidebarSearchRailBtn?.addEventListener('click', () => {
      if (DOM.appContainer?.classList.contains('sidebar-collapsed')) {
        toggleSidebar();
        setTimeout(() => DOM.sidebarSearchInput?.focus(), 320);
      }
    });

    // Sidebar Quick Nav
    DOM.sidebarInspirationLink?.addEventListener('click', () => {
      returnToHero();
      if (window.innerWidth <= 768) closeMobileSidebar();
    });

    DOM.sidebarNotebooksLink?.addEventListener('click', () => {
      startConversation('Draft an architectural and sensory design journal entry focusing on light, materiality, and minimalist Nordic forms.', 'Architectural Notebook');
      if (window.innerWidth <= 768) closeMobileSidebar();
    });

    // Sidebar User Profile & Settings
    DOM.sidebarUserProfile?.addEventListener('click', openSettings);
    DOM.sidebarSettingsBtn?.addEventListener('click', openSettings);

    // Composer Input Events
    DOM.composerInput?.addEventListener('input', () => {
      DOM.composerInput.style.height = 'auto';
      DOM.composerInput.style.height = Math.min(DOM.composerInput.scrollHeight, 140) + 'px';
      if (DOM.composerSendBtn) {
        DOM.composerSendBtn.disabled = !DOM.composerInput.value.trim() && !state.attachedMedia;
      }
    });

    DOM.composerInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitComposer();
      }
    });

    DOM.composerSendBtn?.addEventListener('click', submitComposer);

    // Attach File
    DOM.composerAttachBtn?.addEventListener('click', () => {
      DOM.hiddenMediaInput?.click();
    });

    DOM.hiddenMediaInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          state.attachedMedia = {
            name: file.name,
            type: file.type,
            dataUrl: loadEvt.target.result
          };
          renderMediaPreview();
          if (DOM.composerSendBtn) DOM.composerSendBtn.disabled = false;
        };
        reader.readAsDataURL(file);
      }
    });

    // Voice Dictation
    DOM.composerVoiceBtn?.addEventListener('click', toggleVoiceDictation);

    // Model Selector Popover
    DOM.composerModelSelectorBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      DOM.modelPickerPopover?.classList.toggle('open');
      positionPopover(DOM.modelPickerPopover, DOM.composerModelSelectorBtn);
    });

    document.querySelectorAll('.model-option-row').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget;
        const modelId = target.getAttribute('data-model');
        const modelName = target.getAttribute('data-name');
        setModel(modelId, modelName);
        DOM.modelPickerPopover?.classList.remove('open');
      });
    });

    // Thread Search
    DOM.threadSearchInput?.addEventListener('input', (e) => {
      filterMessages(e.target.value.toLowerCase().trim());
    });

    // Thread Actions
    DOM.exportChatBtn?.addEventListener('click', exportConversation);
    DOM.clearStreamBtn?.addEventListener('click', clearCurrentStream);

    // Settings Modal
    DOM.closeSettingsModalBtn?.addEventListener('click', closeSettings);
    DOM.settingsModalBackdrop?.addEventListener('click', (e) => {
      if (e.target === DOM.settingsModalBackdrop) closeSettings();
    });
    DOM.saveSettingsBtn?.addEventListener('click', saveSettings);
    DOM.settingTemperature?.addEventListener('input', (e) => {
      if (DOM.tempValueLabel) DOM.tempValueLabel.innerText = e.target.value;
    });

    // Theme Toggle
    DOM.themeToggleBtn?.addEventListener('click', toggleTheme);

    // Global Click to close popovers
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.editorial-popover') && !e.target.closest('.composer-model-pill')) {
        DOM.modelPickerPopover?.classList.remove('open');
      }
    });
  }

  // Switch to Active Conversation Mode
  function startConversation(promptText, title = 'Inquiry') {
    state.isHeroActive = false;

    // Transition Hero to Chat Stream
    DOM.heroStage?.classList.add('hidden-stage');
    DOM.chatStage?.classList.remove('hidden-stage');

    if (DOM.threadTitle) {
      DOM.threadTitle.innerText = title;
    }

    state.currentSessionId = 'session_' + Date.now();
    state.messages = [];

    if (DOM.messagesStream) {
      DOM.messagesStream.innerHTML = '';
    }

    processMessageSubmission(promptText);

    setTimeout(() => {
      DOM.composerInput?.focus();
    }, 400);
  }

  // Return to Editorial Hero Stage
  function returnToHero() {
    state.isHeroActive = true;
    state.attachedMedia = null;
    clearMediaPreview();

    if (DOM.composerInput) {
      DOM.composerInput.value = '';
      DOM.composerInput.style.height = 'auto';
    }
    if (DOM.composerSendBtn) DOM.composerSendBtn.disabled = true;

    DOM.heroStage?.classList.remove('hidden-stage');
    DOM.chatStage?.classList.add('hidden-stage');

    // Re-trigger cards upward rise
    renderKineticCards();

    setTimeout(() => {
      DOM.composerInput?.focus();
    }, 300);
  }

  // Handle Send from Composer
  function submitComposer() {
    if (state.isStreaming) return;
    const text = DOM.composerInput?.value.trim() || '';
    if (!text && !state.attachedMedia) return;

    DOM.composerInput.value = '';
    DOM.composerInput.style.height = 'auto';
    if (DOM.composerSendBtn) DOM.composerSendBtn.disabled = true;

    if (state.isHeroActive) {
      startConversation(text, text.slice(0, 28) + '...');
    } else {
      processMessageSubmission(text);
    }
  }

  // Process & Render Messages
  async function processMessageSubmission(userText) {
    if (!userText && !state.attachedMedia) return;

    const media = state.attachedMedia;
    state.attachedMedia = null;
    clearMediaPreview();

    // 1. User Message
    const userMsg = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: userText,
      media: media,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    state.messages.push(userMsg);
    appendMessageElement(userMsg);
    persistSession(userText);

    // 2. Assistant Placeholder
    const aiMsgId = 'msg_' + (Date.now() + 1);
    const aiMsg = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    state.messages.push(aiMsg);
    const aiEl = appendMessageElement(aiMsg, true);

    // 3. AI Stream Request
    await streamEditorialResponse(userText, media, aiEl, aiMsg);
  }

  // Render Single Message in Stream
  function appendMessageElement(msg, isPlaceholder = false) {
    if (!DOM.messagesStream) return null;

    const row = document.createElement('div');
    row.className = `message-row ${msg.role === 'user' ? 'user' : 'ai'}`;
    row.id = msg.id;

    if (msg.role === 'user') {
      row.innerHTML = `
        <div class="msg-avatar">YOU</div>
        <div class="msg-column">
          ${msg.media ? `<img src="${msg.media.dataUrl}" style="max-width:240px;border-radius:8px;margin-bottom:6px;border:1px solid var(--border-hairline);" alt="Attachment" />` : ''}
          <div class="msg-bubble">${escapeHtml(msg.content)}</div>
        </div>
      `;
    } else {
      row.innerHTML = `
        <div class="msg-avatar">AURA</div>
        <div class="msg-column" style="flex:1;">
          <div class="msg-bubble" id="body_${msg.id}">
            ${isPlaceholder ? '<span style="color:var(--text-subtle);font-style:italic;">Formulating reasoned synthesis...</span>' : renderMarkdown(msg.content)}
          </div>
          <div class="ai-actions-shelf" id="actions_${msg.id}" style="${isPlaceholder ? 'display:none;' : ''}">
            <button class="msg-chip-action copy-act" data-id="${msg.id}">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Copy
            </button>
            <button class="msg-chip-action speak-act" data-id="${msg.id}">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
              Recite
            </button>
          </div>
        </div>
      `;
    }

    DOM.messagesStream.appendChild(row);
    scrollToStreamBottom();
    bindRowActions(row, msg);
    return row;
  }

  // Stream Response
  async function streamEditorialResponse(userPrompt, media, el, msgObj) {
    state.isStreaming = true;
    const bodyEl = document.getElementById(`body_${msgObj.id}`);
    const shelfEl = document.getElementById(`actions_${msgObj.id}`);

    try {
      const fullSystemDirective = `${state.systemPrompt}\nContext constraints: Maintain serene editorial tone, structured headings, clean code syntax, and thoughtful clarity. Temperature: ${state.temperature}.`;
      const encodedPrompt = encodeURIComponent(`${fullSystemDirective}\n\nUser: ${userPrompt}`);
      const modelParam = state.activeModel.includes('gemini') ? 'gemini' : 'openai';
      const endpoint = `https://text.pollinations.ai/${encodedPrompt}?model=${modelParam}&system=${encodeURIComponent(fullSystemDirective)}`;

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Stream connection interrupted');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        if (bodyEl) {
          bodyEl.innerHTML = renderMarkdown(accumulated);
        }
        scrollToStreamBottom();
      }

      msgObj.content = accumulated;
      if (shelfEl) shelfEl.style.display = 'flex';

    } catch (err) {
      console.warn('Fallback synthesis generator:', err);
      const fallbackProse = `### Architectural & Conceptual Synthesis\n\nRegarding *"${userPrompt}"*:\n\n1. **Materiality & Negative Space**: Prioritize natural tactile materials with unadorned surfaces. Let negative space frame the essential intent.\n2. **Rhythmic Clarity**: Create harmonious proportions between typography and interactive components.\n3. **Modular Foundation**:\n\n\`\`\`typescript\n// Architectural Interface Design Token\nexport interface StudioDesignToken {\n  fontFamily: 'Cormorant Garamond' | 'Plus Jakarta Sans';\n  palette: {\n    canvas: '#f6f4ee';\n    ink: '#181715';\n    accent: '#b38b4d';\n  };\n  spacingScale: (step: number) => string;\n}\n\`\`\`\n\n> "Simplicity is not the lack of clutter, that's a consequence of simplicity. Simplicity somehow essentially describes the purpose and place of an object and its components."\n\n*Would you like to refine the structural specifications or explore further?*`;

      let charIndex = 0;
      const streamTimer = setInterval(() => {
        charIndex += 14;
        if (charIndex >= fallbackProse.length) {
          clearInterval(streamTimer);
          msgObj.content = fallbackProse;
          if (bodyEl) bodyEl.innerHTML = renderMarkdown(fallbackProse);
          if (shelfEl) shelfEl.style.display = 'flex';
          state.isStreaming = false;
        } else {
          if (bodyEl) bodyEl.innerHTML = renderMarkdown(fallbackProse.slice(0, charIndex));
        }
        scrollToStreamBottom();
      }, 16);
    } finally {
      state.isStreaming = false;
      persistSession();
    }
  }

  // Markdown Parser
  function renderMarkdown(raw) {
    if (!raw) return '';
    let text = escapeHtml(raw);

    // Code Blocks
    text = text.replace(/```([a-zA-Z0-9]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || 'typescript';
      const cleanCode = code.trim();
      return `
        <div class="code-container">
          <div class="code-header">
            <span>${language}</span>
            <button class="code-copy-btn" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(cleanCode)}')); window.showAuraToast('Code copied to clipboard');">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Copy
            </button>
          </div>
          <pre><code>${cleanCode}</code></pre>
        </div>
      `;
    });

    // Inline Code
    text = text.replace(/`([^`]+)`/g, '<code style="font-family:var(--font-mono);font-size:12px;background:var(--bg-surface-subtle);padding:2px 6px;border-radius:4px;color:var(--accent-gold);border:1px solid var(--border-hairline);">$1</code>');

    // Headers
    text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Blockquotes
    text = text.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Bold & Italics
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Unordered lists
    text = text.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Paragraph breaks
    text = text.replace(/\n\n/g, '</p><p>');
    text = `<p>${text}</p>`;
    return text;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function scrollToStreamBottom() {
    if (DOM.messagesStream) {
      DOM.messagesStream.scrollTop = DOM.messagesStream.scrollHeight;
    }
  }

  function bindRowActions(row, msg) {
    row.querySelector('.copy-act')?.addEventListener('click', () => {
      navigator.clipboard.writeText(msg.content);
      showToast('Copied to clipboard');
    });

    row.querySelector('.speak-act')?.addEventListener('click', () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const clean = msg.content.replace(/[`#*_>]/g, '');
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
        showToast('Reciting response...');
      }
    });
  }

  // Media Attachment Rendering
  function renderMediaPreview() {
    if (!DOM.composerMediaPreview) return;
    if (!state.attachedMedia) {
      DOM.composerMediaPreview.innerHTML = '';
      return;
    }

    DOM.composerMediaPreview.innerHTML = `
      <div class="media-chip">
        <img src="${state.attachedMedia.dataUrl}" alt="Media" />
        <span>${state.attachedMedia.name}</span>
        <button class="media-chip-remove" id="removeMediaBtn">&times;</button>
      </div>
    `;

    document.getElementById('removeMediaBtn')?.addEventListener('click', () => {
      state.attachedMedia = null;
      renderMediaPreview();
    });
  }

  function clearMediaPreview() {
    state.attachedMedia = null;
    renderMediaPreview();
  }

  // Voice Dictation (SpeechRecognition)
  function toggleVoiceDictation() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Voice transcription not available in current browser');
      return;
    }

    if (state.isListening) {
      state.recognition?.stop();
      state.isListening = false;
      DOM.composerVoiceBtn?.classList.remove('active');
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = 'en-US';
      rec.onstart = () => {
        state.isListening = true;
        DOM.composerVoiceBtn?.classList.add('active');
        showToast('Listening for speech...');
      };
      rec.onresult = (e) => {
        const text = e.results[0][0].transcript;
        if (DOM.composerInput) {
          DOM.composerInput.value = (DOM.composerInput.value + ' ' + text).trim();
          DOM.composerInput.dispatchEvent(new Event('input'));
        }
      };
      rec.onend = () => {
        state.isListening = false;
        DOM.composerVoiceBtn?.classList.remove('active');
      };
      rec.onerror = () => {
        state.isListening = false;
        DOM.composerVoiceBtn?.classList.remove('active');
      };
      state.recognition = rec;
      rec.start();
    } catch (e) {
      console.error(e);
    }
  }

  // Model Selection
  function setModel(modelId, modelName) {
    state.activeModel = modelId;
    localStorage.setItem('aura_active_model', modelId);
    if (DOM.activeModelLabel) DOM.activeModelLabel.innerText = modelName;
    document.querySelectorAll('.model-option-row').forEach((row) => {
      row.classList.toggle('active', row.getAttribute('data-model') === modelId);
    });
    showToast(`Model set to ${modelName}`);
  }

  // Filter in Stream
  function filterMessages(query) {
    const rows = document.querySelectorAll('.message-row');
    rows.forEach((row) => {
      if (!query) {
        row.style.display = 'flex';
      } else {
        const match = row.innerText.toLowerCase().includes(query);
        row.style.display = match ? 'flex' : 'none';
      }
    });
  }

  // Export Conversation
  function exportConversation() {
    if (!state.messages.length) {
      showToast('No messages to export');
      return;
    }

    let markdown = `# AURA Editorial Inquiry Archive\nDate: ${new Date().toISOString()}\n\n`;
    state.messages.forEach((m) => {
      markdown += `### ${m.role === 'user' ? 'User' : 'AURA'} (${m.time})\n${m.content}\n\n---\n\n`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AURA_Inquiry_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported to Markdown');
  }

  // Clear Stream
  function clearCurrentStream() {
    if (confirm('Clear current messages?')) {
      state.messages = [];
      if (DOM.messagesStream) DOM.messagesStream.innerHTML = '';
      persistSession();
      showToast('Stream cleared');
    }
  }

  // Session Storage & Sidebar History
  function persistSession(initialPrompt = '') {
    if (!state.currentSessionId) return;

    let session = state.sessions.find((s) => s.id === state.currentSessionId);
    if (!session) {
      session = {
        id: state.currentSessionId,
        title: initialPrompt ? initialPrompt.slice(0, 32) + (initialPrompt.length > 32 ? '...' : '') : 'Editorial Inquiry',
        createdAt: Date.now(),
        messages: state.messages
      };
      state.sessions.unshift(session);
    } else {
      session.messages = state.messages;
    }

    localStorage.setItem('aura_editorial_sessions', JSON.stringify(state.sessions));
    renderSidebarChats();
  }

  function renderSidebarChats(filterQuery = '') {
    if (!DOM.sidebarChatList) return;
    DOM.sidebarChatList.innerHTML = '';

    const query = (filterQuery !== undefined ? filterQuery : (DOM.sidebarSearchInput ? DOM.sidebarSearchInput.value : '')).toLowerCase().trim();
    const filtered = query
      ? state.sessions.filter((s) => (s.title || '').toLowerCase().includes(query))
      : state.sessions;

    if (DOM.sidebarChatCount) {
      DOM.sidebarChatCount.innerText = filtered.length.toString();
    }

    if (filtered.length === 0) {
      DOM.sidebarChatList.innerHTML = `
        <li style="padding: 20px 8px; text-align: center; color: var(--text-subtle); font-size: 11px; font-family: var(--font-mono);">
          ${query ? 'No matching chats' : 'No recorded chats'}
        </li>
      `;
      return;
    }

    filtered.slice(0, 40).forEach((s) => {
      const li = document.createElement('li');
      li.className = `sidebar-chat-item ${s.id === state.currentSessionId ? 'active' : ''}`;
      
      const timeStr = s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent';
      const msgCount = s.messages ? `${s.messages.length} msgs` : '1 inquiry';

      li.innerHTML = `
        <div class="chat-item-text-wrap">
          <span class="chat-item-title">${escapeHtml(s.title || 'Untitled Chat')}</span>
          <span class="chat-item-meta">${timeStr} • ${msgCount}</span>
        </div>
        <button class="chat-item-del-btn" data-id="${s.id}" title="Delete chat">&times;</button>
      `;

      li.addEventListener('click', (e) => {
        if (e.target.classList.contains('chat-item-del-btn') || e.target.closest('.chat-item-del-btn')) {
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

    // Switch to Chat Stage
    state.isHeroActive = false;
    DOM.heroStage?.classList.add('hidden-stage');
    DOM.chatStage?.classList.remove('hidden-stage');

    if (DOM.threadTitle) DOM.threadTitle.innerText = session.title;
    if (DOM.messagesStream) {
      DOM.messagesStream.innerHTML = '';
      state.messages.forEach((msg) => appendMessageElement(msg));
    }

    renderSidebarChats();
  }

  function deleteSession(sessionId) {
    state.sessions = state.sessions.filter((s) => s.id !== sessionId);
    localStorage.setItem('aura_editorial_sessions', JSON.stringify(state.sessions));
    if (state.currentSessionId === sessionId) {
      returnToHero();
    } else {
      renderSidebarChats();
    }
  }

  function clearAllArchives() {
    if (confirm('Clear all archived sessions?')) {
      state.sessions = [];
      localStorage.removeItem('aura_editorial_sessions');
      returnToHero();
      renderSidebarChats();
      showToast('All archives cleared');
    }
  }

  // Popover Positioning
  function positionPopover(popover, trigger) {
    if (!popover || !trigger) return;
    const rect = trigger.getBoundingClientRect();
    popover.style.bottom = `${window.innerHeight - rect.top + 8}px`;
    popover.style.right = `${window.innerWidth - rect.right}px`;
  }

  // Preferences Modal
  function openSettings() {
    if (DOM.settingsModalBackdrop) {
      DOM.settingsModalBackdrop.classList.add('open');
      if (DOM.settingSystemPrompt) DOM.settingSystemPrompt.value = state.systemPrompt;
      if (DOM.settingTemperature) DOM.settingTemperature.value = state.temperature;
      if (DOM.tempValueLabel) DOM.tempValueLabel.innerText = state.temperature;
      if (DOM.settingCustomApiKey) DOM.settingCustomApiKey.value = state.apiKey;
    }
  }

  function closeSettings() {
    DOM.settingsModalBackdrop?.classList.remove('open');
  }

  function saveSettings() {
    if (DOM.settingSystemPrompt) {
      state.systemPrompt = DOM.settingSystemPrompt.value.trim() || state.systemPrompt;
      localStorage.setItem('aura_system_prompt', state.systemPrompt);
    }
    if (DOM.settingTemperature) {
      state.temperature = parseFloat(DOM.settingTemperature.value);
      localStorage.setItem('aura_temperature', state.temperature.toString());
    }
    if (DOM.settingCustomApiKey) {
      state.apiKey = DOM.settingCustomApiKey.value.trim();
      localStorage.setItem('aura_api_key', state.apiKey);
    }
    closeSettings();
    showToast('Studio preferences applied');
  }

  // Theme Switcher (Linen Light vs Obsidian Dark)
  function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('aura_theme_mode', isDark ? 'dark' : 'light');
    showToast(`Theme: ${isDark ? 'Obsidian Dark' : 'Warm Linen Light'}`);
  }

  function applyPreferences() {
    const savedTheme = localStorage.getItem('aura_theme_mode');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
    }
    const savedModel = localStorage.getItem('aura_active_model');
    if (savedModel) {
      state.activeModel = savedModel;
      const matched = document.querySelector(`.model-option-row[data-model="${savedModel}"]`);
      if (matched) {
        const name = matched.getAttribute('data-name');
        if (DOM.activeModelLabel) DOM.activeModelLabel.innerText = name;
        document.querySelectorAll('.model-option-row').forEach((r) => r.classList.remove('active'));
        matched.classList.add('active');
      }
    }
  }

  // Toast System
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

  window.showAuraToast = showToast;

  // Boot on DOM Ready
  document.addEventListener('DOMContentLoaded', init);
})();
