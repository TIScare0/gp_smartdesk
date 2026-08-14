/**
 * AI Chat Website UI — Vanilla JavaScript
 * Inspired by Gemini & Pollinations.ai
 */

(function() {
  'use strict';

  // ==========================================
  // Pre-loaded Realistic Starter Conversations
  // ==========================================
  const SEED_CHATS = [
    {
      id: 'chat-1',
      title: 'Minimalist Color Palette & Typography',
      category: 'Today',
      updatedAt: '10:24 AM',
      messages: [
        {
          id: 'm1',
          role: 'user',
          text: 'Design a minimalist modern landing page color palette with hex codes and typography pairing.',
          time: '10:24 AM'
        },
        {
          id: 'm2',
          role: 'assistant',
          time: '10:24 AM',
          text: `Here is a curated, high-contrast minimalist aesthetic designed for creative tech products:\n\n### 🎨 Color Palette\n* **Canvas Snow**: \`#F8FAFC\` (Background surface with 2% cool saturation)\n* **Deep Slate**: \`#0F172A\` (Primary text and high-contrast headlines)\n* **Mist Gray**: \`#E2E8F0\` (Delicate 1px geometric borders)\n* **Electric Spark**: \`#3A86FF\` (Interactive buttons and focal links)\n* **Coral Pop**: \`#F72585\` (Subtle notification and creative accent)\n\n### 🖋️ Typographic Pairings\n* **Headings**: *Plus Jakarta Sans* (Weight 700, -0.03em tracking for punchy, modern headlines)\n* **Body**: *Inter* or *System Sans* (Weight 400, line-height 1.65)\n* **Code & Metrics**: *JetBrains Mono* (Weight 500)\n\n\`\`\`css\n:root {\n  --bg-canvas: #F8FAFC;\n  --text-primary: #0F172A;\n  --accent-spark: #3A86FF;\n  --radius-card: 16px;\n}\n\`\`\`\n\nWould you like me to generate a responsive CSS card layout with these variables?`
        }
      ]
    },
    {
      id: 'chat-2',
      title: 'Python Async/Await Event Loop',
      category: 'Today',
      updatedAt: '8:45 AM',
      messages: [
        {
          id: 'm3',
          role: 'user',
          text: 'Explain how Python asynchronous async/await event loops work under the hood with a clean example.',
          time: '8:45 AM'
        },
        {
          id: 'm4',
          role: 'assistant',
          time: '8:45 AM',
          text: `In Python, **asyncio** uses a single-threaded cooperative multitasking model built around an **Event Loop**.\n\n### How It Works\n1. **Coroutines**: Functions defined with \`async def\`. When called, they return a coroutine object instead of executing immediately.\n2. **The Event Loop**: A central scheduler that monitors I/O socket readiness (via \`epoll\` or \`kqueue\`) and resumes paused tasks.\n3. **Yielding Control**: When a task encounters \`await\`, it yields control back to the event loop while waiting for external I/O.\n\n\`\`\`python\nimport asyncio\nimport time\n\nasync def fetch_dataset(source_id: int):\n    print(f"[*] Starting query for source {source_id}...")\n    await asyncio.sleep(1.5)  # Non-blocking simulated I/O\n    print(f"[✓] Received payload from source {source_id}")\n    return {"source": source_id, "status": "success"}\n\nasync def main():\n    # Run multiple coroutines concurrently\n    tasks = [fetch_dataset(i) for i in range(1, 4)]\n    results = await asyncio.gather(*tasks)\n    print(f"All batches gathered: {len(results)} items")\n\nasyncio.run(main())\n\`\`\`\n\nNotice that while \`asyncio.sleep\` is waiting, other tasks progress concurrently without blocking the main OS thread.`
        }
      ]
    },
    {
      id: 'chat-3',
      title: 'Eco Coffee Roastery Branding',
      category: 'Yesterday',
      updatedAt: 'Yesterday',
      messages: [
        {
          id: 'm5',
          role: 'user',
          text: 'Brainstorm 5 catchy, creative brand names for an eco-friendly specialty coffee roastery.',
          time: 'Yesterday'
        },
        {
          id: 'm6',
          role: 'assistant',
          time: 'Yesterday',
          text: `Here are 5 distinct branding concepts tailored for a sustainable, high-craft coffee roastery:\n\n1. **Verdant Roast Co.** — Evokes organic lush canopies, shade-grown beans, and farm-direct ethics.\n2. **Solar Bean Lab** — Highlights clean energy roasting (zero-emission radiant roast profiles).\n3. **Canopy & Origin** — Focuses on biodiversity preservation and traceable single-origin micro-lots.\n4. **Pulse & Petal Coffee** — A slightly playful, artisan aesthetic popular in modern Nordic cafes.\n5. **Terraform Roasters** — Forward-thinking, compostable packaging with regenerative agriculture backing.`
        }
      ]
    },
    {
      id: 'chat-4',
      title: 'Vector Search vs Keyword Retrieval',
      category: 'Previous 7 Days',
      updatedAt: '3 days ago',
      messages: [
        {
          id: 'm7',
          role: 'user',
          text: 'Write a concise executive summary comparing vector embeddings vs keyword search in information retrieval.',
          time: '3 days ago'
        },
        {
          id: 'm8',
          role: 'assistant',
          time: '3 days ago',
          text: `### Executive Summary: Hybrid Search Architecture\n\n* **Keyword Search (BM25 / TF-IDF)**: Matches exact tokens and rare terms (product SKUs, error codes, specific names). Extremely fast and precise, but fails on synonyms or semantic phrasing.\n* **Vector Embeddings (Dense Retrieval)**: Maps text meaning into high-dimensional geometric spaces. Excels at conversational queries, intent understanding, and multilingual concepts.\n* **Modern Standard**: Production systems combine both using **Reciprocal Rank Fusion (RRF)** for optimal recall and precision.`
        }
      ]
    }
  ];

  // ==========================================
  // Application State
  // ==========================================
  let chats = [];
  let currentChatId = null;
  let activeTool = null;
  let isGenerating = false;
  let isSidebarExpanded = false;
  let streamSpeed = 'natural'; // 'fast', 'natural', 'instant'
  let currentModel = 'balanced'; // 'creative', 'balanced', 'precise'

  // ==========================================
  // DOM Elements
  // ==========================================
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const logoToggleBtn = document.getElementById('logoToggleBtn');
  const sidebarCollapseBtn = document.getElementById('sidebarCollapseBtn');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const newChatBtn = document.getElementById('newChatBtn');
  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  const chatHistoryContainer = document.getElementById('chatHistoryContainer');
  const activeChatTitle = document.getElementById('activeChatTitle');
  const clearChatBtn = document.getElementById('clearChatBtn');
  const emptyState = document.getElementById('emptyState');
  const messagesList = document.getElementById('messagesList');
  const chatMessagesContainer = document.getElementById('chatMessagesContainer');
  const scrollAnchor = document.getElementById('scrollAnchor');

  // Composer Elements
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const plusAttachmentBtn = document.getElementById('plusAttachmentBtn');
  const toolsBtn = document.getElementById('toolsBtn');
  const toolsPopupOverlay = document.getElementById('toolsPopupOverlay');
  const activeToolPill = document.getElementById('activeToolPill');
  const toolPillIcon = document.getElementById('toolPillIcon');
  const toolPillName = document.getElementById('toolPillName');
  const removeToolBtn = document.getElementById('removeToolBtn');
  const starterPromptsGrid = document.getElementById('starterPromptsGrid');
  const hiddenFileInput = document.getElementById('hiddenFileInput');

  // Settings Elements
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
  const modelPersonaSelect = document.getElementById('modelPersonaSelect');
  const streamSpeedSelect = document.getElementById('streamSpeedSelect');
  const themeDotBtns = document.querySelectorAll('.theme-dot-btn');
  const exportMdBtn = document.getElementById('exportMdBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const resetHistoryBtn = document.getElementById('resetHistoryBtn');
  const toastContainer = document.getElementById('toastContainer');

  // ==========================================
  // Initialization
  // ==========================================
  function init() {
    loadChatsFromStorage();
    setupEventListeners();
    renderChatHistory();

    // If we have chats, select the first one; else start new
    if (chats.length > 0) {
      selectChat(chats[0].id);
    } else {
      startNewChat();
    }
  }

  // Load chats from LocalStorage or seed data
  function loadChatsFromStorage() {
    try {
      const saved = localStorage.getItem('ai_chat_conversations');
      if (saved) {
        chats = JSON.parse(saved);
      } else {
        chats = JSON.parse(JSON.stringify(SEED_CHATS));
        saveChatsToStorage();
      }
    } catch (e) {
      chats = JSON.parse(JSON.stringify(SEED_CHATS));
    }
  }

  function saveChatsToStorage() {
    try {
      localStorage.setItem('ai_chat_conversations', JSON.stringify(chats));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  // ==========================================
  // Event Listeners
  // ==========================================
  function setupEventListeners() {
    // Sidebar Expand / Collapse
    logoToggleBtn.addEventListener('click', () => toggleSidebar());
    sidebarCollapseBtn.addEventListener('click', () => toggleSidebar(false));
    mobileMenuBtn.addEventListener('click', () => toggleSidebar(true));
    sidebarBackdrop.addEventListener('click', () => toggleSidebar(false));

    // Keyboard shortcut: Cmd/Ctrl + K for New Chat
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        startNewChat();
      }
      if (e.key === 'Escape') {
        closeToolsPopup();
        closeSettingsModal();
      }
    });

    // New Chat button
    newChatBtn.addEventListener('click', () => {
      startNewChat();
      if (window.innerWidth <= 768) toggleSidebar(false);
    });

    // Search History
    searchInput.addEventListener('input', handleSearchHistory);
    searchClearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchClearBtn.hidden = true;
      renderChatHistory();
      searchInput.focus();
    });

    // Clear messages in current chat
    clearChatBtn.addEventListener('click', handleClearCurrentChat);

    // Composer Input & Send
    chatInput.addEventListener('input', handleInputChange);
    chatInput.addEventListener('keydown', handleInputKeyDown);
    sendBtn.addEventListener('click', handleSendMessage);

    // Starter Prompt Chips
    starterPromptsGrid.addEventListener('click', (e) => {
      const chip = e.target.closest('.prompt-chip');
      if (!chip) return;
      const prompt = chip.dataset.prompt;
      if (prompt) {
        chatInput.value = prompt;
        handleInputChange();
        handleSendMessage();
      }
    });

    // Tools Button & Popover
    toolsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleToolsPopup();
    });

    // Tool Items Click
    toolsPopupOverlay.addEventListener('click', (e) => {
      const toolBtn = e.target.closest('.tool-item-btn');
      if (!toolBtn) return;
      const toolKey = toolBtn.dataset.tool;
      const toolName = toolBtn.dataset.name;
      const toolIcon = toolBtn.dataset.icon;
      selectTool(toolKey, toolName, toolIcon);
    });

    // Click outside to close tools popup
    document.addEventListener('click', (e) => {
      if (!toolsPopupOverlay.hidden && !toolsPopupOverlay.contains(e.target) && !toolsBtn.contains(e.target)) {
        closeToolsPopup();
      }
    });

    // Remove active tool pill
    removeToolBtn.addEventListener('click', () => {
      activeTool = null;
      activeToolPill.hidden = true;
      showToast('Tool filter removed', 'ℹ️');
    });

    // Attachment file simulation
    plusAttachmentBtn.addEventListener('click', () => {
      hiddenFileInput.click();
    });

    hiddenFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        showToast(`Attached file: ${file.name} (${Math.round(file.size / 1024)} KB)`, '📎');
        chatInput.value = `[Analyzing attached file: ${file.name}] Please review the contents.`;
        handleInputChange();
        chatInput.focus();
      }
    });

    // Settings Modal
    settingsBtn.addEventListener('click', openSettingsModal);
    closeSettingsModalBtn.addEventListener('click', closeSettingsModal);
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) closeSettingsModal();
    });

    // Settings options
    modelPersonaSelect.addEventListener('change', (e) => {
      currentModel = e.target.value;
      showToast(`Model persona updated to ${e.target.options[e.target.selectedIndex].text.split('(')[0]}`, '🤖');
    });

    streamSpeedSelect.addEventListener('change', (e) => {
      streamSpeed = e.target.value;
      showToast(`Typing speed set to ${e.target.value}`, '⚡');
    });

    // Theme pickers
    themeDotBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        themeDotBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const theme = btn.dataset.theme;
        document.body.dataset.theme = theme;
        showToast(`Theme switched to ${btn.title}`, '🎨');
      });
    });

    // Export buttons
    exportMdBtn.addEventListener('click', exportConversationMarkdown);
    exportJsonBtn.addEventListener('click', exportConversationJson);
    resetHistoryBtn.addEventListener('click', resetAllHistory);
  }

  // ==========================================
  // Sidebar Management
  // ==========================================
  function toggleSidebar(forceState) {
    if (typeof forceState === 'boolean') {
      isSidebarExpanded = forceState;
    } else {
      isSidebarExpanded = !isSidebarExpanded;
    }

    if (isSidebarExpanded) {
      sidebar.classList.remove('collapsed');
      sidebar.classList.add('expanded');
      logoToggleBtn.setAttribute('aria-expanded', 'true');
      sidebarBackdrop.classList.add('active');
    } else {
      sidebar.classList.remove('expanded');
      sidebar.classList.add('collapsed');
      logoToggleBtn.setAttribute('aria-expanded', 'false');
      sidebarBackdrop.classList.remove('active');
    }
  }

  // ==========================================
  // Chat History Management
  // ==========================================
  function renderChatHistory(filterQuery = '') {
    chatHistoryContainer.innerHTML = '';

    let filtered = chats;
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      filtered = chats.filter(c => 
        c.title.toLowerCase().includes(q) ||
        c.messages.some(m => m.text.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'no-history-state';
      emptyMsg.textContent = filterQuery ? 'No matching conversations' : 'No chats yet';
      chatHistoryContainer.appendChild(emptyMsg);
      return;
    }

    // Group chats by category
    const categories = ['Today', 'Yesterday', 'Previous 7 Days', 'Older'];
    const groups = {};

    filtered.forEach(chat => {
      const cat = chat.category || 'Today';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(chat);
    });

    categories.forEach(cat => {
      if (groups[cat] && groups[cat].length > 0) {
        const header = document.createElement('div');
        header.className = 'history-group-header';
        header.textContent = cat;
        chatHistoryContainer.appendChild(header);

        const list = document.createElement('ul');
        list.className = 'history-group-list';

        groups[cat].forEach(chat => {
          const li = document.createElement('li');
          const itemBtn = document.createElement('button');
          itemBtn.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
          itemBtn.setAttribute('data-id', chat.id);

          itemBtn.innerHTML = `
            <div class="history-item-left">
              <svg class="history-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span class="history-title" title="${escapeHtml(chat.title)}">${escapeHtml(chat.title)}</span>
            </div>
            <button class="history-delete-btn" title="Delete chat" aria-label="Delete chat">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
              </svg>
            </button>
          `;

          // Select Chat click
          itemBtn.addEventListener('click', (e) => {
            if (e.target.closest('.history-delete-btn')) {
              e.stopPropagation();
              deleteChat(chat.id);
              return;
            }
            selectChat(chat.id);
            if (window.innerWidth <= 768) toggleSidebar(false);
          });

          li.appendChild(itemBtn);
          list.appendChild(li);
        });

        chatHistoryContainer.appendChild(list);
      }
    });
  }

  function handleSearchHistory(e) {
    const val = e.target.value;
    searchClearBtn.hidden = !val;
    renderChatHistory(val);
  }

  function selectChat(chatId) {
    currentChatId = chatId;
    const currentChat = chats.find(c => c.id === chatId);
    if (!currentChat) return;

    activeChatTitle.textContent = currentChat.title || 'Conversation';
    renderMessages(currentChat.messages);
    renderChatHistory(searchInput.value);
    scrollToBottom();
  }

  function startNewChat() {
    const newId = 'chat-' + Date.now();
    const newChatObj = {
      id: newId,
      title: 'New Chat',
      category: 'Today',
      updatedAt: 'Just now',
      messages: []
    };

    chats.unshift(newChatObj);
    currentChatId = newId;
    saveChatsToStorage();

    activeChatTitle.textContent = 'New Chat';
    renderMessages([]);
    renderChatHistory();
    chatInput.value = '';
    handleInputChange();
    chatInput.focus();
  }

  function deleteChat(chatId) {
    chats = chats.filter(c => c.id !== chatId);
    saveChatsToStorage();
    showToast('Conversation deleted', '🗑️');

    if (currentChatId === chatId) {
      if (chats.length > 0) {
        selectChat(chats[0].id);
      } else {
        startNewChat();
      }
    } else {
      renderChatHistory(searchInput.value);
    }
  }

  function handleClearCurrentChat() {
    const currentChat = chats.find(c => c.id === currentChatId);
    if (!currentChat) return;

    if (currentChat.messages.length === 0) {
      showToast('Conversation is already empty', 'ℹ️');
      return;
    }

    currentChat.messages = [];
    currentChat.title = 'New Chat';
    saveChatsToStorage();
    activeChatTitle.textContent = 'New Chat';
    renderMessages([]);
    renderChatHistory();
    showToast('Cleared conversation messages', '🧹');
  }

  // ==========================================
  // Render Messages in Central Area
  // ==========================================
  function renderMessages(messages) {
    if (!messages || messages.length === 0) {
      emptyState.classList.remove('hidden');
      messagesList.innerHTML = '';
      return;
    }

    emptyState.classList.add('hidden');
    messagesList.innerHTML = '';

    messages.forEach(msg => {
      appendMessageDOM(msg, false);
    });
  }

  function appendMessageDOM(msg, animate = true) {
    const row = document.createElement('div');
    row.className = `message-row ${msg.role}`;
    row.id = `msg-${msg.id || Date.now()}`;

    if (msg.role === 'user') {
      row.innerHTML = `
        <div class="message-bubble">
          ${escapeHtml(msg.text).replace(/\n/g, '<br>')}
        </div>
      `;
    } else {
      const parsedHtml = formatMarkdown(msg.text);
      row.innerHTML = `
        <div class="ai-avatar" aria-hidden="true">
          <svg viewBox="0 0 28 28" fill="none">
            <path d="M14 2C14 8.62742 19.3726 14 26 14C19.3726 14 14 19.3726 14 26C14 19.3726 8.62742 14 2 14C8.62742 14 14 8.62742 14 2Z" fill="url(#spark_avatar_grad)" />
            <defs>
              <linearGradient id="spark_avatar_grad" x1="2" y1="2" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                <stop stop-color="#4361EE" />
                <stop offset="1" stop-color="#F72585" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div class="ai-content-wrapper">
          <div class="message-bubble">${parsedHtml}</div>
          <div class="ai-actions-toolbar">
            <button class="ai-action-btn copy-msg-btn" title="Copy message text">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <button class="ai-action-btn thumbs-up-btn" title="Good response">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
              </svg>
            </button>
            <button class="ai-action-btn thumbs-down-btn" title="Needs improvement">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
              </svg>
            </button>
          </div>
        </div>
      `;

      // Copy message button
      const copyBtn = row.querySelector('.copy-msg-btn');
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(msg.text).then(() => {
          showToast('Message copied to clipboard', '📋');
        });
      });

      // Thumbs feedback buttons
      const upBtn = row.querySelector('.thumbs-up-btn');
      const downBtn = row.querySelector('.thumbs-down-btn');
      upBtn.addEventListener('click', () => {
        upBtn.classList.toggle('active');
        downBtn.classList.remove('active');
        showToast('Thanks for the positive feedback!', '✨');
      });
      downBtn.addEventListener('click', () => {
        downBtn.classList.toggle('active');
        upBtn.classList.remove('active');
        showToast('Feedback noted to refine responses.', '📝');
      });

      // Bind code block copy buttons inside this message
      row.querySelectorAll('.copy-code-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const codeSnippet = btn.closest('.code-block-container').querySelector('code').innerText;
          navigator.clipboard.writeText(codeSnippet).then(() => {
            btn.innerHTML = `✓ Copied!`;
            setTimeout(() => {
              btn.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy`;
            }, 2000);
          });
        });
      });
    }

    messagesList.appendChild(row);
    scrollToBottom();
  }

  // ==========================================
  // Composer & Message Dispatch
  // ==========================================
  function handleInputChange() {
    // Auto expand textarea
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 180) + 'px';

    const hasText = chatInput.value.trim().length > 0;
    sendBtn.disabled = !hasText || isGenerating;
  }

  function handleInputKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) {
        handleSendMessage();
      }
    }
  }

  function handleSendMessage() {
    const text = chatInput.value.trim();
    if (!text || isGenerating) return;

    // Reset textarea
    chatInput.value = '';
    handleInputChange();
    emptyState.classList.add('hidden');

    let currentChat = chats.find(c => c.id === currentChatId);
    if (!currentChat) {
      startNewChat();
      currentChat = chats.find(c => c.id === currentChatId);
    }

    // Auto title if first message
    if (currentChat.messages.length === 0) {
      currentChat.title = generateTitleFromPrompt(text);
      activeChatTitle.textContent = currentChat.title;
    }

    // Append User Message
    const userMsg = {
      id: 'u-' + Date.now(),
      role: 'user',
      text: text,
      time: getCurrentTime()
    };
    currentChat.messages.push(userMsg);
    appendMessageDOM(userMsg);
    saveChatsToStorage();
    renderChatHistory();

    // Trigger AI Assistant Response with simulated streaming
    triggerAIResponse(text, currentChat);
  }

  function triggerAIResponse(userPrompt, currentChat) {
    isGenerating = true;
    sendBtn.disabled = true;

    // Create placeholder AI message row for streaming
    const aiMsgId = 'a-' + Date.now();
    const row = document.createElement('div');
    row.className = 'message-row assistant';
    row.id = `msg-${aiMsgId}`;

    row.innerHTML = `
      <div class="ai-avatar" aria-hidden="true">
        <svg viewBox="0 0 28 28" fill="none">
          <path d="M14 2C14 8.62742 19.3726 14 26 14C19.3726 14 14 19.3726 14 26C14 19.3726 8.62742 14 2 14C8.62742 14 14 8.62742 14 2Z" fill="url(#spark_avatar_grad)" />
        </svg>
      </div>
      <div class="ai-content-wrapper">
        <div class="message-bubble">
          <div class="typing-dots">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
          </div>
        </div>
      </div>
    `;

    messagesList.appendChild(row);
    scrollToBottom();

    const fullResponse = generateSmartResponse(userPrompt, activeTool, currentModel);

    // Speed configuration
    let delay = 35;
    if (streamSpeed === 'fast') delay = 15;
    if (streamSpeed === 'instant') delay = 0;

    setTimeout(() => {
      const bubble = row.querySelector('.message-bubble');
      bubble.innerHTML = ''; // remove dots

      if (delay === 0) {
        // Instant mode
        bubble.innerHTML = formatMarkdown(fullResponse);
        finalizeAIMessage(currentChat, fullResponse, row);
      } else {
        // Stream token chunks
        let currentLen = 0;
        const totalLen = fullResponse.length;
        const chunkSize = streamSpeed === 'fast' ? 4 : 2;

        const streamInterval = setInterval(() => {
          currentLen += chunkSize;
          if (currentLen >= totalLen) {
            currentLen = totalLen;
            clearInterval(streamInterval);
            bubble.innerHTML = formatMarkdown(fullResponse);
            finalizeAIMessage(currentChat, fullResponse, row);
          } else {
            const partialText = fullResponse.slice(0, currentLen);
            bubble.innerHTML = formatMarkdown(partialText) + '<span class="typing-cursor"></span>';
            scrollToBottom();
          }
        }, delay);
      }
    }, 400);
  }

  function finalizeAIMessage(currentChat, fullResponse, row) {
    isGenerating = false;
    handleInputChange();

    // Add action toolbar
    const contentWrapper = row.querySelector('.ai-content-wrapper');
    const toolbar = document.createElement('div');
    toolbar.className = 'ai-actions-toolbar';
    toolbar.innerHTML = `
      <button class="ai-action-btn copy-msg-btn" title="Copy message text">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
      <button class="ai-action-btn thumbs-up-btn" title="Good response">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
        </svg>
      </button>
      <button class="ai-action-btn thumbs-down-btn" title="Needs improvement">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
        </svg>
      </button>
    `;

    contentWrapper.appendChild(toolbar);

    // Bind toolbar events
    toolbar.querySelector('.copy-msg-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(fullResponse).then(() => {
        showToast('Message copied to clipboard', '📋');
      });
    });

    toolbar.querySelector('.thumbs-up-btn').addEventListener('click', (e) => {
      e.currentTarget.classList.toggle('active');
      toolbar.querySelector('.thumbs-down-btn').classList.remove('active');
      showToast('Thanks for the positive feedback!', '✨');
    });

    toolbar.querySelector('.thumbs-down-btn').addEventListener('click', (e) => {
      e.currentTarget.classList.toggle('active');
      toolbar.querySelector('.thumbs-up-btn').classList.remove('active');
      showToast('Feedback recorded.', '📝');
    });

    // Bind code copy buttons
    row.querySelectorAll('.copy-code-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const codeSnippet = btn.closest('.code-block-container').querySelector('code').innerText;
        navigator.clipboard.writeText(codeSnippet).then(() => {
          btn.innerHTML = `✓ Copied!`;
          setTimeout(() => {
            btn.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy`;
          }, 2000);
        });
      });
    });

    // Save to chat state
    const aiMsg = {
      id: 'a-' + Date.now(),
      role: 'assistant',
      text: fullResponse,
      time: getCurrentTime()
    };
    currentChat.messages.push(aiMsg);
    saveChatsToStorage();
    scrollToBottom();
  }

  // ==========================================
  // Simulated Intelligent AI Responses
  // ==========================================
  function generateSmartResponse(prompt, tool, model) {
    const p = prompt.toLowerCase();

    // Check if tools were explicitly used
    if (tool === 'pdf') {
      return `📄 **PDF Document Inspector**\n\nI have parsed your document structure. Here is a high-level briefing:\n\n* **Primary Subject**: Strategic System Overview\n* **Key Findings**: 3 optimization bottlenecks identified in data indexing.\n* **Actionable Next Steps**: Adopt distributed cache clustering with warm-up replication.\n\nWould you like a detailed section-by-section breakdown?`;
    }

    if (tool === 'images') {
      return `🎨 **Visual Prompt Synthesis (Pollinations-Style)**\n\nGenerated concept prompt:\n> *"Minimalist architectural courtyard, serene reflecting pool, warm travertine stone, soft dusk cinematic lighting, ultra-clean composition."*\n\n\`\`\`text\nPrompt ID: #GEN-${Math.floor(1000 + Math.random() * 9000)}\nStyle: Architectural Minimalist\nAspect Ratio: 16:9\nSampling: DPM++ 2M Karras (30 steps)\n\`\`\`\n\nFeel free to adjust lighting or geometry modifiers!`;
    }

    if (tool === 'code') {
      return `💻 **Code Interpreter & Sandbox Execution**\n\nExecution simulated in isolated runtime:\n\n\`\`\`typescript\ninterface TaskResult<T> {\n  status: 'resolved' | 'rejected';\n  value?: T;\n  latencyMs: number;\n}\n\nasync function benchmarkPipeline<T>(task: () => Promise<T>): Promise<TaskResult<T>> {\n  const start = performance.now();\n  try {\n    const res = await task();\n    return { status: 'resolved', value: res, latencyMs: performance.now() - start };\n  } catch (err) {\n    return { status: 'rejected', latencyMs: performance.now() - start };\n  }\n}\n\`\`\`\n\nOutput: \`Execution completed in 4.2ms with 0 memory leaks.\``;
    }

    if (tool === 'analyze') {
      return `📊 **Deep Data Analysis & Insights**\n\n* **Distribution**: Normal curve with positive skew (+0.42)\n* **Signal-to-Noise Ratio**: High confidence across 98.4% of samples\n* **Correlation Metric**: Strong alignment between user velocity and retention index\n\nRecommendation: Focus feature allocation on high-frequency interaction loops.`;
    }

    // Keyword heuristics for realistic intelligent replies
    if (p.includes('react') || p.includes('javascript') || p.includes('typescript') || p.includes('code') || p.includes('html') || p.includes('css')) {
      return `Here is a modern, modular implementation tailored for clean web architecture:\n\n\`\`\`javascript\n// Pure functional state container\nfunction createObservableStore(initialState) {\n  let state = initialState;\n  const listeners = new Set();\n\n  return {\n    getState: () => state,\n    setState: (updater) => {\n      state = typeof updater === 'function' ? updater(state) : updater;\n      listeners.forEach(fn => fn(state));\n    },\n    subscribe: (fn) => {\n      listeners.add(fn);\n      return () => listeners.delete(fn);\n    }\n  };\n}\n\`\`\`\n\n### Key Advantages\n* Zero external bundle dependencies\n* Predictable unidirectional data stream\n* Seamless integration with any UI framework or vanilla DOM.`;
    }

    if (p.includes('color') || p.includes('palette') || p.includes('design') || p.includes('ui') || p.includes('layout')) {
      return `### ✨ Creative Visual Direction\n\n* **Base Canvas**: \`#F8FAFC\` (Crisp off-white neutral)\n* **Contrast Ink**: \`#0F172A\` (95% optical black)\n* **Accent Cyan**: \`#0EA5E9\` (Fresh creative spark)\n* **Accent Violet**: \`#8B5CF6\` (Modern ambient depth)\n\n**Design Principles Applied:**\n1. Generous negative space between major semantic cards\n2. 12–16px subtle border radiuses with soft multi-layer ambient drop-shadows\n3. High WCAG AA contrast compliance across all body text.`;
    }

    if (p.includes('hello') || p.includes('hi') || p.includes('hey')) {
      return `Hello there! I'm your AI creative assistant. I can assist you with:\n\n* 💡 **Ideation & Brainstorming** creative concepts\n* 💻 **Code Architecture & Debugging** across full-stack languages\n* 🎨 **Visual & Design Systems** design and typography\n* 📄 **Analytical Synthesis** and research summaries\n\nWhat would you like to explore together?`;
    }

    // Default creative response
    return `### Perspective & Recommendations\n\nRegarding **"${escapeHtml(prompt.length > 50 ? prompt.slice(0, 50) + '...' : prompt)}"**:\n\n1. **Core Concept**: Focusing on clear intent and structural simplicity produces the highest reliability.\n2. **Execution Strategy**: Break down requirements into iterative milestones, validating each component before adding secondary complexity.\n3. **Practical Application**: Maintain clean interfaces, clear contracts, and responsive feedback states for maximum usability.\n\nWould you like to delve deeper into any specific aspect?`;
  }

  // ==========================================
  // Tools Popup Actions
  // ==========================================
  function toggleToolsPopup() {
    if (toolsPopupOverlay.hidden) {
      toolsPopupOverlay.hidden = false;
      toolsBtn.classList.add('active');
    } else {
      closeToolsPopup();
    }
  }

  function closeToolsPopup() {
    toolsPopupOverlay.hidden = true;
    toolsBtn.classList.remove('active');
  }

  function selectTool(key, name, icon) {
    activeTool = key;
    closeToolsPopup();

    // Update active tool pill
    toolPillIcon.textContent = icon;
    toolPillName.textContent = name;
    activeToolPill.hidden = false;

    showToast(`Enabled tool: ${name} (Preview)`, icon);
    chatInput.placeholder = `Ask using ${name}...`;
    chatInput.focus();
  }

  // ==========================================
  // Settings Modal & Exports
  // ==========================================
  function openSettingsModal() {
    settingsModal.hidden = false;
  }

  function closeSettingsModal() {
    settingsModal.hidden = true;
  }

  function exportConversationMarkdown() {
    const currentChat = chats.find(c => c.id === currentChatId);
    if (!currentChat || currentChat.messages.length === 0) {
      showToast('No messages to export', '⚠️');
      return;
    }

    let md = `# ${currentChat.title}\n*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;
    currentChat.messages.forEach(m => {
      const author = m.role === 'user' ? '🧑 **User**' : '🤖 **AI Assistant**';
      md += `### ${author} (${m.time || ''})\n\n${m.text}\n\n---\n\n`;
    });

    downloadFile(md, `${sanitizeFilename(currentChat.title)}.md`, 'text/markdown');
    showToast('Exported conversation as Markdown', '📥');
  }

  function exportConversationJson() {
    const currentChat = chats.find(c => c.id === currentChatId);
    if (!currentChat) {
      showToast('No chat to export', '⚠️');
      return;
    }

    const data = JSON.stringify(currentChat, null, 2);
    downloadFile(data, `${sanitizeFilename(currentChat.title)}.json`, 'application/json');
    showToast('Exported conversation as JSON', '📥');
  }

  function resetAllHistory() {
    if (confirm('Are you sure you want to reset all stored conversations and restore defaults?')) {
      localStorage.removeItem('ai_chat_conversations');
      loadChatsFromStorage();
      renderChatHistory();
      if (chats.length > 0) selectChat(chats[0].id);
      closeSettingsModal();
      showToast('All chat history restored to default samples', '🔄');
    }
  }

  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ==========================================
  // Toast Notifications
  // ==========================================
  function showToast(message, icon = '✨') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }, 2800);
  }

  // ==========================================
  // Utility & Formatting Helpers
  // ==========================================
  function scrollToBottom() {
    setTimeout(() => {
      chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }, 10);
  }

  function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function generateTitleFromPrompt(prompt) {
    const cleaned = prompt.replace(/[^\w\s]/gi, '').trim();
    const words = cleaned.split(/\s+/).slice(0, 5).join(' ');
    if (!words) return 'Conversation';
    return words.charAt(0).toUpperCase() + words.slice(1);
  }

  function sanitizeFilename(name) {
    return (name || 'chat').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Simple, fast Markdown-like formatter (Headings, Code blocks, Lists, Bold, Inline code)
  function formatMarkdown(raw) {
    if (!raw) return '';

    // Extract code blocks first to preserve exact code
    const codeBlocks = [];
    let text = raw.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, function(match, lang, code) {
      const idx = codeBlocks.length;
      const cleanLang = lang || 'code';
      codeBlocks.push({ lang: cleanLang, code: code.trim() });
      return `___CODE_BLOCK_${idx}___`;
    });

    // Escape remaining HTML
    text = escapeHtml(text);

    // Headings
    text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^# (.*$)/gim, '<h3>$1</h3>');

    // Bold & Italics
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // Blockquotes
    text = text.replace(/^> (.*$)/gim, '<blockquote style="border-left: 3px solid var(--accent-primary); padding-left: 12px; margin: 8px 0; color: var(--text-muted);">$1</blockquote>');

    // Unordered Lists
    text = text.replace(/^\* (.*$)/gim, '<li>$1</li>');
    text = text.replace(/^- (.*$)/gim, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');

    // Paragraphs
    const paragraphs = text.split(/\n\n+/);
    text = paragraphs.map(p => {
      p = p.trim();
      if (!p) return '';
      if (p.startsWith('<h') || p.startsWith('<ul>') || p.startsWith('<blockquote>') || p.startsWith('___CODE_BLOCK_')) {
        return p;
      }
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    // Restore Code Blocks with custom header and copy button
    text = text.replace(/___CODE_BLOCK_(\d+)___/g, function(match, id) {
      const block = codeBlocks[Number(id)];
      if (!block) return '';
      return `
        <div class="code-block-container">
          <div class="code-header">
            <span>${escapeHtml(block.lang)}</span>
            <button class="copy-code-btn" title="Copy code snippet">
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Copy
            </button>
          </div>
          <pre><code>${escapeHtml(block.code)}</code></pre>
        </div>
      `;
    });

    return text;
  }

  // Kickstart on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
