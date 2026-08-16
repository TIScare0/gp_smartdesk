import json
import os
import sys
from pathlib import Path


if sys.platform == "win32":
    cache_path = Path(os.environ["LOCALAPPDATA"])
else:
    cache_path = Path.home() / ".cache"


CACHE_DIR = cache_path / "gp_smartdesk"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def save_cache(section, data):
    path = CACHE_DIR / f"{section}.json"

    with path.open("w", encoding="utf-8") as f:
        json.dump(
            {
                "stored_by": "gp_smartdesk",
                "data": data,
            },
            f,
            indent=2,
        )


def load_cache(section, default=None):
    try:
        path = CACHE_DIR / f"{section}.json"

        with path.open("r", encoding="utf-8") as f:
            return json.load(f)["data"]
    except (OSError, ValueError, KeyError, TypeError):
        return default