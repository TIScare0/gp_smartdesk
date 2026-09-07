/* ==========================================================================
   IMAGE GALLERY — AURA
   --------------------------------------------------------------------------
   Backend contract on window.web_api (see webview.js):

     await api.get_images()
         -> [{ image: "__file__/<name>" }, ...]
         Newest first. `image` is used verbatim as an <img src> — whatever
         custom scheme resolves "__file__/..." into a loadable file URL is
         handled elsewhere (pywebview scheme handler), not here.
   ========================================================================== */

(function () {
  "use strict";

  const loadingEl = document.getElementById("galleryLoading");
  const emptyEl = document.getElementById("galleryEmpty");
  const gridEl = document.getElementById("galleryGrid");
  const refreshBtn = document.getElementById("galleryRefreshBtn");

  const lightboxBackdrop = document.getElementById("lightboxBackdrop");
  const lightboxViewport = document.getElementById("lightboxViewport");
  const lightboxImage = document.getElementById("lightboxImage");
  const zoomInBtn = document.getElementById("lightboxZoomInBtn");
  const zoomOutBtn = document.getElementById("lightboxZoomOutBtn");
  const resetBtn = document.getElementById("lightboxResetBtn");
  const closeBtn = document.getElementById("lightboxCloseBtn");

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  async function callApi(method, ...args) {
    try {
      const api = await window.web_api_ready;
      if (!api || typeof api[method] !== "function") {
        throw new Error(`API method "${method}" is not available`);
      }
      return await api[method](...args);
    } catch (err) {
      console.error(`[Gallery] ${method} failed:`, err);
      return null;
    }
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

  // ---- Loading & rendering ------------------------------------------
  // ---- Loading & rendering ------------------------------------------
  // ---- Loading & rendering ------------------------------------------
  async function loadImages() {
    // Show loading state
    loadingEl.hidden = false;
    gridEl.hidden = true;

    try {
      const api = await window.web_api_ready;

      if (!api || typeof api.get_images !== "function") {
        throw new Error("get_images API is not available");
      }

      const images = await api.get_images();

      console.log("[Gallery] Images:", images);

      // Stop loading
      loadingEl.hidden = true;

      // No images
      if (!Array.isArray(images) || images.length === 0) {
        gridEl.innerHTML = "";
        gridEl.hidden = true;

        // Show empty state
        if (emptyEl) {
          emptyEl.hidden = false;
        }

        return;
      }

      // Images found
      if (emptyEl) {
        emptyEl.remove();
      }

      renderGrid(images);
      gridEl.hidden = false;
    } catch (error) {
      console.error("[Gallery] Failed:", error);

      loadingEl.hidden = true;
      gridEl.innerHTML = "";
      gridEl.hidden = true;

      if (emptyEl) {
        emptyEl.hidden = false;
      }
    }
  }

  function renderGrid(images) {
    gridEl.innerHTML = images
      .map((item) => {
        const imagePath = item.image;
        const name = imagePath;
        return `<div class="image-thumb-card" data-image-url="${escapeHtml(imagePath)}">
          <img class="generated-image-thumb" src="${escapeHtml(imagePath)}" alt="${escapeHtml(name)}" loading="lazy" />
          <div class="gallery-card-meta"><span class="gallery-card-name">${escapeHtml(name)}</span></div>
        </div>`;
      })
      .join("");

    gridEl.querySelectorAll(".image-thumb-card").forEach((card) => {
      card.addEventListener("click", () => {
        openLightbox(card.dataset.imageUrl);
      });
    });
  }

  refreshBtn.addEventListener("click", async () => {
    refreshBtn.classList.add("spinning");
    await loadImages();
    setTimeout(() => refreshBtn.classList.remove("spinning"), 300);
  });

  // ---- Zoomable / pannable lightbox -----------------------------------
  const zoom = { scale: 1, x: 0, y: 0 };
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 6;
  let dragging = false;
  let dragStart = { x: 0, y: 0, panX: 0, panY: 0 };

  function applyZoomTransform(withTransition) {
    lightboxImage.classList.toggle("no-transition", !withTransition);
    lightboxImage.style.transform = `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`;
  }

  function resetZoom(withTransition) {
    zoom.scale = 1;
    zoom.x = 0;
    zoom.y = 0;
    applyZoomTransform(withTransition !== false);
  }

  function setZoom(nextScale, withTransition) {
    zoom.scale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nextScale));
    if (zoom.scale === ZOOM_MIN) {
      zoom.x = 0;
      zoom.y = 0;
    }
    applyZoomTransform(withTransition !== false);
  }

  function openLightbox(imagePath) {
    lightboxImage.src = imagePath;
    resetZoom(false);
    lightboxBackdrop.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightboxBackdrop.classList.remove("active");
    document.body.style.overflow = "";
    setTimeout(() => {
      lightboxImage.src = "";
    }, 200);
  }

  zoomInBtn.addEventListener("click", () => setZoom(zoom.scale + 0.6));
  zoomOutBtn.addEventListener("click", () => setZoom(zoom.scale - 0.6));
  resetBtn.addEventListener("click", () => resetZoom());
  closeBtn.addEventListener("click", closeLightbox);

  lightboxBackdrop.addEventListener("click", (e) => {
    if (e.target === lightboxBackdrop) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (!lightboxBackdrop.classList.contains("active")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "+" || e.key === "=") setZoom(zoom.scale + 0.4);
    if (e.key === "-") setZoom(zoom.scale - 0.4);
  });

  // Scroll-wheel zoom, centered on cursor-ish (simple version: just scale)
  lightboxViewport.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.3 : 0.3;
      setZoom(zoom.scale + delta, false);
    },
    { passive: false },
  );

  // Double-click to toggle zoom
  lightboxImage.addEventListener("dblclick", () => {
    if (zoom.scale > ZOOM_MIN) {
      resetZoom();
    } else {
      setZoom(2.4);
    }
  });

  // Drag to pan once zoomed in
  lightboxViewport.addEventListener("mousedown", (e) => {
    if (zoom.scale <= ZOOM_MIN) return;
    dragging = true;
    lightboxViewport.classList.add("dragging");
    dragStart = { x: e.clientX, y: e.clientY, panX: zoom.x, panY: zoom.y };
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    zoom.x = dragStart.panX + (e.clientX - dragStart.x);
    zoom.y = dragStart.panY + (e.clientY - dragStart.y);
    applyZoomTransform(false);
  });
  window.addEventListener("mouseup", () => {
    dragging = false;
    lightboxViewport.classList.remove("dragging");
  });

  // Init
  loadImages();
})();
