/**
 * AURA — 3D Isometric Pixel Grid Simulation & Lens Inspector Module
 * Standalone Engine for voxel elevation waves, stabilization, and magnifying inspection.
 *
 * Perf notes (v3):
 *  - Pixel grid stored as flat typed arrays (Structure-of-Arrays) instead of
 *    an array-of-objects grid. Avoids per-cell object property lookups and
 *    GC churn — this was the single biggest cost in the per-frame loop.
 *  - Static per-cell geometry (normX, normY, wave phase/frequency, screen
 *    x/y) is precomputed once (on init and on resize) instead of recomputed
 *    every frame.
 *  - Draw pass skips shadow/bevel path construction below an elevation
 *    threshold (they're the most expensive draws — beginPath/fill — and
 *    contribute least when the voxel is nearly flat).
 *  - Border stroke is skipped when its alpha is visually negligible.
 *  - Running max-elevation is tracked inside the physics step instead of a
 *    separate full-grid scan every flatten frame.
 *  - Math.pow(x, 1.4) replaced with an equivalent x*sqrt(x)*x^0.1 avoided —
 *    kept as x*Math.sqrt(x)-based cheaper curve that visually matches.
 */

(function () {
  'use strict';

  // --- Curated Preview Images (cycled while the real image generates) ---
  const IMAGES = [
    { url: '/images/earth.jpeg' },
    { url: '/images/rich_house.png' },
    { url: '/images/space.png' },
    { url: '/images/trees_nature.png' },
    { url: '/images/waterfall.png' }
  ];

  // Active running card engines
  const activeEngines = [];

  // ---  Fallback Generator (Handles local CORS safety) ---
  function createProceduralFallback(colors, cols, rows) {
    const c = document.createElement('canvas');
    c.width = cols;
    c.height = rows;
    const ctx = c.getContext('2d');
    if (!ctx) return c;

    const palette = colors && colors.length ? colors : ['#2a2a2a', '#050505'];
    const grad = ctx.createLinearGradient(0, 0, cols, rows);
    palette.forEach((col, i) => {
      grad.addColorStop(i / Math.max(1, palette.length - 1), col);
    });
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cols, rows);

    for (let r = 0; r < rows; r++) {
      for (let x = 0; x < cols; x++) {
        if (Math.random() > 0.6) {
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.15})`;
          ctx.fillRect(x, r, 1, 1);
        }
      }
    }
    return c;
  }

  // Visibility thresholds below which a draw call is skipped entirely —
  // tuned so the cutoff is imperceptible but avoids wasted path/fill work.
  const ELEVATION_DRAW_EPS = 0.35;   // below this, bevels/shadow are skipped
  const BORDER_ALPHA_EPS = 0.006;    // below this, stroke is skipped
  const CELL_HIDDEN_EPS = 0.004;     // below this reveal progress, cell is skipped

  // --- 3D Pixel Grid Engine Instance ---
  class PixelEngineInstance {
    constructor(cardElement, scene, userPrompt = '') {
      this.cardElement = cardElement;
      this.scene = scene;
      this.userPrompt = userPrompt;

      this.dispCanvas = cardElement.querySelector('.pixel-canvas-display');
      this.procCanvas = cardElement.querySelector('.pixel-canvas-proc');
      this.overlayImg = cardElement.querySelector('.clear-image-overlay');
      this.statusBadge = cardElement.querySelector('.status-badge');
      this.statusText = cardElement.querySelector('.status-text');
      this.countdownSpan = cardElement.querySelector('.timer-countdown');
      this.reanimateBtn = cardElement.querySelector('.reanimate-btn');
      this.inspectBtn = cardElement.querySelector('.inspect-lens-btn');
      this.canvasViewport = cardElement.querySelector('.card-canvas-viewport');

      this.dispCtx = this.dispCanvas?.getContext('2d', { alpha: false });
      this.procCtx = this.procCanvas?.getContext('2d', { willReadFrequently: true });

      this.config = {
        gridCols: 46,
        gridRows: 34,
        maxElevation: 38,
        elevationSmoothing: 0.14,
        gapRatio: 0.05,
        darken: 0.50,
        backgroundColor: '#030303',
        borderColor: { r: 255, g: 255, b: 255 },
        borderOpacity: 0.12,
      };

      this.cellCount = this.config.gridCols * this.config.gridRows;

      // --- Perpetual ambient animation clock (never resets) ---
      this.animStart = performance.now();

      // --- Phase state machine ---
      // 'looping'  : perpetual 3D wave animation, colors driven by whatever
      //              is currently sampled into targets (preview or real).
      // 'flatten'  : real image has arrived — smoothly kill elevation to 0.
      // 'blackout' : fade the whole card to solid black.
      // 'reveal'   : staggered per-cell reveal of the real image pixels.
      // 'done'     : static final frame; canvas stops drawing per-frame work,
      //              the <img> overlay is swapped in as the resting state.
      this.phase = 'looping';
      this.phaseStart = performance.now();

      this.isStabilized = false;

      // Image generation state
      this.targetImageReady = false;
      this.finalImageUrl = null;

      // Preview cycling
      this.previewCycleActive = false;
      this.previewList = [];
      this.previewIndex = 0;
      this.previewIntervalId = null;

      // Elevation control — smoothly driven to 0 during 'flatten'
      this.elevationScale = 1.0;
      this._runningMaxElevation = 0;

      // Blackout / reveal
      this.blackoutAlpha = 0;
      this.revealDurationMs = 850;

      // Cached layout (recomputed only on resize)
      this._layoutW = -1;
      this._layoutH = -1;
      this._cellSize = 0;
      this._gap = 0;
      this._offsetX0 = 0;
      this._offsetY0 = 0;

      // The overlay <img> must NEVER be visible while the canvas is doing
      // work (looping/flatten/blackout/reveal) — it only appears as the
      // final resting frame once 'done' is reached. We control this purely
      // in JS, not via CSS class toggles mid-sequence, to avoid double-draw.
      if (this.overlayImg) {
        this.overlayImg.classList.remove('visible');
        this.overlayImg.style.transition = 'none';
        this.overlayImg.style.opacity = '0';
      }

      this.initGrid();
      this.loadSceneImage();
      this.bindEvents();
    }

    // ---------------------------------------------------------------
    // Preview cycling — only swaps pixel color TARGETS. Never touches
    // animStart/phase, so the ambient wave animation is uninterrupted.
    // ---------------------------------------------------------------
    startPreviewCycle(imageUrls, intervalMs = 5000) {
      if (!Array.isArray(imageUrls) || imageUrls.length === 0) return;

      this.previewList = imageUrls.slice();
      this.previewIndex = 0;
      this.previewCycleActive = true;

      this._sampleUrlIntoTargets(this.previewList[this.previewIndex]);

      if (this.previewIntervalId) clearInterval(this.previewIntervalId);
      this.previewIntervalId = setInterval(() => {
        if (!this.previewCycleActive) return;
        this.previewIndex = (this.previewIndex + 1) % this.previewList.length;
        this._sampleUrlIntoTargets(this.previewList[this.previewIndex]);
      }, intervalMs);
    }

    stopPreviewCycle() {
      this.previewCycleActive = false;
      if (this.previewIntervalId) {
        clearInterval(this.previewIntervalId);
        this.previewIntervalId = null;
      }
    }

    _sampleUrlIntoTargets(url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => this.sampleImage(img);
      img.onerror = () => { /* keep current targets; next tick retries */ };
      img.src = url;
    }

    // ---------------------------------------------------------------
    // Called once the real generated image path is available.
    // Stops preview cycling, loads the real image, and kicks off the
    // finalize sequence WITHOUT resetting animStart.
    // ---------------------------------------------------------------
    setTargetImage(imagePath) {
      if (!imagePath) return;
      this.stopPreviewCycle();

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        this.finalImageEl = img;
        this.finalImageUrl = imagePath;
        this.targetImageReady = true;

        // Sample real image into color targets — the ongoing wave loop
        // will smoothly crossfade toward these colors on its own.
        this.sampleImage(img);

        this.scene = { url: imagePath, name: 'Generated Image' };

        this._beginFlatten();
      };

      img.onerror = (error) => {
        console.error('Failed to load generated image:', imagePath, error);
      };

      img.src = imagePath;
    }

    _beginFlatten() {
      this.phase = 'flatten';
      this.phaseStart = performance.now();

      if (this.statusText) this.statusText.textContent = 'Stabilizing pixel surface...';
      if (this.countdownSpan) this.countdownSpan.style.display = 'none';
    }

    _beginBlackout() {
      this.phase = 'blackout';
      this.phaseStart = performance.now();
      this.blackoutAlpha = 0;

      if (this.statusText) this.statusText.textContent = 'Rendering HD image...';
    }

    _beginReveal() {
      this.phase = 'reveal';
      this.phaseStart = performance.now();

      const n = this.cellCount;
      this.revealDelay = new Float32Array(n);
      this.revealDur = new Float32Array(n);
      this.revealProgress = new Float32Array(n);

      for (let i = 0; i < n; i++) {
        this.revealDelay[i] = Math.random() * (this.revealDurationMs * 0.65);
        this.revealDur[i] = this.revealDurationMs * (0.3 + Math.random() * 0.4);
      }

      if (this.statusText) this.statusText.textContent = 'Revealing image...';
    }

    _finish() {
      this.phase = 'done';
      this.isStabilized = true;

      this.cardElement.classList.add('is-stabilized');

      if (this.inspectBtn) this.inspectBtn.classList.add('visible');
      if (this.statusBadge) this.statusBadge.classList.add('stabilized');
      if (this.statusText) this.statusText.textContent = '✓ HD Image Stabilized';
      if (this.countdownSpan) this.countdownSpan.textContent = 'Clean';

      // Swap the resting state over to the plain <img> element now that the
      // canvas reveal has fully completed — instant swap, no CSS fade, so
      // there is no double-image flash. The canvas keeps its last-drawn
      // frame underneath but is simply no longer updated.
      if (this.overlayImg && this.finalImageUrl) {
        this.overlayImg.style.transition = 'none';
        this.overlayImg.src = this.finalImageUrl;
        this.overlayImg.style.opacity = '1';
        this.overlayImg.classList.add('visible');
      }
    }

    restartAnimation() {
      this.stopPreviewCycle();

      this.phase = 'looping';
      this.phaseStart = performance.now();
      this.animStart = performance.now();
      this.isStabilized = false;
      this.targetImageReady = false;
      this.elevationScale = 1.0;
      this.blackoutAlpha = 0;
      this.revealDelay = null;
      this.revealDur = null;
      this.revealProgress = null;

      this.cardElement.classList.remove('is-stabilized');

      if (this.inspectBtn) this.inspectBtn.classList.remove('visible');
      if (this.statusBadge) this.statusBadge.classList.remove('stabilized');
      if (this.overlayImg) {
        this.overlayImg.style.transition = 'none';
        this.overlayImg.style.opacity = '0';
        this.overlayImg.classList.remove('visible');
      }
      if (this.statusText) this.statusText.textContent = 'Generating image...';
      if (this.countdownSpan) this.countdownSpan.style.display = 'inline-block';
    }

    // ---------------------------------------------------------------
    // Grid storage: flat typed arrays (Structure-of-Arrays layout).
    // Index for (r, c) is r * gridCols + c.
    // ---------------------------------------------------------------
    initGrid() {
      const { gridCols, gridRows } = this.config;
      const n = gridCols * gridRows;
      this.cellCount = n;

      this.curR = new Float32Array(n).fill(25);
      this.curG = new Float32Array(n).fill(25);
      this.curB = new Float32Array(n).fill(25);

      this.targetR = new Float32Array(n).fill(25);
      this.targetG = new Float32Array(n).fill(25);
      this.targetB = new Float32Array(n).fill(25);

      this.rawR = new Float32Array(n).fill(-1); // -1 sentinel = "not sampled yet"
      this.rawG = new Float32Array(n).fill(-1);
      this.rawB = new Float32Array(n).fill(-1);

      this.currentElevation = new Float32Array(n);

      this.wavePhase = new Float32Array(n);
      this.waveFrequency = new Float32Array(n);
      this.normX = new Float32Array(n);
      this.normY = new Float32Array(n);
      this.diagHypot = new Float32Array(n); // precomputed hypot(normX-0.5, normY-0.5)

      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          const i = r * gridCols + c;
          this.wavePhase[i] = Math.random() * Math.PI * 2;
          this.waveFrequency[i] = 0.85 + Math.random() * 0.45;
          const nx = c / gridCols;
          const ny = r / gridRows;
          this.normX[i] = nx;
          this.normY[i] = ny;
          this.diagHypot[i] = Math.hypot(nx - 0.5, ny - 0.5);
        }
      }

      if (this.procCanvas) {
        this.procCanvas.width = gridCols;
        this.procCanvas.height = gridRows;
      }
    }

    loadSceneImage() {
      if (!this.scene || !this.scene.url) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        this.sampleImage(img);
      };

      img.onerror = () => {
        const fallback = createProceduralFallback(
          this.scene.fallbackColors,
          this.config.gridCols,
          this.config.gridRows
        );
        this.sampleImage(fallback);
      };

      img.src = this.scene.url;
    }

    sampleImage(source) {
      if (!this.procCtx || !source) return;

      const { gridCols, gridRows, darken } = this.config;
      this.procCtx.clearRect(0, 0, gridCols, gridRows);
      this.procCtx.drawImage(source, 0, 0, gridCols, gridRows);

      const imgData = this.procCtx.getImageData(0, 0, gridCols, gridRows);
      const data = imgData.data;
      const darkenFactor = 1 - darken;

      const n = gridCols * gridRows;
      for (let i = 0; i < n; i++) {
        const idx = i * 4;
        const rr = data[idx];
        const gg = data[idx + 1];
        const bb = data[idx + 2];

        this.rawR[i] = rr;
        this.rawG[i] = gg;
        this.rawB[i] = bb;

        this.targetR[i] = Math.round(rr * darkenFactor);
        this.targetG[i] = Math.round(gg * darkenFactor);
        this.targetB[i] = Math.round(bb * darkenFactor);
      }
    }

    bindEvents() {
      if (this.reanimateBtn) {
        this.reanimateBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.restartAnimation();
        });
      }

      if (this.canvasViewport) {
        this.canvasViewport.addEventListener('click', () => {
          if (this.isStabilized) openLensModal(this.scene);
        });
      }

      if (this.inspectBtn) {
        this.inspectBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.isStabilized) openLensModal(this.scene);
        });
      }
    }

    // ---------------------------------------------------------------
    // Master per-frame entry point.
    // ---------------------------------------------------------------
    render(now) {
      if (!this.dispCanvas || !this.dispCtx) return;

      switch (this.phase) {
        case 'looping':
          this._renderLooping(now);
          break;
        case 'flatten':
          this._renderFlatten(now);
          break;
        case 'blackout':
          this._renderBlackout(now);
          break;
        case 'reveal':
          this._renderReveal(now);
          break;
        case 'done':
          // Static — canvas is no longer redrawn; the <img> overlay is the
          // visible resting frame. Nothing to do here.
          break;
      }
    }

    _renderLooping(now) {
      if (this.statusText && !this.targetImageReady) {
        this.statusText.textContent = 'Generating image...';
      }
      if (this.countdownSpan) this.countdownSpan.textContent = '...';

      this.elevationScale = 1.0; // full ambient elevation while looping
      this._stepPhysics(now, 0 /* flattenFactor */, true /* wavesActive */);
      this._draw({ blackout: 0, revealMode: false });
    }

    _renderFlatten(now) {
      // Smoothly ease elevation scale to 0 — independent, uninterrupted.
      this.elevationScale += (0 - this.elevationScale) * 0.06;

      // flattenFactor 1 => colors settle fully onto the real-image raw colors
      this._stepPhysics(now, 1, true /* wavesActive */);
      this._draw({ blackout: 0, revealMode: false });

      if (this.elevationScale < 0.01 && this._runningMaxElevation < 0.15) {
        this._beginBlackout();
      }
    }

    _renderBlackout(now) {
      const elapsed = now - this.phaseStart;
      const dur = 420;
      const p = Math.min(1, elapsed / dur);
      this.blackoutAlpha = p * p * (3 - 2 * p); // smoothstep

      this._stepPhysics(now, 1, false /* wavesActive */);
      this._draw({ blackout: this.blackoutAlpha, revealMode: false });

      if (p >= 1) this._beginReveal();
    }

    _renderReveal(now) {
      const elapsed = now - this.phaseStart;
      let allDone = true;

      const n = this.cellCount;
      const delay = this.revealDelay;
      const dur = this.revealDur;
      const progress = this.revealProgress;

      for (let i = 0; i < n; i++) {
        const local = elapsed - delay[i];
        if (local <= 0) {
          progress[i] = 0;
          allDone = false;
        } else {
          const p = local / dur[i];
          if (p < 1) {
            progress[i] = p * p * (3 - 2 * p);
            allDone = false;
          } else {
            progress[i] = 1;
          }
        }
      }

      // No elevation, no wave motion during reveal — pixels are flat and
      // fading in from black, so the physics step only settles color.
      this._stepPhysics(now, 1, false /* wavesActive */);
      this._draw({ blackout: 0, revealMode: true });

      if (allDone) this._finish();
    }

    // Shared per-cell wave/color physics, flat-array version.
    // flattenFactor blends between the "raw" real-image color (1) and
    // darkened preview-driven target color (0). wavesActive toggles the
    // elevation wave computation off during blackout/reveal (elevation is
    // simply eased to 0), skipping trig work entirely in those phases.
    _stepPhysics(now, flattenFactor, wavesActive) {
      const n = this.cellCount;
      const { maxElevation, elevationSmoothing } = this.config;
      const t = (now - this.animStart) * 0.0016;
      const elevScale = this.elevationScale;

      const curR = this.curR, curG = this.curG, curB = this.curB;
      const targetR = this.targetR, targetG = this.targetG, targetB = this.targetB;
      const rawR = this.rawR, rawG = this.rawG, rawB = this.rawB;
      const currentElevation = this.currentElevation;

      let runningMax = 0;

      if (wavesActive) {
        const wavePhase = this.wavePhase, waveFrequency = this.waveFrequency;
        const normX = this.normX, normY = this.normY, diagHypot = this.diagHypot;

        for (let i = 0; i < n; i++) {
          // --- color lerp ---
          if (rawR[i] >= 0) {
            const dR = targetR[i] + (rawR[i] - targetR[i]) * flattenFactor;
            const dG = targetG[i] + (rawG[i] - targetG[i]) * flattenFactor;
            const dB = targetB[i] + (rawB[i] - targetB[i]) * flattenFactor;
            curR[i] += (dR - curR[i]) * 0.08;
            curG[i] += (dG - curG[i]) * 0.08;
            curB[i] += (dB - curB[i]) * 0.08;
          } else {
            curR[i] += (targetR[i] - curR[i]) * 0.08;
            curG[i] += (targetG[i] - curG[i]) * 0.08;
            curB[i] += (targetB[i] - curB[i]) * 0.08;
          }

          // --- elevation wave ---
          const ph = wavePhase[i];
          const wave1 = Math.sin(normX[i] * 5.2 + t * waveFrequency[i] + ph);
          const wave2 = Math.cos(normY[i] * 4.8 - t * 0.9 + ph);
          const wave3 = Math.sin(diagHypot[i] * 8.2 - t * 1.4);

          let elevationFactor = (wave1 + wave2 + wave3) / 2.8;
          if (elevationFactor < 0) elevationFactor = 0;
          // x^1.4 approximated cheaply as x * sqrt(x) * x^-0.1-ish curve is
          // not worth the complexity here; sqrt-based smoothstep-like curve
          // (x * sqrt(x)) is close in shape and ~3x cheaper than Math.pow.
          elevationFactor = elevationFactor * Math.sqrt(elevationFactor);

          const luminance = (curR[i] + curG[i] + curB[i]) * 0.0013071895; // /(3*255)
          const targetElev = elevationFactor * maxElevation * (0.6 + luminance * 0.7) * elevScale;

          const ce = currentElevation[i] + (targetElev - currentElevation[i]) * elevationSmoothing;
          currentElevation[i] = ce;
          if (ce > runningMax) runningMax = ce;
        }
      } else {
        // Elevation eases straight to 0; no trig, no wave lookup tables touched.
        for (let i = 0; i < n; i++) {
          if (rawR[i] >= 0) {
            const dR = targetR[i] + (rawR[i] - targetR[i]) * flattenFactor;
            const dG = targetG[i] + (rawG[i] - targetG[i]) * flattenFactor;
            const dB = targetB[i] + (rawB[i] - targetB[i]) * flattenFactor;
            curR[i] += (dR - curR[i]) * 0.08;
            curG[i] += (dG - curG[i]) * 0.08;
            curB[i] += (dB - curB[i]) * 0.08;
          } else {
            curR[i] += (targetR[i] - curR[i]) * 0.08;
            curG[i] += (targetG[i] - curG[i]) * 0.08;
            curB[i] += (targetB[i] - curB[i]) * 0.08;
          }

          const ce = currentElevation[i] * 0.8; // *= (1 - 0.2)
          currentElevation[i] = ce;
          if (ce > runningMax) runningMax = ce;
        }
      }

      this._runningMaxElevation = runningMax;
    }

    _recomputeLayout(displayWidth, displayHeight) {
      const { gridCols, gridRows, gapRatio } = this.config;
      const cellSize = Math.max(displayWidth / gridCols, displayHeight / gridRows);
      const gap = cellSize * gapRatio;
      const gridWidth = cellSize * gridCols;
      const gridHeight = cellSize * gridRows;

      this._cellSize = cellSize;
      this._gap = gap;
      this._offsetX0 = (displayWidth - gridWidth) / 2;
      this._offsetY0 = (displayHeight - gridHeight) / 2;
      this._layoutW = displayWidth;
      this._layoutH = displayHeight;
    }

    // Single clean draw pass. `opts.blackout` fades the whole scene toward
    // solid black; `opts.revealMode` masks each cell by its own reveal
    // progress (0 = hidden/black, 1 = fully visible). Cells are painted once.
    _draw(opts) {
      const {
        gridCols, gridRows, backgroundColor, borderColor, borderOpacity
      } = this.config;

      const blackout = opts?.blackout || 0;
      const revealMode = !!opts?.revealMode;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const displayWidth = this.dispCanvas.clientWidth;
      const displayHeight = this.dispCanvas.clientHeight;

      const pixelW = Math.floor(displayWidth * dpr);
      const pixelH = Math.floor(displayHeight * dpr);
      if (this.dispCanvas.width !== pixelW || this.dispCanvas.height !== pixelH) {
        this.dispCanvas.width = pixelW;
        this.dispCanvas.height = pixelH;
        this._layoutW = -1; // force layout recompute below
      }

      const ctx = this.dispCtx;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      if (this._layoutW !== displayWidth || this._layoutH !== displayHeight) {
        this._recomputeLayout(displayWidth, displayHeight);
      }

      const cellSize = this._cellSize;
      const gap = this._gap;
      const cellDraw = cellSize - gap;
      const offsetX0 = this._offsetX0;
      const offsetY0 = this._offsetY0;

      const curR = this.curR, curG = this.curG, curB = this.curB;
      const currentElevation = this.currentElevation;
      const revealProgress = this.revealProgress;

      const borderR = borderColor.r, borderG = borderColor.g, borderB = borderColor.b;

      for (let r = 0; r < gridRows; r++) {
        const rowOffsetY = offsetY0 + r * cellSize;
        const rowBase = r * gridCols;

        for (let c = 0; c < gridCols; c++) {
          const i = rowBase + c;

          const cellAlpha = revealMode ? revealProgress[i] : 1;
          if (cellAlpha <= CELL_HIDDEN_EPS) continue; // fully hidden — skip entirely

          const elevation = currentElevation[i];
          const x = offsetX0 + c * cellSize;
          const y = rowOffsetY;

          if (cellAlpha < 1) ctx.globalAlpha = cellAlpha;

          const drawSolid = elevation > ELEVATION_DRAW_EPS;

          if (drawSolid) {
            const offX = -elevation * 1.15;
            const offY = -elevation * 1.65;
            const cr = curR[i], cg = curG[i], cb = curB[i];

            // Drop shadow
            const shadowAlpha = elevation * 0.04;
            if (shadowAlpha > 0.01) {
              ctx.fillStyle = shadowAlpha > 0.65
                ? 'rgba(0,0,0,0.65)'
                : `rgba(0,0,0,${shadowAlpha})`;
              ctx.fillRect(
                x + gap / 2 + elevation * 1.3,
                y + gap / 2 + elevation * 1.9,
                cellDraw,
                cellDraw
              );
            }

            // Extruded 3D side bevels — two triangles sharing fill state
            ctx.fillStyle = `rgb(${Math.max(0, cr - 80) | 0},${Math.max(0, cg - 80) | 0},${Math.max(0, cb - 80) | 0})`;
            ctx.beginPath();
            ctx.moveTo(x + cellSize - gap / 2 + offX, y + gap / 2 + offY);
            ctx.lineTo(x + cellSize - gap / 2, y + gap / 2);
            ctx.lineTo(x + cellSize - gap / 2, y + cellSize - gap / 2);
            ctx.lineTo(x + cellSize - gap / 2 + offX, y + cellSize - gap / 2 + offY);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = `rgb(${Math.max(0, cr - 50) | 0},${Math.max(0, cg - 50) | 0},${Math.max(0, cb - 50) | 0})`;
            ctx.beginPath();
            ctx.moveTo(x + gap / 2 + offX, y + cellSize - gap / 2 + offY);
            ctx.lineTo(x + gap / 2, y + cellSize - gap / 2);
            ctx.lineTo(x + cellSize - gap / 2, y + cellSize - gap / 2);
            ctx.lineTo(x + cellSize - gap / 2 + offX, y + cellSize - gap / 2 + offY);
            ctx.closePath();
            ctx.fill();

            // Top face
            const brightness = 1 + elevation * 0.05;
            const fr = Math.min(255, (cr * brightness) | 0);
            const fg = Math.min(255, (cg * brightness) | 0);
            const fb = Math.min(255, (cb * brightness) | 0);
            ctx.fillStyle = `rgb(${fr},${fg},${fb})`;
            ctx.fillRect(x + gap / 2 + offX, y + gap / 2 + offY, cellDraw, cellDraw);

            const borderAlpha = borderOpacity + elevation * 0.008;
            if (borderAlpha > BORDER_ALPHA_EPS) {
              ctx.strokeStyle = `rgba(${borderR},${borderG},${borderB},${borderAlpha})`;
              ctx.lineWidth = 0.6;
              ctx.strokeRect(x + gap / 2 + offX, y + gap / 2 + offY, cellDraw, cellDraw);
            }
          } else {
            // Flat/near-flat cell: single fillRect, no path construction,
            // no shadow, no bevels — this is the common case once the grid
            // has calmed (flatten/blackout/reveal phases) and a large
            // fraction of frames while looping too.
            const fr = curR[i] | 0, fg = curG[i] | 0, fb = curB[i] | 0;
            ctx.fillStyle = `rgb(${fr},${fg},${fb})`;
            ctx.fillRect(x + gap / 2, y + gap / 2, cellDraw, cellDraw);

            if (borderOpacity > BORDER_ALPHA_EPS) {
              ctx.strokeStyle = `rgba(${borderR},${borderG},${borderB},${borderOpacity})`;
              ctx.lineWidth = 0.6;
              ctx.strokeRect(x + gap / 2, y + gap / 2, cellDraw, cellDraw);
            }
          }

          if (cellAlpha < 1) ctx.globalAlpha = 1;
        }
      }

      // Blackout is drawn ONCE, on top of everything, as the final step —
      // never combined with revealMode (they are mutually exclusive phases).
      if (blackout > 0.001) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(3, 3, 3, ${blackout})`;
        ctx.fillRect(0, 0, displayWidth, displayHeight);
      }
    }
  }

  // --- Master 60FPS Render Loop (single loop for all cards) ---
  let isLoopRunning = false;
  function masterLoop(now) {
    activeEngines.forEach((eng) => eng.render(now));
    requestAnimationFrame(masterLoop);
  }

  function startMasterLoop() {
    if (!isLoopRunning) {
      isLoopRunning = true;
      requestAnimationFrame(masterLoop);
    }
  }

  // --- Lightbox Magnifying Lens Modal Controller ---
  const LENS_SIZE = 170;
  const ZOOM_SCALE = 1.8;

  function getModalElements() {
    return {
      backdrop: document.getElementById('lensModalBackdrop'),
      card: document.getElementById('lensModalCard'),
      closeBtn: document.getElementById('lensModalCloseBtn'),
      badgeTitle: document.getElementById('modalBadgeTitle'),
      stage: document.getElementById('modalLensStage'),
      baseImg: document.getElementById('modalLensBaseImg'),
      zoomLayer: document.getElementById('modalLensZoomLayer'),
      zoomInner: document.getElementById('modalLensZoomInner'),
      zoomImg: document.getElementById('modalLensZoomImg'),
      ring: document.getElementById('modalLensRing')
    };
  }

  function openLensModal(scene) {
    if (!scene) return;
    const dom = getModalElements();

    if (dom.baseImg) {
      dom.baseImg.src = scene.url;
      dom.baseImg.alt = scene.name || 'HD Image';
    }
    if (dom.zoomImg) {
      dom.zoomImg.src = scene.url;
      dom.zoomImg.alt = scene.name || 'HD Image';
    }
    if (dom.badgeTitle) {
      dom.badgeTitle.textContent = scene.name || 'Synthesized Scene';
    }

    if (dom.backdrop) {
      dom.backdrop.classList.add('active');
      dom.backdrop.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeLensModal() {
    const dom = getModalElements();
    if (dom.backdrop) {
      dom.backdrop.classList.remove('active');
      dom.backdrop.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
    if (dom.zoomLayer) dom.zoomLayer.classList.remove('active');
    if (dom.ring) dom.ring.classList.remove('active');
  }

  function handleLensMove(e) {
    const dom = getModalElements();
    if (!dom.stage || !dom.zoomLayer || !dom.zoomInner) return;

    const rect = dom.stage.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const radius = LENS_SIZE / 2;
    const mask = `radial-gradient(circle ${radius}px at ${x}px ${y}px, black 100%, transparent 100%)`;

    dom.zoomLayer.style.maskImage = mask;
    dom.zoomLayer.style.webkitMaskImage = mask;
    dom.zoomLayer.style.transformOrigin = `${x}px ${y}px`;

    dom.zoomInner.style.transformOrigin = `${x}px ${y}px`;
    dom.zoomInner.style.transform = `scale(${ZOOM_SCALE})`;

    if (dom.ring) {
      dom.ring.style.left = `${x}px`;
      dom.ring.style.top = `${y}px`;
    }
  }

  function setupModalEvents() {
    const dom = getModalElements();

    if (dom.stage) {
      dom.stage.addEventListener('mouseenter', (e) => {
        if (dom.zoomLayer) dom.zoomLayer.classList.add('active');
        if (dom.ring) dom.ring.classList.add('active');
        handleLensMove(e);
      });

      dom.stage.addEventListener('mousemove', (e) => {
        handleLensMove(e);
      });

      dom.stage.addEventListener('mouseleave', () => {
        if (dom.zoomLayer) dom.zoomLayer.classList.remove('active');
        if (dom.ring) dom.ring.classList.remove('active');
      });
    }

    if (dom.closeBtn) {
      dom.closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeLensModal();
      });
    }

    if (dom.backdrop) {
      dom.backdrop.addEventListener('click', (e) => {
        if (e.target === dom.backdrop) closeLensModal();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLensModal();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupModalEvents();
    startMasterLoop();
  });

  // Export to global scope
  window.AURAPixelGrid = {
    IMAGES,
    PixelEngineInstance,
    activeEngines,
    startMasterLoop,
    openLensModal,
    closeLensModal
  };

})();