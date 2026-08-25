# gp_smartdesk.spec
#
# GP SmartDesk - Production PyInstaller specification
#
# Build:
#     pyinstaller --clean --noconfirm gp_smartdesk.spec
#
# Output:
#     dist/GP SmartDesk/

from pathlib import Path

from PyInstaller.utils.hooks import (
    collect_submodules, 
    collect_data_files
)

# ============================================================
# Project paths
# ============================================================

ROOT = Path(SPEC).resolve().parent


# ============================================================
# Application metadata
# ============================================================

APP_NAME = "GP SmartDesk"
ENTRY_POINT = ROOT / "main.py"


# ============================================================
# Frontend / application data
# ============================================================
#
# Runtime layout:
#
# GP SmartDesk/
# ├── GP SmartDesk
# ├── src/
# │   ├── index.html
# │   ├── css/
# │   ├── fonts/
# │   ├── images/
# │   ├── js/
# │   └── pages/
# ├── animations/
# ├── icons/
# └── image.png
#
# Keeping src as src is important because your Python code can
# reference the frontend using a predictable application root.

datas = [
    (str(ROOT / "src" / "index.html"), "src"),
    (str(ROOT / "src" / "css"), "src/css"),
    (str(ROOT / "src" / "fonts"), "src/fonts"),
    (str(ROOT / "src" / "images"), "src/images"),
    (str(ROOT / "src" / "js"), "src/js"),
    (str(ROOT / "src" / "pages"), "src/pages"),
    *collect_data_files("rapidocr"),
    *collect_data_files("piper"),
]


# ============================================================
# Hidden imports
# ============================================================
#
# Your own packages use dynamic/provider-based functionality.
# Explicitly collecting these packages makes the frozen build
# more resilient to dynamic imports.
#
# PyInstaller normally discovers regular imports automatically.
# These are primarily protection for dynamically imported modules.

hiddenimports = [
    # Internal packages
    "network",
    "network.request",

    "tools",
    "tools.bing",
    "tools.cohere",
    "tools.common",
    "tools.downloader",
    "tools.gemini",
    "tools.memory",
    "tools.mistral",
    "tools.model",
    "tools.nvidia",
    "tools.ocr",
    "tools.openrouter",
    "tools.paper_solver",
    "tools.paths",
    "tools.pdf",
    "tools.perchance",
    "tools.piper",
    "tools.routing",

    "utils",
    "utils._utils",
]

for package in [
    "google",
    "google.genai",
]:
    try:
        hiddenimports.extend(collect_submodules(package))
    except Exception:
        pass

hiddenimports = list(dict.fromkeys(hiddenimports))

excludes = [
    "pytest",
    "unittest",
    "test",
    "tests",
    "tkinter",
    "IPython",
    "jupyter",
]

a = Analysis(
    [str(ENTRY_POINT)],
    pathex=[str(ROOT)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excludes,
    noarchive=False,
    optimize=0,
)

pyz = PYZ(
    a.pure,
)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    a.zipfiles,
    name=APP_NAME,
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)