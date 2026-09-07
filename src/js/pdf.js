/* ==========================================================================
   PDF TOOLS — AURA
   --------------------------------------------------------------------------
   Backend contract assumed on window.web_api (exposed via pywebview, see
   webview.js). Wire these up on the Python side against the `Pdf` class:

     await api.pdf_stage(filePaths)
         -> { id, files: [{name, size, pages, locked}] }
         Loads one or more PDFs and returns a staging id plus per-file info.
         `locked` is true if a file needs a password before it can be read.

     await api.pdf_unlock(stageId, fileName, password)
         -> { ok: bool, error?: string }
         Attempts to decrypt a locked file within the staged set.

     await api.pdf_run(stageId, tool, options)
         -> { ok: bool, output_path, output_name, output_size,
              text?, error? }
         Runs one of: "merge" | "remove_pages" | "rearrange" | "compress"
                     | "extract_text" | "unlock_save"
         `options` shape depends on tool (see TOOLS below).

     await api.pdf_export(outputPath, suggestedName)
         -> { ok: bool, saved_path?: string }
         Opens a save dialog / copies the finished file somewhere the user
         picks, for the Download button.

   Every call is wrapped in try/catch; failures surface as a toast rather
   than breaking the flow.
   ========================================================================== */

(function () {
  "use strict";

  const TOOLS = [
    {
      id: "merge",
      title: "Merge",
      desc: "Combine two or more PDFs into one document, in order.",
      minFiles: 2,
      icon: iconMerge,
      buildOptions: () => ({}),
      runBtnLabel: "Merge PDFs",
      resultHeading: "Documents merged",
      outputExt: "pdf",
    },
    {
      id: "remove_pages",
      title: "Remove pages",
      desc: "Pick the pages you don't need and drop them from the file.",
      minFiles: 1,
      maxFiles: 1,
      icon: iconRemove,
      needsPageList: true,
      buildOptions: (state) => ({
        pages: state.excludedPages || [],
      }),
      runBtnLabel: "Remove pages",
      resultHeading: "Pages removed",
      outputExt: "pdf",
    },
    {
      id: "rearrange",
      title: "Reorder pages",
      desc: "Change the page order by dragging pages into place.",
      minFiles: 1,
      maxFiles: 1,
      icon: iconReorder,
      needsPageOrder: true,
      buildOptions: (state) => ({
        order: state.pageOrder || [],
      }),
      runBtnLabel: "Save new order",
      resultHeading: "Pages reordered",
      outputExt: "pdf",
    },
    {
      id: "compress",
      title: "Compress",
      desc: "Shrink the file size while keeping every page intact.",
      minFiles: 1,
      maxFiles: 1,
      icon: iconCompress,
      buildOptions: () => ({}),
      runBtnLabel: "Compress PDF",
      resultHeading: "Document compressed",
      outputExt: "pdf",
    },
    {
      id: "extract_text",
      title: "Extract text",
      desc: "Pull out every word of readable text from the document.",
      minFiles: 1,
      maxFiles: 1,
      icon: iconExtract,
      buildOptions: () => ({}),
      runBtnLabel: "Extract text",
      resultHeading: "Text extracted",
      outputExt: "txt",
      isTextResult: true,
    },
  ];

  // ---- State ---------------------------------------------------------
  const state = {
    stageId: null,
    files: [], // [{name, size, pages, locked}]
    tool: null,
    excludedPages: [],
    pageOrder: [],
    lastResult: null, // {output_path, output_name, output_size, text}
    pendingUnlockFile: null,
  };

  // ---- DOM refs --------------------------------------------------------
  const card = document.getElementById("pdfCard");

  const dropzone = document.getElementById("pdfDropzone");
  const fileInput = document.getElementById("pdfFileInput");

  const fileListEl = document.getElementById("pdfFileList");
  const addMoreBtn = document.getElementById("pdfAddMoreBtn");
  const toolGrid = document.getElementById("pdfToolGrid");

  const optionsBackBtn = document.getElementById("pdfOptionsBackBtn");
  const optionsIcon = document.getElementById("pdfOptionsIcon");
  const optionsTitle = document.getElementById("pdfOptionsTitle");
  const optionsDesc = document.getElementById("pdfOptionsDesc");
  const optionsBody = document.getElementById("pdfOptionsBody");
  const runBtn = document.getElementById("pdfRunBtn");
  const runBtnLabel = document.getElementById("pdfRunBtnLabel");

  const processingLabel = document.getElementById("pdfProcessingLabel");
  const processingFill = document.getElementById("pdfProcessingFill");

  const resultHeading = document.getElementById("pdfResultHeading");
  const resultFilename = document.getElementById("pdfResultFilename");
  const resultSize = document.getElementById("pdfResultSize");
  const resultText = document.getElementById("pdfResultText");
  const startOverBtn = document.getElementById("pdfStartOverBtn");
  const downloadBtn = document.getElementById("pdfDownloadBtn");
  const downloadBtnLabel = document.getElementById("pdfDownloadBtnLabel");

  const lockedDesc = document.getElementById("pdfLockedDesc");
  const lockedInput = document.getElementById("pdfLockedInput");
  const lockedError = document.getElementById("pdfLockedError");
  const lockedCancelBtn = document.getElementById("pdfLockedCancelBtn");
  const lockedUnlockBtn = document.getElementById("pdfLockedUnlockBtn");

  // ---- Helpers -----------------------------------------------------------
  function setState(next) {
    card.dataset.state = next;
  }

  function formatSize(bytes) {
    if (bytes == null) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function showToast(message) {
    const hub = document.getElementById("toastContainer");
    if (!hub) return;
    const toast = document.createElement("div");
    toast.className = "editorial-toast";
    toast.textContent = message;
    hub.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  }

  async function callApi(method, ...args) {
    try {
      const api = await window.web_api_ready;
      if (!api || typeof api[method] !== "function") {
        throw new Error(`API method "${method}" is not available`);
      }
      return await api[method](...args);
    } catch (err) {
      console.error(`[PDF] ${method} failed:`, err);
      return { ok: false, error: err.message || String(err) };
    }
  }

  // ---- Icons (inline, reuse currentColor) --------------------------------
  function svg(paths, viewBox = "0 0 24 24") {
    return `<svg width="17" height="17" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  }
  function iconMerge() {
    return svg(
      '<path d="M8 3v9a3 3 0 0 0 3 3h5"></path><path d="M13 12l3 3-3 3"></path><path d="M8 3H5a2 2 0 0 0-2 2v3"></path><path d="M8 21H5a2 2 0 0 1-2-2v-3"></path>'
    );
  }
  function iconRemove() {
    return svg(
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9.5" y1="14" x2="14.5" y2="18"></line><line x1="14.5" y1="14" x2="9.5" y2="18"></line>'
    );
  }
  function iconReorder() {
    return svg(
      '<rect x="4" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="14" width="6" height="6" rx="1"></rect><path d="M10 7h4a2 2 0 0 1 2 2v5"></path><path d="M14 17H10a2 2 0 0 1-2-2V10"></path>'
    );
  }
  function iconCompress() {
    return svg(
      '<polyline points="4 9 4 4 9 4"></polyline><polyline points="20 15 20 20 15 20"></polyline><line x1="4" y1="4" x2="10" y2="10"></line><line x1="20" y1="20" x2="14" y2="14"></line>'
    );
  }
  function iconExtract() {
    return svg(
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="13" y2="17"></line>'
    );
  }
  function iconLocked() {
    return svg(
      '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>'
    );
  }

  // ---- File staging --------------------------------------------------
  async function pickFiles(allowMultiple) {
    const res = await callApi("pdf_pick_files", allowMultiple);
    if (!res || res.ok === false) {
      if (res && res.error !== "cancelled") {
        showToast(res.error || "Couldn't open the file picker.");
      }
      return;
    }
    stageFromPaths(res.paths || []);
  }

  async function stageFromPaths(paths) {
    if (!paths || paths.length === 0) return;

    const res = await callApi("pdf_stage", state.stageId, paths);

    if (!res || res.ok === false) {
      showToast(res && res.error ? res.error : "Couldn't read that PDF — try again.");
      return;
    }

    state.stageId = res.id ?? state.stageId;
    state.files = res.files || state.files;

    renderFileList();

    // Check lock status first. Only once every staged file is confirmed
    // unlocked do we render the tool cards — a freshly-picked normal PDF
    // (the common case) skips the password screen entirely.
    const lockedFile = state.files.find((f) => f.locked);
    if (lockedFile) {
      openLockedPrompt(lockedFile);
    } else {
      renderToolGrid();
      setState("select");
    }
  }

  function renderFileList() {
    fileListEl.innerHTML = "";
    state.files.forEach((file, index) => {
      const chip = document.createElement("div");
      chip.className = "pdf-file-chip";
      chip.innerHTML = `
        <span class="pdf-file-chip-icon">${svg(
          '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>'
        )}</span>
        <span class="pdf-file-chip-meta">
          <span class="pdf-file-chip-name">${escapeHtml(file.name)}${file.locked ? " · locked" : ""}</span>
          <span class="pdf-file-chip-size">${formatSize(file.size)}${
        file.pages ? ` · ${file.pages} pages` : ""
      }</span>
        </span>
        <button class="pdf-file-chip-remove" data-index="${index}" title="Remove" aria-label="Remove file">
          ${svg('<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>', "0 0 24 24")}
        </button>
      `;
      fileListEl.appendChild(chip);
    });

    fileListEl.querySelectorAll(".pdf-file-chip-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.index);
        state.files.splice(idx, 1);
        if (state.files.length === 0) {
          resetAll();
        } else {
          renderFileList();
          renderToolGrid();
        }
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderToolGrid() {
    toolGrid.innerHTML = "";
    TOOLS.forEach((tool) => {
      const count = state.files.length;
      const disabled =
        count < tool.minFiles || (tool.maxFiles && count > tool.maxFiles);

      const card = document.createElement("button");
      card.type = "button";
      card.className = "pdf-tool-card" + (disabled ? " disabled" : "");
      card.innerHTML = `
        <span class="pdf-tool-card-icon">${tool.icon()}</span>
        <span class="pdf-tool-card-title">${tool.title}</span>
        <span class="pdf-tool-card-desc">${tool.desc}</span>
        ${
          tool.minFiles > 1
            ? `<span class="pdf-tool-card-req">NEEDS ${tool.minFiles}+ FILES</span>`
            : ""
        }
      `;
      if (!disabled) {
        card.addEventListener("click", () => openOptions(tool));
      }
      toolGrid.appendChild(card);
    });
  }

  // ---- Options step --------------------------------------------------
  async function openOptions(tool) {
    state.tool = tool;
    optionsIcon.innerHTML = tool.icon();
    optionsTitle.textContent = tool.title;
    optionsDesc.textContent = tool.desc;
    runBtnLabel.textContent = tool.runBtnLabel;
    optionsBody.innerHTML = "";

    if (tool.needsPageList || tool.needsPageOrder) {
      const target = state.files[0];
      let pageCount = target.pages;
      if (!pageCount) {
        const res = await callApi("pdf_stage_info", state.stageId, target.name);
        pageCount = res && res.pages ? res.pages : 1;
        target.pages = pageCount;
      }

      state.excludedPages = [];
      state.pageOrder = Array.from({ length: pageCount }, (_, i) => i);

      const wrap = document.createElement("div");
      wrap.className = "pdf-option-field";
      wrap.innerHTML = `
        <label>${tool.needsPageOrder ? "Drag pages into the order you want" : "Tap the pages to remove"}</label>
        <div class="pdf-page-order-list" id="pdfPageOrderList"></div>
        <span class="field-hint">${
          tool.needsPageOrder
            ? "Pages keep their number; only the order changes."
            : "Struck-through pages will be deleted."
        }</span>
      `;
      optionsBody.appendChild(wrap);
      renderPageList(tool);
    }

    setState("options");
  }

  function renderPageList(tool) {
    const list = document.getElementById("pdfPageOrderList");
    if (!list) return;
    list.innerHTML = "";

    const order = tool.needsPageOrder ? state.pageOrder : state.pageOrder;
    order.forEach((pageIndex, position) => {
      const item = document.createElement("div");
      const excluded = state.excludedPages.includes(pageIndex);
      item.className = "pdf-page-order-item" + (excluded ? " excluded" : "");
      item.textContent = `Page ${pageIndex + 1}`;
      item.draggable = !!tool.needsPageOrder;
      item.dataset.pageIndex = pageIndex;

      if (tool.needsPageList) {
        item.addEventListener("click", () => {
          const i = state.excludedPages.indexOf(pageIndex);
          if (i === -1) state.excludedPages.push(pageIndex);
          else state.excludedPages.splice(i, 1);
          renderPageList(tool);
        });
      }

      if (tool.needsPageOrder) {
        item.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/plain", String(position));
        });
        item.addEventListener("dragover", (e) => e.preventDefault());
        item.addEventListener("drop", (e) => {
          e.preventDefault();
          const from = Number(e.dataTransfer.getData("text/plain"));
          const to = position;
          const [moved] = state.pageOrder.splice(from, 1);
          state.pageOrder.splice(to, 0, moved);
          renderPageList(tool);
        });
      }

      list.appendChild(item);
    });
  }

  async function runTool() {
    const tool = state.tool;
    if (!tool) return;

    setState("processing");
    processingLabel.textContent = `${tool.runBtnLabel}...`;
    animateFakeProgress();

    const options = tool.buildOptions(state);
    const res = await callApi("pdf_run", state.stageId, tool.id, options);

    if (!res || res.ok === false) {
      showToast(res && res.error ? res.error : "Something went wrong — try again.");
      setState("options");
      return;
    }

    state.lastResult = res;
    resultHeading.textContent = tool.resultHeading;
    resultFilename.textContent = res.output_name || `result.${tool.outputExt}`;
    resultSize.textContent = formatSize(res.output_size);

    if (tool.isTextResult) {
      resultText.hidden = false;
      resultText.value = res.text || "";
      downloadBtnLabel.textContent = "Download .txt";
    } else {
      resultText.hidden = true;
      downloadBtnLabel.textContent = "Download .pdf";
    }

    finishProgressThen(() => setState("result"));
  }

  let progressTimer = null;
  function animateFakeProgress() {
    let pct = 0;
    processingFill.style.width = "0%";
    clearInterval(progressTimer);
    progressTimer = setInterval(() => {
      pct += Math.random() * 12;
      if (pct > 90) pct = 90;
      processingFill.style.width = `${pct}%`;
    }, 220);
  }
  function finishProgressThen(cb) {
    clearInterval(progressTimer);
    processingFill.style.width = "100%";
    setTimeout(cb, 260);
  }

  // ---- Locked file handling -------------------------------------------
  function openLockedPrompt(file) {
    state.pendingUnlockFile = file;
    lockedDesc.textContent = `"${file.name}" needs a password before AURA can read it.`;
    lockedInput.value = "";
    lockedError.hidden = true;
    setState("locked");
    lockedInput.focus();
  }

  async function attemptUnlock() {
    const file = state.pendingUnlockFile;
    if (!file) return;
    const password = lockedInput.value;
    if (!password) return;

    lockedUnlockBtn.disabled = true;
    const res = await callApi("pdf_unlock", state.stageId, file.name, password);
    lockedUnlockBtn.disabled = false;

    if (res && res.ok) {
      file.locked = false;
      lockedError.hidden = true;
      renderFileList();
      renderToolGrid();
      const nextLocked = state.files.find((f) => f.locked);
      if (nextLocked) {
        openLockedPrompt(nextLocked);
      } else {
        setState("select");
      }
    } else {
      lockedError.hidden = false;
    }
  }

  function resetAll() {
    clearInterval(progressTimer);
    state.stageId = null;
    state.files = [];
    state.tool = null;
    state.excludedPages = [];
    state.pageOrder = [];
    state.lastResult = null;
    state.pendingUnlockFile = null;
    fileInput.value = "";
    fileListEl.innerHTML = "";
    optionsBody.innerHTML = "";
    resultText.value = "";
    setState("idle");
  }

  // ---- Events --------------------------------------------------------
  // Clicking the dropzone or "add more" opens the native OS file dialog
  // (via pdf_pick_files) instead of relying on <input type=file>, whose
  // File objects don't expose a real filesystem path inside pywebview.
  dropzone.addEventListener("click", (e) => {
    e.preventDefault();
    pickFiles(true);
  });
  addMoreBtn.addEventListener("click", () => pickFiles(true));

  // Drag-and-drop path support varies by pywebview backend/OS, so this is
  // a best-effort extra, not the primary way to add files.
  ["dragenter", "dragover"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("drag-over");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag-over");
    })
  );
  dropzone.addEventListener("drop", (e) => {
    const dropped = Array.from(e.dataTransfer.files || [])
      .map((f) => f.path)
      .filter(Boolean);
    if (dropped.length > 0) {
      stageFromPaths(dropped);
    } else {
      showToast("Drag-and-drop isn't supported here — click to browse instead.");
    }
  });

  optionsBackBtn.addEventListener("click", () => setState("select"));
  runBtn.addEventListener("click", runTool);

  startOverBtn.addEventListener("click", resetAll);

  downloadBtn.addEventListener("click", async () => {
    if (!state.lastResult) return;
    const res = await callApi(
      "pdf_export",
      state.lastResult.output_path,
      state.lastResult.output_name
    );
    if (res && res.ok) {
      showToast(`Saved to ${res.saved_path}`);
    } else {
      showToast(res && res.error ? res.error : "Couldn't save the file.");
    }
  });

  lockedCancelBtn.addEventListener("click", () => {
    state.files = state.files.filter((f) => f !== state.pendingUnlockFile);
    if (state.files.length === 0) {
      resetAll();
    } else {
      renderFileList();
      renderToolGrid();
      setState("select");
    }
  });
  lockedUnlockBtn.addEventListener("click", attemptUnlock);
  lockedInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") attemptUnlock();
  });

  // Init
  resetAll();
})();