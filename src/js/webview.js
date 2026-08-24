(function () {
    window.web_api = null;

    let resolveReady;

    window.web_api_ready = new Promise(resolve => {
        resolveReady = resolve;
    });

    window.addEventListener("pywebviewready", () => {
        window.web_api = pywebview.api;
        resolveReady(window.web_api);

        console.log("Python API ready");
    });
})();