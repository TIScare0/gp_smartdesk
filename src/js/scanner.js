/**
 * AURA — QR / Barcode Scanner
 * Camera access, image upload, AND code detection are all REAL — this uses
 * ZXing (loaded locally from js/vendor/zxing.min.js), a pure-JavaScript
 * decoder that reads pixel data via canvas, so it works in every browser
 * (Chrome, Firefox, Safari, Edge, mobile) — no native API dependency.
 */
(function () {
  'use strict';

  const DOM = {
    frame: document.getElementById('viewfinderFrame'),
    video: document.getElementById('viewfinderVideo'),
    image: document.getElementById('viewfinderImage'),
    statusText: document.getElementById('viewfinderStatusText'),
    detectionHighlight: document.getElementById('detectionHighlight'),

    startCameraBtn: document.getElementById('startCameraBtn'),
    stopCameraBtn: document.getElementById('stopCameraBtn'),
    fileInput: document.getElementById('scannerFileInput'),

    resultsList: document.getElementById('scanResultsList'),
    resultsEmpty: document.getElementById('scanResultsEmpty'),
    clearResultsBtn: document.getElementById('clearResultsBtn'),
    sessionCount: document.getElementById('scanSessionCount'),

    toastContainer: document.getElementById('toastContainer')
  };

  let mediaStream = null;
  let scannedResults = [];
  let zxingReader = null;
  let cameraControls = null; // ZXing's controls object, used to stop decoding cleanly
  let libReady = false;

  // Offscreen canvas used to grab frames/images for decoding
  const workCanvas = document.createElement('canvas');
  const workCtx = workCanvas.getContext('2d', { willReadFrequently: true });

  // ---------- Library init ----------
  function initLibrary() {
  if (!window.ZXing) {
    showUnsupportedNotice(
      'Scanner library failed to load — check js/vendor/zxing.min.js is present.'
    );
    return;
  }

  try {
    const originalConsoleWarn = console.warn;

    console.warn = function (...args) {
      // Ignore ZXing's internal warnings
      if (
        String(args[0] ?? '').startsWith('MultiFormatReader:')
      ) {
        return;
      }

      // Keep your application's warnings
      originalConsoleWarn.apply(console, args);
    };

    zxingReader = new window.ZXing.BrowserMultiFormatReader();

    libReady = true;
  } catch (err) {
    showUnsupportedNotice('Could not initialize the scanner engine.');
    console.warn('ZXing init failed:', err);
  }
}

  function showUnsupportedNotice(msg) {
    DOM.statusText.textContent = 'Scanner unavailable';
    showToast(msg);
    DOM.startCameraBtn.disabled = true;
    DOM.startCameraBtn.style.opacity = '0.5';
    DOM.startCameraBtn.style.cursor = 'not-allowed';
  }

  // ---------- Camera control (REAL, via ZXing's own camera helper) ----------
  async function startCamera() {
    if (!libReady) {
      showToast('Scanner engine is not ready yet');
      return;
    }

    try {
      DOM.frame.setAttribute('data-mode', 'camera');
      DOM.statusText.textContent = 'Scanning...';
      DOM.startCameraBtn.style.display = 'none';
      DOM.stopCameraBtn.style.display = 'inline-flex';

      // decodeFromConstraints handles getUserMedia + continuous decoding internally
      cameraControls = await zxingReader.decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        DOM.video,
        (result, err) => {
          if (result) {
            addScanResult(mapFormatLabel(result.getBarcodeFormat()), result.getText());
            stopCamera();
          }
          // err fires continuously when no code is in frame — expected, ignore it
        }
      );

      mediaStream = DOM.video.srcObject;
    } catch (err) {
      showToast('Camera access denied or unavailable');
      console.warn('Camera error:', err);
      stopCamera();
    }
  }

  function stopCamera() {
    if (cameraControls) {
      cameraControls.stop();
      cameraControls = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
    DOM.video.srcObject = null;
    DOM.frame.setAttribute('data-mode', 'idle');
    DOM.statusText.textContent = 'Camera off';
    DOM.startCameraBtn.style.display = 'inline-flex';
    DOM.stopCameraBtn.style.display = 'none';
  }

  DOM.startCameraBtn.addEventListener('click', startCamera);
  DOM.stopCameraBtn.addEventListener('click', stopCamera);

  // ---------- Image upload (REAL decode via ZXing) ----------
  DOM.fileInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    if (!libReady) {
      showToast('Scanner engine is not ready yet');
      return;
    }

    stopCamera();

    const reader = new FileReader();
    reader.onload = async (evt) => {
      DOM.image.src = evt.target.result;
      DOM.frame.setAttribute('data-mode', 'image');
      DOM.statusText.textContent = 'Analyzing image...';

      await new Promise((resolve) => {
        if (DOM.image.complete) resolve();
        else DOM.image.onload = resolve;
      });

      try {
        const result = await zxingReader.decodeFromImageElement(DOM.image);
        addScanResult(mapFormatLabel(result.getBarcodeFormat()), result.getText());
        DOM.statusText.textContent = 'Code found';
        stopCamera();
      } catch (err) {
        DOM.statusText.textContent = 'No code detected in this image';
      }
    };
    reader.readAsDataURL(file);
  });

  // ---------- Format label mapping ----------
  function mapFormatLabel(formatEnum) {
    // ZXing.BarcodeFormat is a numeric enum; getBarcodeFormat() returns the
    // enum value, so map it back to a readable name via ZXing's own map.
    try {
      const name = window.ZXing.BarcodeFormat[formatEnum];
      return (name || 'CODE').replace(/_/g, '-');
    } catch (e) {
      return 'CODE';
    }
  }

  // ---------- Results list (REAL) ----------
  function addScanResult(type, value) {
    const alreadyExists = scannedResults.some((r) => r.value === value);
    if (alreadyExists) return; // avoid duplicate spam from repeated camera reads

    const entry = {
      id: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      value,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    scannedResults.unshift(entry);
    renderResults();
    showToast(`${type} detected`);
  }

  function renderResults() {
    DOM.resultsEmpty.style.display = scannedResults.length ? 'none' : 'block';
    DOM.sessionCount.textContent = `${scannedResults.length} scanned this session`;

    DOM.resultsList.querySelectorAll('.scan-result-row').forEach((el) => el.remove());

    scannedResults.forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'scan-result-row';
      row.dataset.id = entry.id;

      const isUrl = /^https?:\/\//i.test(entry.value);

      row.innerHTML = `
        <span class="scan-result-type-badge ${isUrl ? 'type-url' : ''}">${entry.type}</span>
        <div class="scan-result-body">
          <span class="scan-result-value">${escapeHtml(entry.value)}</span>
          <span class="scan-result-time">${entry.time}</span>
        </div>
        <div class="scan-result-actions">
          ${isUrl ? `
            <button class="scan-result-action-btn" data-action="open" title="Open link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </button>
          ` : ''}
          <button class="scan-result-action-btn" data-action="copy" title="Copy value">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          <button class="scan-result-action-btn" data-action="remove" title="Remove">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      `;

      row.querySelector('[data-action="copy"]')?.addEventListener('click', () => {
        navigator.clipboard.writeText(entry.value);
        showToast('Copied to clipboard');
      });

      row.querySelector('[data-action="open"]')?.addEventListener('click', () => {
        window.open(entry.value, '_blank', 'noopener');
      });

      row.querySelector('[data-action="remove"]')?.addEventListener('click', () => {
        scannedResults = scannedResults.filter((r) => r.id !== entry.id);
        renderResults();
      });

      DOM.resultsList.appendChild(row);
    });
  }

  DOM.clearResultsBtn.addEventListener('click', () => {
    scannedResults = [];
    renderResults();
  });

  // ---------- Utils ----------
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

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

  window.addEventListener('beforeunload', stopCamera);

  initLibrary();
  renderResults();
})();