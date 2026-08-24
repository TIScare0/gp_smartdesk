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

from PyInstaller.utils.hooks import collect_submodules


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
    # Main frontend
    (str(ROOT / "src" / "index.html"), "src"),

    # CSS
    (str(ROOT / "src" / "css"), "src/css"),

    # Fonts
    (str(ROOT / "src" / "fonts"), "src/fonts"),

    # Frontend images
    (str(ROOT / "src" / "images"), "src/images"),

    # JavaScript
    (str(ROOT / "src" / "js"), "src/js"),

    # HTML pages
    (str(ROOT / "src" / "pages"), "src/pages"),

    # Application animation assets
    (str(ROOT / "animations"), "animations"),

    # Application icons
    (str(ROOT / "icons"), "icons"),

    # Root application image
    (str(ROOT / "image.png"), "."),
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


# ============================================================
# Optional dynamic provider imports
# ============================================================
#
# If any provider/library performs dynamic imports, collecting
# its submodules here prevents runtime "module not found"
# failures.
#
# We intentionally do NOT blindly collect every dependency in
# requirements.txt because that can massively inflate the build.

for package in [
    "google",
    "google.genai",
]:
    try:
        hiddenimports.extend(collect_submodules(package))
    except Exception:
        pass


# Remove duplicates while preserving order.
hiddenimports = list(dict.fromkeys(hiddenimports))


# ============================================================
# Modules we explicitly don't want in the production bundle
# ============================================================

excludes = [
    # Development/testing
    "pytest",
    "unittest",
    "test",
    "tests",

    # Unused GUI stacks if present through dependencies
    "tkinter",

    # Interactive development tools
    "IPython",
    "jupyter",
]


# ============================================================
# Analysis
# ============================================================

a = Analysis(
    [str(ENTRY_POINT)],

    pathex=[
        str(ROOT),
    ],

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


# ============================================================
# Python bytecode archive
# ============================================================

pyz = PYZ(
    a.pure,
)


# ============================================================
# Executable
# ============================================================

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],

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


# ============================================================
# One-folder distribution
# ============================================================

coll = COLLECT(
    exe,

    a.binaries,
    a.datas,
    a.zipfiles,

    strip=False,

    upx=False,

    name=APP_NAME,
)