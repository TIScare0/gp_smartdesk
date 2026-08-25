import webview
import platform

from pathlib import Path
from urllib.parse import unquote
from bottle import Bottle, static_file, HTTPError

from tools.paths import BASE_PATH as APP_DATA
from tools import Tools
from config import update_env_item


BASE_PATH = Path(__file__).resolve().parent
SRC_PATH = BASE_PATH / "src"

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
        http_port=13563,
    )

    gui = "qt"

    if platform.system() == "Windows":
        gui = "edgechromium"
    
    webview.start(
        gui=gui,
        private_mode=False,
    )
