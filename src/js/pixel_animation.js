/**
 * AURA — 3D Isometric Pixel Grid Simulation & Lens Inspector Module
 * Standalone Engine for voxel elevation waves, stabilization, and magnifying inspection.
 */

(function () {
  'use strict';

  // --- Curated Image Scenes Library (Landscape Aspect Ratios) ---
  const SCENE_LIBRARY = [
    {
      url: '/images/earth.jpeg',
      fallbackColors: ['#3f3529', '#a48455', '#dcd4c6', '#1a1714']
    },
    {
      url: '/images/rich_house.png',
      fallbackColors: ['#1e3a5f', '#f97316', '#e0e7ff', '#1f2937']
    },
    {
      url: '/images/space.png',
      fallbackColors: ['#064e3b', '#10b981', '#065f46', '#022c22']
    },
    {
      url: '/images/trees_nature.png',
      fallbackColors: ['#0284c7', '#06b6d4', '#10b981', '#030712']
    },
    {
      url: '/images/waterfall.png',
      fallbackColors: ['#9a3412', '#ea580c', '#fb923c', '#431407']
    }
  ];

  // Active running card engines
  const activeEngines = [];

  // Match prompt to scene or pick random
  function matchSceneFromPrompt(promptText) {
    return SCENE_LIBRARY[Math.floor(Math.random() * SCENE_LIBRARY.length)];
  }

  // --- Procedural Fallback Generator (Handles local CORS safety) ---
  function createProceduralFallback(colors, cols, rows) {
    const c = document.createElement('canvas');
    c.width = cols;
    c.height = rows;
    const ctx = c.getContext('2d');
    if (!ctx) return c;

    const grad = ctx.createLinearGradient(0, 0, cols, rows);
    colors.forEach((col, i) => {
      grad.addColorStop(i / (colors.length - 1), col);
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

      this.dispCtx = this.dispCanvas?.getContext('2d');
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

      this.pixelGrid = [];
      this.isStabilized = false;
      this.startTime = performance.now();
      this.durationMs = 5000; // 5 seconds of 3D animation
      this.targetElevationScale = 1.0;
      this.currentElevationScale = 1.0;

      this.initGrid();
      this.loadSceneImage();
      this.bindEvents();
    }

    initGrid() {
      const { gridCols, gridRows } = this.config;
      this.pixelGrid = Array.from({ length: gridRows }, () =>
        Array.from({ length: gridCols }, () => ({
          r: 25,
          g: 25,
          b: 25,
          targetR: 25,
          targetG: 25,
          targetB: 25,
          targetElevation: 0,
          currentElevation: 0,
          phase: Math.random() * Math.PI * 2,
          frequency: 0.85 + Math.random() * 0.45,
        }))
      );

      if (this.procCanvas) {
        this.procCanvas.width = gridCols;
        this.procCanvas.height = gridRows;
      }
    }

    loadSceneImage() {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        this.sampleImage(img);
        if (this.overlayImg) {
          this.overlayImg.src = this.scene.url;
        }
      };

      img.onerror = () => {
        const fallback = createProceduralFallback(
          this.scene.fallbackColors,
          this.config.gridCols,
          this.config.gridRows
        );
        this.sampleImage(fallback);
        if (this.overlayImg) {
          this.overlayImg.src = fallback.toDataURL();
        }
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

      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          const idx = (r * gridCols + c) * 4;
          const cell = this.pixelGrid[r]?.[c];
          if (!cell) continue;

          cell.rawR = data[idx];
          cell.rawG = data[idx + 1];
          cell.rawB = data[idx + 2];

          cell.targetR = Math.round(data[idx] * darkenFactor);
          cell.targetG = Math.round(data[idx + 1] * darkenFactor);
          cell.targetB = Math.round(data[idx + 2] * darkenFactor);
        }
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
          if (this.isStabilized) {
            openLensModal(this.scene);
          }
        });
      }

      if (this.inspectBtn) {
        this.inspectBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.isStabilized) {
            openLensModal(this.scene);
          }
        });
      }
    }

    restartAnimation() {
      this.isStabilized = false;
      this.startTime = performance.now();
      this.targetElevationScale = 1.0;

      this.cardElement.classList.remove('is-stabilized');
      if (this.inspectBtn) {
        this.inspectBtn.classList.remove('visible');
      }
      if (this.overlayImg) {
        this.overlayImg.classList.remove('visible');
      }
      if (this.statusBadge) {
        this.statusBadge.classList.remove('stabilized');
      }
      if (this.statusText) {
        this.statusText.textContent = 'Synthesizing 3D Voxels...';
      }
      if (this.countdownSpan) {
        this.countdownSpan.style.display = 'inline-block';
      }
    }

    render(now) {
      if (!this.dispCanvas || !this.dispCtx) return;

      const elapsed = now - this.startTime;
      const remainingMs = Math.max(0, this.durationMs - elapsed);

      // Stage 2: Elevation flattening factor (0 to 1 between 3.8s and 5.0s)
      let flattenFactor = 0;
      if (elapsed > 3800) {
        const p = Math.min(1, (elapsed - 3800) / 1200);
        flattenFactor = p * p * (3 - 2 * p);
      }

      // Stage 3: Grid dissolution wave progress (0 to 1 between 5.0s and 6.8s)
      let gridRemovalProgress = 0;
      if (elapsed > 5000) {
        gridRemovalProgress = Math.min(1, (elapsed - 5000) / 1600);
      }

      // Status UI trigger at 5.0s
      if (!this.isStabilized) {
        if (remainingMs > 0) {
          const secondsLeft = (remainingMs / 1000).toFixed(1);
          if (this.countdownSpan) {
            this.countdownSpan.textContent = `${secondsLeft}s`;
          }
          if (elapsed > 4000 && this.statusText) {
            this.statusText.textContent = 'Flattening to 2D pixel grid...';
          }
        } else {
          this.isStabilized = true;
          this.cardElement.classList.add('is-stabilized');
          if (this.inspectBtn) {
            this.inspectBtn.classList.add('visible');
          }
          if (this.overlayImg) {
            this.overlayImg.classList.add('visible');
          }
          if (this.statusBadge) {
            this.statusBadge.classList.add('stabilized');
          }
          if (this.statusText) {
            this.statusText.textContent = '✓ HD Image Stabilized';
          }
          if (this.countdownSpan) {
            this.countdownSpan.textContent = 'Clean';
          }
        }
      }

      // Smooth decay of elevation scale
      this.targetElevationScale = 1.0 - flattenFactor;
      this.currentElevationScale += (this.targetElevationScale - this.currentElevationScale) * 0.08;

      const {
        gridCols,
        gridRows,
        maxElevation,
        elevationSmoothing,
        gapRatio,
        backgroundColor,
        borderColor,
        borderOpacity,
      } = this.config;

      const t = now * 0.0016;

      // 1. Calculate kinetic voxel physics & progressive color restoration
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          const cell = this.pixelGrid[r]?.[c];
          if (!cell) continue;

          if (cell.rawR !== undefined) {
            const desiredR = cell.targetR + (cell.rawR - cell.targetR) * flattenFactor;
            const desiredG = cell.targetG + (cell.rawG - cell.targetG) * flattenFactor;
            const desiredB = cell.targetB + (cell.rawB - cell.targetB) * flattenFactor;
            cell.r += (desiredR - cell.r) * 0.08;
            cell.g += (desiredG - cell.g) * 0.08;
            cell.b += (desiredB - cell.b) * 0.08;
          } else {
            cell.r += (cell.targetR - cell.r) * 0.08;
            cell.g += (cell.targetG - cell.g) * 0.08;
            cell.b += (cell.targetB - cell.b) * 0.08;
          }

          const normX = c / gridCols;
          const normY = r / gridRows;

          const wave1 = Math.sin(normX * 5.2 + t * cell.frequency + cell.phase);
          const wave2 = Math.cos(normY * 4.8 - t * 0.9 + cell.phase);
          const wave3 = Math.sin(Math.hypot(normX - 0.5, normY - 0.5) * 8.2 - t * 1.4);

          let elevationFactor = (wave1 + wave2 + wave3) / 2.8;
          elevationFactor = Math.max(0, elevationFactor);
          elevationFactor = Math.pow(elevationFactor, 1.4);

          const luminance = (cell.r + cell.g + cell.b) / (3 * 255);
          cell.targetElevation =
            elevationFactor * maxElevation * (0.6 + luminance * 0.7) * this.currentElevationScale;

          cell.currentElevation += (cell.targetElevation - cell.currentElevation) * elevationSmoothing;
        }
      }

      // 2. Setup Canvas resolution
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const displayWidth = this.dispCanvas.clientWidth;
      const displayHeight = this.dispCanvas.clientHeight;

      if (
        this.dispCanvas.width !== Math.floor(displayWidth * dpr) ||
        this.dispCanvas.height !== Math.floor(displayHeight * dpr)
      ) {
        this.dispCanvas.width = Math.floor(displayWidth * dpr);
        this.dispCanvas.height = Math.floor(displayHeight * dpr);
      }

      this.dispCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.dispCtx.fillStyle = backgroundColor;
      this.dispCtx.fillRect(0, 0, displayWidth, displayHeight);

      const cellSize = Math.max(displayWidth / gridCols, displayHeight / gridRows);
      const baseGap = cellSize * gapRatio;
      
      const gridWidth = cellSize * gridCols;
      const gridHeight = cellSize * gridRows;
      const offsetXGrid = (displayWidth - gridWidth) / 2;
      const offsetYGrid = (displayHeight - gridHeight) / 2;

      // 3. Render 3D Voxels / 2D Stabilized Grid / Animated Grid Removal
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          const cell = this.pixelGrid[r]?.[c];
          if (!cell) continue;

          const diagPos = (r / gridRows) * 0.7 + (c / gridCols) * 0.3;
          const cellDissolve = Math.max(0, Math.min(1, (gridRemovalProgress * 1.5 - diagPos) * 2.5));

          const currentCellGap = baseGap * (1 - cellDissolve);
          const cellBorderAlpha = borderOpacity * (1 - cellDissolve);

          const x = offsetXGrid + c * cellSize;
          const y = offsetYGrid + r * cellSize;
          const elevation = cell.currentElevation;

          const offsetX = -elevation * 1.15;
          const offsetY = -elevation * 1.65;

          // Drop shadow
          if (elevation > 0.3) {
            const shadowAlpha = Math.min(0.65, elevation * 0.04) * (1 - flattenFactor * 0.9);
            this.dispCtx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
            this.dispCtx.fillRect(
              x + currentCellGap / 2 + elevation * 1.3,
              y + currentCellGap / 2 + elevation * 1.9,
              cellSize - currentCellGap,
              cellSize - currentCellGap
            );
          }

          // Extruded 3D Side Bevels
          if (elevation > 0.3) {
            // Right Side Face
            this.dispCtx.fillStyle = `rgb(${Math.max(0, cell.r - 80)}, ${Math.max(0, cell.g - 80)}, ${Math.max(0, cell.b - 80)})`;
            this.dispCtx.beginPath();
            this.dispCtx.moveTo(x + cellSize - currentCellGap / 2 + offsetX, y + currentCellGap / 2 + offsetY);
            this.dispCtx.lineTo(x + cellSize - currentCellGap / 2, y + currentCellGap / 2);
            this.dispCtx.lineTo(x + cellSize - currentCellGap / 2, y + cellSize - currentCellGap / 2);
            this.dispCtx.lineTo(x + cellSize - currentCellGap / 2 + offsetX, y + cellSize - currentCellGap / 2 + offsetY);
            this.dispCtx.closePath();
            this.dispCtx.fill();

            // Bottom Side Face
            this.dispCtx.fillStyle = `rgb(${Math.max(0, cell.r - 50)}, ${Math.max(0, cell.g - 50)}, ${Math.max(0, cell.b - 50)})`;
            this.dispCtx.beginPath();
            this.dispCtx.moveTo(x + currentCellGap / 2 + offsetX, y + cellSize - currentCellGap / 2 + offsetY);
            this.dispCtx.lineTo(x + currentCellGap / 2, y + cellSize - currentCellGap / 2);
            this.dispCtx.lineTo(x + cellSize - currentCellGap / 2, y + cellSize - currentCellGap / 2);
            this.dispCtx.lineTo(x + cellSize - currentCellGap / 2 + offsetX, y + cellSize - currentCellGap / 2 + offsetY);
            this.dispCtx.closePath();
            this.dispCtx.fill();
          }

          // Top Face / Flat 2D Pixel Block
          const brightness = 1 + elevation * 0.05;
          const finalR = Math.min(255, Math.round(cell.r * brightness));
          const finalG = Math.min(255, Math.round(cell.g * brightness));
          const finalB = Math.min(255, Math.round(cell.b * brightness));

          this.dispCtx.fillStyle = `rgb(${finalR}, ${finalG}, ${finalB})`;
          const weldPadding = cellDissolve > 0.8 ? 0.6 : 0;
          this.dispCtx.fillRect(
            x + currentCellGap / 2 + offsetX - weldPadding / 2,
            y + currentCellGap / 2 + offsetY - weldPadding / 2,
            cellSize - currentCellGap + weldPadding,
            cellSize - currentCellGap + weldPadding
          );

          // Grid Top Stroke Line
          if (cellBorderAlpha > 0.005) {
            this.dispCtx.strokeStyle = `rgba(${borderColor.r}, ${borderColor.g}, ${borderColor.b}, ${cellBorderAlpha + elevation * 0.008})`;
            this.dispCtx.lineWidth = 0.6;
            this.dispCtx.strokeRect(
              x + currentCellGap / 2 + offsetX,
              y + currentCellGap / 2 + offsetY,
              cellSize - currentCellGap,
              cellSize - currentCellGap
            );
          }
        }
      }
    }
  }

  // --- Master 60FPS Render Loop ---
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
  const LENS_SIZE = 170; // Compact, refined diameter in px of circular magnifier
  const ZOOM_SCALE = 1.8; // Optical magnification factor

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
    if (dom.zoomLayer) {
      dom.zoomLayer.classList.remove('active');
    }
    if (dom.ring) {
      dom.ring.classList.remove('active');
    }
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
        if (e.target === dom.backdrop) {
          closeLensModal();
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeLensModal();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupModalEvents();
    startMasterLoop();
  });

  // Export to global scope
  window.AURAPixelGrid = {
    SCENE_LIBRARY,
    matchSceneFromPrompt,
    PixelEngineInstance,
    activeEngines,
    startMasterLoop,
    openLensModal,
    closeLensModal
  };

})();
