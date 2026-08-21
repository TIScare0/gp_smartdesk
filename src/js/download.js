/**
 * AURA — Download Progress Modal Controller
 * Single-card modal with blurred backdrop. Real pause/resume/cancel state
 * machine; the actual byte-progress source is currently FAKE (see
 * startFakeProgressDriver below) — swap that function's internals for a
 * real fetch/XHR progress source when ready, everything else stays as-is.
 */
(function () {
  'use strict';

  const DOM = {
    backdrop: document.getElementById('downloadModalBackdrop'),
    card: document.getElementById('downloadCard'),
    fileIcon: document.getElementById('dcFileIcon'),
    fileName: document.getElementById('dcFileName'),
    fileMeta: document.getElementById('dcFileMeta'),
    closeBtn: document.getElementById('dcCloseBtn'),
    progressFill: document.getElementById('dcProgressFill'),
    statusLabel: document.getElementById('dcStatusLabel'),
    progressStats: document.getElementById('dcProgressStats'),
    speedText: document.getElementById('dcSpeedText'),
    etaText: document.getElementById('dcEtaText'),
    pauseResumeBtn: document.getElementById('dcPauseResumeBtn'),
    pauseResumeLabel: document.getElementById('dcPauseResumeLabel'),
    iconPause: document.querySelector('.dc-icon-pause'),
    iconResume: document.querySelector('.dc-icon-resume'),
    cancelBtn: document.getElementById('dcCancelBtn')
  };

  const ICONS = {
    file: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`,
    complete: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>`,
    error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
    paused: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`
  };

  let session = null; // active download session state
  let fakeDriverHandle = null;

  // ---------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------
  function open(config) {
    session = {
      fileName: config.fileName || 'download.bin',
      totalBytes: config.totalBytes || 0,
      loadedBytes: 0,
      sourceLabel: config.sourceLabel || 'AURA Model Registry',
      state: 'downloading', // downloading | paused | complete | error
      startedAt: performance.now(),
      onCancel: config.onCancel || null
    };

    DOM.fileName.textContent = session.fileName;
    DOM.fileMeta.textContent = `${formatBytes(session.totalBytes)} · from ${session.sourceLabel}`;
    setState('downloading');
    updateProgressUI();

    DOM.backdrop.classList.add('active');
    DOM.backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // FAKE progress source — replace with real download wiring later.
    startFakeProgressDriver();
  }

  function close() {
    DOM.backdrop.classList.remove('active');
    DOM.backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    stopFakeProgressDriver();
    session = null;
  }

  function setProgress(loadedBytes, totalBytes) {
    if (!session) return;
    session.loadedBytes = loadedBytes;
    if (totalBytes) session.totalBytes = totalBytes;
    updateProgressUI();

    if (session.loadedBytes >= session.totalBytes && session.totalBytes > 0) {
      setState('complete');
      stopFakeProgressDriver();
    }
  }

  function setError(message) {
    if (!session) return;
    setState('error');
    stopFakeProgressDriver();
    if (message && DOM.fileMeta) {
      DOM.fileMeta.textContent = message;
    }
  }

  // ---------------------------------------------------------------------
  // State machine
  // ---------------------------------------------------------------------
  function setState(newState) {
    if (!session) return;
    session.state = newState;
    DOM.card.setAttribute('data-state', newState);

    DOM.fileIcon.classList.remove('dc-icon-complete', 'dc-icon-error', 'dc-icon-paused');

    switch (newState) {
      case 'downloading':
        DOM.fileIcon.innerHTML = ICONS.file;
        DOM.statusLabel.textContent = 'Downloading...';
        break;
      case 'paused':
        DOM.fileIcon.classList.add('dc-icon-paused');
        DOM.fileIcon.innerHTML = ICONS.paused;
        DOM.statusLabel.textContent = 'Paused';
        break;
      case 'complete':
        DOM.fileIcon.classList.add('dc-icon-complete');
        DOM.fileIcon.innerHTML = ICONS.complete;
        DOM.statusLabel.textContent = 'Complete';
        DOM.speedText.textContent = '';
        DOM.etaText.textContent = 'Done';
        break;
      case 'error':
        DOM.fileIcon.classList.add('dc-icon-error');
        DOM.fileIcon.innerHTML = ICONS.error;
        DOM.statusLabel.textContent = 'Failed';
        DOM.speedText.textContent = '';
        DOM.etaText.textContent = '';
        break;
    }
  }

  function togglePauseResume() {
    if (!session) return;
    if (session.state === 'downloading') {
      setState('paused');
      DOM.pauseResumeLabel.textContent = 'Resume';
      DOM.iconPause.style.display = 'none';
      DOM.iconResume.style.display = 'inline-block';
    } else if (session.state === 'paused') {
      setState('downloading');
      DOM.pauseResumeLabel.textContent = 'Pause';
      DOM.iconPause.style.display = 'inline-block';
      DOM.iconResume.style.display = 'none';
    }
  }

  function cancelDownload() {
    if (!session) return;
    const cb = session.onCancel;
    stopFakeProgressDriver();
    close();
    if (typeof cb === 'function') cb();
  }

  // ---------------------------------------------------------------------
  // UI updates
  // ---------------------------------------------------------------------
  function updateProgressUI() {
    if (!session || session.totalBytes <= 0) return;
    const pct = Math.min(100, (session.loadedBytes / session.totalBytes) * 100);
    DOM.progressFill.style.width = `${pct}%`;
    DOM.progressStats.textContent = `${formatBytes(session.loadedBytes)} / ${formatBytes(session.totalBytes)} · ${Math.round(pct)}%`;
  }

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return mb >= 1000 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(0)} MB`;
  }

  // ---------------------------------------------------------------------
  // FAKE progress driver — DELETE THIS SECTION when wiring a real download.
  // Replace with e.g. an XHR .onprogress handler calling setProgress(),
  // or fetch() + ReadableStream reader loop calling setProgress() per chunk.
  // ---------------------------------------------------------------------
  function startFakeProgressDriver() {
    stopFakeProgressDriver();
    const tick = () => {
      if (!session || session.state !== 'downloading') {
        fakeDriverHandle = setTimeout(tick, 400);
        return;
      }
      const increment = session.totalBytes * (0.01 + Math.random() * 0.02);
      const newLoaded = Math.min(session.totalBytes, session.loadedBytes + increment);
      setProgress(newLoaded, session.totalBytes);

      const speedMBs = (increment / (1024 * 1024)) / 0.4;
      DOM.speedText.textContent = `${speedMBs.toFixed(1)} MB/s`;
      const remainingBytes = session.totalBytes - newLoaded;
      const etaSec = speedMBs > 0 ? Math.round((remainingBytes / (1024 * 1024)) / speedMBs) : 0;
      DOM.etaText.textContent = etaSec > 0 ? `~${etaSec}s remaining` : 'Finishing...';

      if (session && session.state === 'downloading' && newLoaded < session.totalBytes) {
        fakeDriverHandle = setTimeout(tick, 400 + Math.random() * 300);
      }
    };
    fakeDriverHandle = setTimeout(tick, 500);
  }

  function stopFakeProgressDriver() {
    if (fakeDriverHandle) {
      clearTimeout(fakeDriverHandle);
      fakeDriverHandle = null;
    }
  }
  // ---------------------------------------------------------------------

  // ---------------------------------------------------------------------
  // Event bindings
  // ---------------------------------------------------------------------
  DOM.closeBtn?.addEventListener('click', close);
  DOM.pauseResumeBtn?.addEventListener('click', togglePauseResume);
  DOM.cancelBtn?.addEventListener('click', cancelDownload);

  DOM.backdrop?.addEventListener('click', (e) => {
    if (e.target === DOM.backdrop) {
      // Only allow backdrop-click-to-close once finished or errored,
      // not mid-download (avoids accidental dismissal of active transfer)
      if (session && (session.state === 'complete' || session.state === 'error')) {
        close();
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && session && (session.state === 'complete' || session.state === 'error')) {
      close();
    }
  });

  // ---------------------------------------------------------------------
  // Export public API
  // ---------------------------------------------------------------------
  window.AURADownload = {
    open,       // open({ fileName, totalBytes, sourceLabel, onCancel })
    close,
    setProgress, // setProgress(loadedBytes, totalBytes?) — call from real download logic
    setError,    // setError(message?)
    cancel: cancelDownload
  };

})();