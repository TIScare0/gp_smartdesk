(function () {
  window.web_api = null;

  let resolveReady;

  window.web_api_ready = new Promise((resolve) => {
    resolveReady = resolve;
  });

  async function StoreItem(key, value) {
    try {
      const api = await window.web_api_ready;
      const result = await api.set_preference(key, value);
      return result?.stored ?? false;
    } catch (e) {
      console.error(`[STORE ITEM] Error storing "${key}":`, e);
      return false;
    }
  }

  async function GetItem(key) {
    try {
      const api = await window.web_api_ready;
      const response = await api.get_preference(key);
      return response?.result ?? null;
    } catch (e) {
      console.error(`[GET ITEM] Error getting "${key}":`, e);
      return null;
    }
  }

  window.StoreItem = StoreItem;
  window.GetItem = GetItem;

  window.addEventListener("pywebviewready", () => {
    window.web_api = pywebview.api;
    resolveReady(window.web_api);

    console.log("Python API ready");
  });
})();