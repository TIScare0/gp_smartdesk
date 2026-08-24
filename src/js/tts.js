/**
 * AURA — Text to Speech
 * ---------------------------------------------------------------------
 * One card, three steps (input -> progress -> playback).
 *
 * Playback bars are driven by the Web Audio API AnalyserNode reading
 * REAL frequency data out of fake_sound.mp3 as it plays — every bar's
 * height each frame comes straight from the audio signal, not a canned
 * animation. That's what makes it look like an actual waveform instead
 * of a decorative loop. Duration, play/pause/ended all come from the
 * <audio> element itself, so it always matches the real file exactly.
 * ---------------------------------------------------------------------
 * WHEN YOU'RE READY TO GO REAL (real TTS instead of fake_sound.mp3):
 * Just swap ttsAudio.src for the returned audio URL/blob before calling
 * play(). The analyser/visualizer code needs zero changes — it reacts
 * to whatever audio is actually playing through the element.
 * ---------------------------------------------------------------------
 */

(function () {
  "use strict";

  const DOM = {
    steps: {
      input: document.getElementById("stepInput"),
      progress: document.getElementById("stepProgress"),
      playback: document.getElementById("stepPlayback"),
    },

    textArea: document.getElementById("ttsTextArea"),
    charCount: document.getElementById("ttsCharCount"),
    voiceSelect: document.getElementById("ttsVoiceSelect"),
    convertBtn: document.getElementById("ttsConvertBtn"),

    progressFill: document.getElementById("ttsProgressFill"),
    progressPct: document.getElementById("ttsProgressPct"),

    playbackVisual: document.getElementById("ttsPlaybackVisual"),
    playbackStatus: document.getElementById("ttsPlaybackStatus"),
    playBtn: document.getElementById("ttsPlayBtn"),
    playLabel: document.getElementById("ttsPlayLabel"),
    stopBtn: document.getElementById("ttsStopBtn"),

    liveBars: Array.from(document.querySelectorAll("#ttsLiveBars .tts-bar")),

    audio: document.getElementById("ttsAudio"),
    toastContainer: document.getElementById("toastContainer"),

    timeCurrent: document.getElementById("ttsTimeCurrent"),
    timeDuration: document.getElementById("ttsTimeDuration"),
    timeTrack: document.getElementById("ttsTimeTrack"),
    timeFill: document.getElementById("ttsTimeFill"),
  };

  let progressTimer = null;

  // ---------- Web Audio setup (created lazily on first user gesture) ----------
  let audioCtx = null;
  let analyser = null;
  let sourceNode = null;
  let freqData = null;
  let rafId = null;
  const BAR_COUNT = DOM.liveBars.length;
  const barLevels = new Array(BAR_COUNT).fill(0); // smoothed per-bar values, 0..1

  function ensureAudioGraph() {
    if (audioCtx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return; // very old browser — bars just stay flat, playback still works

    audioCtx = new AudioCtx();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128; // 64 frequency bins — plenty for 24 bars
    analyser.smoothingTimeConstant = 0.75; // analyser's own smoothing, layered with ours below
    freqData = new Uint8Array(analyser.frequencyBinCount);

    sourceNode = audioCtx.createMediaElementSource(DOM.audio);
    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);
  }

  // Map the analyser's frequency bins onto our bars, low freq in the middle
  // fanning out to high freq at the edges — reads more like a real voice
  // waveform than a flat left-to-right sweep.
  function renderBars() {
    if (!analyser) return;
    analyser.getByteFrequencyData(freqData);

    const bins = freqData.length;
    const mid = (BAR_COUNT - 1) / 2;

    for (let i = 0; i < BAR_COUNT; i++) {
      const distFromMid = Math.abs(i - mid) / mid; // 0 (center) .. 1 (edges)
      const binIndex = Math.floor(distFromMid * (bins * 0.6)); // weight toward lower/mid freqs
      const raw = freqData[Math.min(binIndex, bins - 1)] / 255; // 0..1

      // exponential smoothing so bars ease rather than jitter frame to frame
      barLevels[i] = barLevels[i] * 0.62 + raw * 0.38;

      const px = 3 + barLevels[i] * 30; // 3px..33px
      DOM.liveBars[i].style.height = `${px.toFixed(1)}px`;
    }

    rafId = requestAnimationFrame(renderBars);
  }

  function startVisualizer() {
    ensureAudioGraph();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(renderBars);
  }

  function stopVisualizer(collapse) {
    cancelAnimationFrame(rafId);
    rafId = null;
    if (collapse) {
      barLevels.fill(0);
      DOM.liveBars.forEach((bar) => {
        bar.style.height = "3px";
      });
    }
    // if not collapsing (pause), bars just stop updating and freeze in place
  }

  // ---------- Step switching ----------
  function showStep(name) {
    Object.entries(DOM.steps).forEach(([key, el]) => {
      if (key === name) {
        el.setAttribute("data-active", "true");
      } else {
        el.removeAttribute("data-active");
      }
    });
  }

  async function loadVoices() {
    console.log("[TTS] Waiting for Python API...");

    try {
      const bridge = await window.web_api_ready;

      console.log("[TTS] Python API received:", bridge);

      const voices = await bridge.load_voices();

      console.log("[TTS] Voices received:", voices);

      DOM.voiceSelect.innerHTML = "";

      for (const voice of voices) {
        const option = document.createElement("option");

        option.value = voice;
        option.textContent = voice;

        DOM.voiceSelect.appendChild(option);
      }

      updateConvertButtonState();
    } catch (error) {
      console.error("[TTS] Failed to load voices:", error);

      DOM.voiceSelect.innerHTML =
        '<option value="">Failed to load voices</option>';

      updateConvertButtonState();
    }
  }

  loadVoices();

  function updateConvertButtonState() {
    const hasText = DOM.textArea.value.trim().length > 0;
    const hasVoice = DOM.voiceSelect.value !== "";
    DOM.convertBtn.disabled = !hasText || !hasVoice;
  }

  DOM.textArea.addEventListener("input", () => {
    DOM.charCount.textContent = DOM.textArea.value.length;
    updateConvertButtonState();
  });

  DOM.voiceSelect.addEventListener("change", updateConvertButtonState);

  // ---------- Step 1 -> Step 2: Convert ----------
  DOM.convertBtn.addEventListener("click", () => {
    const text = DOM.textArea.value.trim();
    if (!text) {
      showToast("Enter some text first");
      return;
    }
    // Create/resume the audio graph now, inside the click gesture,
    // so autoplay + analyser both work reliably.
    ensureAudioGraph();
    startGeneration(text);
  });

  async function startGeneration(text) {
    const webapi = window.web_api;

    if (!webapi) {
      showToast("Python API isn't ready");
      return;
    }

    showStep("progress");

    DOM.progressFill.style.width = "0%";
    DOM.progressPct.textContent = "0%";

    clearInterval(progressTimer);

    let pct = 0;

    // Estimated progress.
    // Never reaches 100% by itself.
    progressTimer = setInterval(() => {
      if (pct < 90) {
        pct += pct < 50 ? 2 : 0.5;
        pct = Math.min(pct, 90);

        DOM.progressFill.style.width = `${pct}%`;
        DOM.progressPct.textContent = `${Math.round(pct)}%`;
      }
    }, 100);

    try {
      // REAL Piper generation
      const audioData = await webapi.txt2audio(text);

      clearInterval(progressTimer);
      progressTimer = null;

      if (!audioData?.status) {
        showToast(audioData?.error || "Audio generation failed");
        showStep("input");
        return;
      }

      // Only Python completion can produce 100%
      DOM.progressFill.style.width = "100%";
      DOM.progressPct.textContent = "100%";

      // Give the UI a moment to show 100%
      await new Promise((resolve) => setTimeout(resolve, 200));

      goToPlayback(audioData.response);
    } catch (error) {
      clearInterval(progressTimer);
      progressTimer = null;

      console.error("TTS generation error:", error);

      showToast(error?.message || "Audio generation failed");
      showStep("input");
    }
  }

  function goToPlayback(audioPath) {
    if (!audioPath) {
      showToast("No audio file returned");
      showStep("input");
      return;
    }

    showStep("playback");
    setPlaybackState("idle");

    DOM.audio.src = audioPath;
    DOM.audio.load();

    startAudioPlayback();
  }

  function startAudioPlayback() {
    if (!DOM.audio) return;
    DOM.audio.currentTime = 0;
    DOM.audio.play().catch(() => {
      setPlaybackState("idle");
      showToast("Tap Play to start audio");
    });
  }

  function setPlaybackState(state) {
    DOM.playbackVisual.setAttribute("data-state", state);
    if (state === "idle") {
      DOM.playbackStatus.textContent = "Ready";
      DOM.playLabel.textContent = "Play";
    } else if (state === "speaking") {
      DOM.playbackStatus.textContent = "Speaking...";
      DOM.playLabel.textContent = "Pause";
    } else if (state === "paused") {
      DOM.playbackStatus.textContent = "Paused";
      DOM.playLabel.textContent = "Resume";
    }
  }

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function updateTimeUI() {
    if (!DOM.audio) return;
    const dur = DOM.audio.duration || 0;
    const cur = DOM.audio.currentTime || 0;
    DOM.timeCurrent.textContent = formatTime(cur);
    DOM.timeDuration.textContent = formatTime(dur);
    DOM.timeFill.style.width = dur ? `${(cur / dur) * 100}%` : "0%";
  }

  // ---------- Play / Pause / Resume — driven entirely by real audio events ----------
  DOM.playBtn.addEventListener("click", () => {
    if (!DOM.audio) return;
    if (DOM.audio.paused) {
      DOM.audio.play().catch(() => showToast("Could not play audio"));
    } else {
      DOM.audio.pause();
    }
  });

  if (DOM.audio) {
    DOM.audio.addEventListener("loadedmetadata", updateTimeUI);
    DOM.audio.addEventListener("timeupdate", updateTimeUI);

    DOM.audio.addEventListener("play", () => {
      setPlaybackState("speaking");
      startVisualizer();
    });
    DOM.audio.addEventListener("pause", () => {
      if (DOM.audio.ended) return;
      setPlaybackState("paused");
      stopVisualizer(false);
    });
    DOM.audio.addEventListener("ended", () => {
      setPlaybackState("idle");
      stopVisualizer(true);
      updateTimeUI();
      showToast("Playback finished");
    });

    // click-to-seek on the time track
    DOM.timeTrack.addEventListener("click", (e) => {
      if (!DOM.audio.duration) return;
      const rect = DOM.timeTrack.getBoundingClientRect();
      const ratio = Math.min(
        1,
        Math.max(0, (e.clientX - rect.left) / rect.width),
      );
      DOM.audio.currentTime = ratio * DOM.audio.duration;
    });
  }

  // ---------- Stop / start over ----------
  DOM.stopBtn.addEventListener("click", resetToInput);

  function resetToInput() {
    clearInterval(progressTimer);
    if (DOM.audio) {
      DOM.audio.pause();
      DOM.audio.currentTime = 0;
    }
    stopVisualizer(true);
    setPlaybackState("idle");
    showStep("input");
  }

  window.addEventListener("beforeunload", () => {
    clearInterval(progressTimer);
    cancelAnimationFrame(rafId);
  });

  // ---------- Utils ----------
  function showToast(msg) {
    if (!DOM.toastContainer) return;
    const toast = document.createElement("div");
    toast.className = "editorial-toast";
    toast.innerText = msg;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-6px)";
      setTimeout(() => toast.remove(), 250);
    }, 2200);
  }

  updateConvertButtonState();
  showStep("input");
})();
