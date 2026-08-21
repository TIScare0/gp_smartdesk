import webview
from tools import Tools
import platform
from config import update_env_item

if __name__ == "__main__":
    if platform.system() == "Linux":
        update_env_item("QT_QPA_PLATFORM", "xcb")
        update_env_item("QTWEBENGINE_CHROMIUM_FLAGS", "--use-gl=desktop --enable-gpu-rasterization")
    window = webview.create_window(
        "GP SmartDesk",
        "src/index.html",
        js_api=Tools(),
        height=1080,
        width=1920,
    )
    gui = 'qt'
    if platform.system() == 'Windows':
        gui = 'edgechromium'
    webview.start(gui=gui, debug=True)
