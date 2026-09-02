import os
import re
from pathlib import Path


KEYS_NAMES = [
    "NVIDIA",
    "OPENROUTER",
    "GEMINI",
    "MISTRAL",
    "COHERE",
]

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONFIG_FILE = PROJECT_ROOT / "config.py"

if not CONFIG_FILE.exists():
    raise FileNotFoundError(
        f"config.py not found: {CONFIG_FILE}"
    )


file = CONFIG_FILE.read_text(encoding="utf-8")


for key_name in KEYS_NAMES:
    env_name = f"{key_name}_API_KEY"
    api_key = os.environ.get(env_name)

    if not api_key:
        print(f"[SKIP] {env_name} is not set")
        continue

    pattern = (
        rf"({key_name}_API_KEY\s*=\s*"
        rf"get_key\('{key_name}'\)\s*or\s*)"
        rf"'[^']*'"
    )

    replacement = rf"\1'{api_key}'"

    new_file, count = re.subn(
        pattern,
        replacement,
        file,
    )

    if count == 0:
        print(f"[WARN] Could not find {key_name}_API_KEY")
        continue

    file = new_file

    print(f"[OK] Injected {env_name}")


CONFIG_FILE.write_text(file, encoding="utf-8")

print("[DONE] API keys injected into config.py")
