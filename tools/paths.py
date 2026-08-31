from pathlib import Path
import os
import sys


APP_NAME = "GP SmartDesk"

def get_app_data_path() -> Path:
    if sys.platform == "win32":
        return Path(
            os.environ.get(
                "LOCALAPPDATA",
                Path.home() / "AppData" / "Local",
            )
        ) / APP_NAME

    # Linux / macOS
    return Path.home() / ".local" / "share" / APP_NAME


BASE_PATH = get_app_data_path()

APP_DATA = BASE_PATH / APP_NAME

DOWNLOADS_PATH = BASE_PATH / "downloads"

PIPER_PATH = DOWNLOADS_PATH / "piper" / "voices"

OCR_PATH = DOWNLOADS_PATH / "ocr" / "models"

TXT2AUDIO_PATH = BASE_PATH / "audios"
TXT2AUDIO_PATH.mkdir(parents=True, exist_ok=True)