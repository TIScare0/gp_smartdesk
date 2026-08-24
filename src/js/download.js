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
    cancelBtn: document.getElementById('dcCancelBtn')
  };

  const ICONS = {
    file: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`,
    complete: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>`,
    error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
    paused: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`
  };

  let session = null; // active download session state

  async function open(filename, download_id) {
      const web_api = window.web_api;

      if (!web_api) {
          console.error("Python API isn't ready");
          return { status: false, completed: false };
      }

      if (!download_id) {
          const error = 'Unable to get download id';
          console.error(error);
          setError(error);
          return { status: false, completed: false };
      }

      session = {
          fileName: filename || 'Unknown download',
          status: 'downloading...',
          download_id: download_id,
          progress: 0
      };

      DOM.fileName.textContent = session.fileName;

      setState('downloading');

      DOM.backdrop.classList.add('active');
      DOM.backdrop.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      // Start Python download
      const started = await web_api.download(download_id);

      if (!started?.status) {
          console.error(started?.error);
          setError(started?.error || 'Failed to start download');

          return {
              status: false,
              completed: false
          };
      }

      const did = started.id;

      console.log(`Download started: ${did}`);

      // Wait for the actual download to finish
      while (true) {
          const result = await web_api.download_step(did);

          console.log("DOWNLOAD STEP:", result);

          if (!result?.status) {
              console.error(result?.error);

              setError(result?.error || 'Download failed');

              return {
                  status: false,
                  completed: false
              };
          }

          // Update progress
          if (result.data?.progress !== undefined) {
              setProgress(result.data.progress);
          }

          // Actual download completion
          if (result.done === true) {
              console.log("DOWNLOAD COMPLETE");

              setProgress(100);
              setState('complete');

              // Let the user see "Complete"
              await new Promise(resolve => setTimeout(resolve, 500));

              close();

              return {
                  status: true,
                  completed: true
              };
          }

          // Don't hammer Python
          await new Promise(resolve => setTimeout(resolve, 50));
      }
  }

  function close() {
    DOM.backdrop.classList.remove('active');
    DOM.backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    session = null;
  }

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
        break;
      case 'error':
        DOM.fileIcon.classList.add('dc-icon-error');
        DOM.fileIcon.innerHTML = ICONS.error;
        DOM.statusLabel.textContent = 'Failed';
        break;
    }
  }

  function setProgress(progress) {
    if (!session) return;
    session.progress = progress
    updateProgressUI();

    if (session.progress == 100) {
      setState('complete');
    }
  }

  function setError(message) {
    if (!session) return;
    setState('error');
    if (message && DOM.fileMeta) {
      DOM.fileMeta.textContent = message;
    }
  }

  function cancelDownload() {
    if (!session) return;
    const cb = session.onCancel;
    close();
    if (typeof cb === 'function') cb();
  }

  function updateProgressUI() {
    const pct = session.progress;
    DOM.progressFill.style.width = `${pct}%`;
  }

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return mb >= 1000 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(0)} MB`;
  }

  DOM.closeBtn?.addEventListener('click', close);
  DOM.cancelBtn?.addEventListener('click', cancelDownload);

  DOM.backdrop?.addEventListener('click', (e) => {
    if (e.target === DOM.backdrop) {
      if (session && (session.state === 'complete' || session.state === 'error')) {
        close();
      }
    }
  });

  window.AURADownload = {
    open,       // open({ fileName, totalBytes, sourceLabel, onCancel })
    close,
  };

})();