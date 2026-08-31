# put this near the top of main.py, BEFORE `import webview`
import webview.platforms.qt as qt_platform

def _patched_qt():
    if not qt_platform.is_webengine:
        return  # qtwebkit backend has no featurePermissionRequested at all

    QWebPage = qt_platform.QWebPage #type: ignore

    # Build the "always allow" set. Older PySide6 may not expose
    # ClipboardReadWrite under every enum name, so guard with getattr.
    always_allow = [
        QWebPage.Feature.MediaAudioCapture,
        QWebPage.Feature.MediaVideoCapture,
        QWebPage.Feature.MediaAudioVideoCapture,
    ]
    clipboard_feature = getattr(QWebPage.Feature, 'ClipboardReadWrite', None)
    if clipboard_feature is not None:
        always_allow.append(clipboard_feature)

    has_new_enum = hasattr(QWebPage, 'PermissionPolicy')

    def _patched_on_feature(self, url, feature):
        if has_new_enum:
            Policy = QWebPage.PermissionPolicy
            granted, denied = Policy.GrantedByUser, Policy.DeniedByUser #type: ignore
        else:
            granted, denied = 1, 2  # old int-based API (Qt < 6.8-ish)

        policy = granted if feature in always_allow else denied
        self.setFeaturePermission(url, feature, policy)

    qt_platform.BrowserView.WebPage.onFeaturePermissionRequested = _patched_on_feature

    QWebEngineSettings = qt_platform.QWebEngineSettings #type: ignore
    original_init = qt_platform.BrowserView.__init__

    def patched_init(self, window):
        original_init(self, window)
        webattr = QWebEngineSettings.WebAttribute
        page_settings = self.profile.settings()
        if hasattr(webattr, 'JavascriptCanAccessClipboard'):
            page_settings.setAttribute(webattr.JavascriptCanAccessClipboard, True)
        if hasattr(webattr, 'JavascriptCanPaste'):
            page_settings.setAttribute(webattr.JavascriptCanPaste, True)

    qt_platform.BrowserView.__init__ = patched_init
_patched_qt()

import webview
import platform

from pathlib import Path
from urllib.parse import unquote
from bottle import Bottle, static_file, HTTPError

from tools import Tools
from config import update_env_item


SRC_PATH = Path(__file__).resolve().parent / "src"

app = Bottle()

@app.route("/__file__/<filepath:path>") #type: ignore
def filesystem_file(filepath):
    filepath = unquote(filepath)

    path = Path("/") / filepath

    if not path.is_file():
        raise HTTPError(404, "File not found")

    return static_file(
        path.name,
        root=str(path.parent),
    )

@app.route("/") #type: ignore
def index():
    return static_file(
        "index.html",
        root=str(SRC_PATH),
    )

@app.route("/<filepath:path>") #type: ignore
def static_assets(filepath):
    return static_file(
        filepath,
        root=str(SRC_PATH),
    )

if __name__ == "__main__":
    if platform.system() == "Linux":
        update_env_item(
            "QTWEBENGINE_CHROMIUM_FLAGS",
            "--enable-gpu-rasterization",
        )

    api = Tools()
    window = webview.create_window(
        "GP SmartDesk",
        app, #type: ignore
        js_api=api,
        height=1080,
        width=1920,
    )

    gui = "qt"

    if platform.system() == "Windows":
        gui = "edgechromium"
    
    webview.start(
        gui=gui,
        debug=False,
        private_mode=False,
    )
