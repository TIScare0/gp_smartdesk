(function () {
  "use strict";

  const DOM = {
    card: document.getElementById("ocrCard"),

    dropzone: document.getElementById("ocrDropzone"),
    fileInput: document.getElementById("ocrFileInput"),

    previewImg: document.getElementById("ocrPreviewImg"),
    previewFilename: document.getElementById("ocrPreviewFilename"),
    previewSize: document.getElementById("ocrPreviewSize"),

    removeImageBtn: document.getElementById("ocrRemoveImageBtn"),
    extractBtn: document.getElementById("ocrExtractBtn"),

    scanImg: document.getElementById("ocrScanImg"),
    extractingLabel: document.getElementById("ocrExtractingLabel"),
    extractingFill: document.getElementById("ocrExtractingFill"),

    resultText: document.getElementById("ocrResultText"),
    resultMeta: document.getElementById("ocrResultMeta"),

    copyBtn: document.getElementById("ocrCopyBtn"),
    copyLabel: document.getElementById("ocrCopyLabel"),

    newImageBtn: document.getElementById("ocrNewImageBtn"),
    downloadBtn: document.getElementById("ocrDownloadBtn"),

    toastContainer: document.getElementById("toastContainer"),
  };

  let currentImageDataUrl = null;
  let currentFileName = "image.jpg";

  let progressTimer = null;
  let extractionRunning = false;


  // ---------- State ----------

  function setState(state) {
    DOM.card.setAttribute("data-state", state);
  }


  // ---------- Upload handling ----------

  function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      showToast("Please choose an image file");
      return;
    }

    currentFileName = file.name;

    const reader = new FileReader();

    reader.onload = (event) => {
      currentImageDataUrl = event.target.result;

      DOM.previewImg.src = currentImageDataUrl;
      DOM.previewFilename.textContent = file.name;
      DOM.previewSize.textContent = formatBytes(file.size);

      setState("preview");
    };

    reader.onerror = () => {
      currentImageDataUrl = null;
      showToast("Could not read image");
    };

    reader.readAsDataURL(file);
  }


  // ---------- File input ----------

  DOM.fileInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];

    if (file) {
      handleFile(file);
    }
  });


  // ---------- Drag & drop ----------

  ["dragenter", "dragover"].forEach((eventName) => {
    DOM.dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();

      DOM.dropzone.classList.add("drag-over");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    DOM.dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();

      DOM.dropzone.classList.remove("drag-over");
    });
  });

  DOM.dropzone.addEventListener("drop", (event) => {
    const file = event.dataTransfer?.files?.[0];

    if (file) {
      handleFile(file);
    }
  });


  // ---------- Remove image ----------

  DOM.removeImageBtn.addEventListener("click", () => {
    resetImage();
  });


  // ---------- New image ----------

  DOM.newImageBtn.addEventListener("click", () => {
    resetImage();
  });


  function resetImage() {
    stopProgress();

    currentImageDataUrl = null;
    currentFileName = "image.jpg";

    DOM.fileInput.value = "";
    DOM.previewImg.removeAttribute("src");
    DOM.scanImg.removeAttribute("src");

    DOM.previewFilename.textContent = "";
    DOM.previewSize.textContent = "";

    DOM.resultText.value = "";
    DOM.resultMeta.textContent = "";

    DOM.extractingFill.style.width = "0%";
    DOM.extractingLabel.textContent = "Reading image...";

    extractionRunning = false;

    setState("idle");
  }


  // ---------- REAL OCR ----------

  DOM.extractBtn.addEventListener("click", async () => {
    if (extractionRunning) {
      return;
    }

    if (!currentImageDataUrl) {
      showToast("Please choose an image first");
      return;
    }

    const bridge = await getWebApi();

    if (!bridge) {
      showToast("Python API isn't ready");
      return;
    }

    extractionRunning = true;

    DOM.scanImg.src = currentImageDataUrl;

    DOM.extractingLabel.textContent = "Reading image...";
    DOM.extractingFill.style.width = "0%";

    setState("extracting");

    startProgress();

    try {

      const result = await bridge.ocr(
        currentImageDataUrl
      );

      stopProgress();

      if (!result?.status) {
        throw new Error(
          result?.error || "OCR extraction failed"
        );
      }

      const text = String(result.response || "").trim();

      DOM.extractingLabel.textContent = "Finalizing output...";
      DOM.extractingFill.style.width = "100%";

      DOM.resultText.value = text;

      const wordCount = text
        ? text.split(/\s+/).length
        : 0;

      DOM.resultMeta.textContent =
        `${wordCount} ${wordCount === 1 ? "word" : "words"}`;

      setTimeout(() => {
        setState("result");
      }, 250);

    } catch (error) {
      stopProgress();

      console.error("OCR extraction failed:", error);

      DOM.extractingFill.style.width = "0%";

      showToast(
        error?.message || "OCR extraction failed"
      );

      setState("preview");

    } finally {
      extractionRunning = false;
    }
  });


  // ---------- OCR progress UI ----------

  function startProgress() {
    stopProgress();

    const stages = [
      "Reading image...",
      "Detecting text regions...",
      "Recognizing characters...",
      "Processing detected text...",
    ];

    let percentage = 0;
    let stage = 0;

    DOM.extractingLabel.textContent = stages[0];
    DOM.extractingFill.style.width = "0%";

    progressTimer = setInterval(() => {
      /*
       * This is only visual progress.
       *
       * We intentionally stop at 90%.
       * 100% means Python/RapidOCR actually finished.
       */

      if (percentage < 90) {
        percentage += percentage < 40 ? 3 : 1;

        percentage = Math.min(
          percentage,
          90
        );

        DOM.extractingFill.style.width =
          `${percentage}%`;
      }

      const nextStage = Math.min(
        stages.length - 1,
        Math.floor(percentage / 25)
      );

      if (nextStage !== stage) {
        stage = nextStage;
        DOM.extractingLabel.textContent =
          stages[stage];
      }

    }, 150);
  }


  function stopProgress() {
    if (progressTimer !== null) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  }


  // ---------- pywebview API ----------

  async function getWebApi() {
    try {
      console.log("[OCR] Waiting for Python API...");

      const bridge = await window.web_api_ready;

      console.log("[OCR] Python API received:", bridge);

      if (!bridge) {
        throw new Error("Python API is null");
      }

      return bridge;

    } catch (error) {
      console.error(
        "[OCR] Failed to get Python API:",
        error
      );

      return null;
    }
  }


  // ---------- Copy ----------

  DOM.copyBtn.addEventListener("click", async () => {
    const text = DOM.resultText.value;

    if (!text) {
      showToast("There is no text to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);

      DOM.copyLabel.textContent = "Copied";

      setTimeout(() => {
        DOM.copyLabel.textContent = "Copy";
      }, 1800);

      showToast("Text copied to clipboard");

    } catch (error) {
      console.error(
        "Clipboard error:",
        error
      );

      showToast("Could not copy text");
    }
  });


  // ---------- Download ----------

  DOM.downloadBtn.addEventListener("click", () => {
    const text = DOM.resultText.value;

    if (!text) {
      showToast("There is no text to download");
      return;
    }

    const blob = new Blob(
      [text],
      {
        type: "text/plain;charset=utf-8",
      }
    );

    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");

    anchor.href = url;

    const baseName =
      currentFileName
        .replace(/\.[^.]+$/, "")
        .trim() ||
      "ocr-result";

    anchor.download = `${baseName}.txt`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);

    showToast("Downloaded as .txt");
  });


  // ---------- Helpers ----------

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) {
      return "0 KB";
    }

    const mb = bytes / (1024 * 1024);

    if (mb >= 1) {
      return `${mb.toFixed(1)} MB`;
    }

    return `${Math.round(bytes / 1024)} KB`;
  }


  function showToast(message) {
    if (!DOM.toastContainer) {
      return;
    }

    const toast = document.createElement("div");

    toast.className = "editorial-toast";
    toast.innerText = message;

    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-6px)";

      setTimeout(() => {
        toast.remove();
      }, 250);

    }, 2200);
  }


  // ---------- Initial state ----------

  setState("idle");

})();