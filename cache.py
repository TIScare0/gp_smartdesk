import json
import os
import sys
import hashlib
from pathlib import Path
from typing import Any
from Crypto.Cipher import AES

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


SAFE_KEY = 'add-your-secret'

AES_KEY = hashlib.sha256(SAFE_KEY.encode("utf-8")).digest()

def _encrypt(data: str) -> bytes:
    cipher = AES.new(AES_KEY, AES.MODE_GCM)
    ciphertext, tag = cipher.encrypt_and_digest(data.encode("utf-8"))
    return cipher.nonce + tag + ciphertext #type: ignore

def _decrypt(data: bytes) -> str:
    nonce = data[:16]
    tag = data[16:32]
    ciphertext = data[32:]
    cipher = AES.new(AES_KEY, AES.MODE_GCM, nonce=nonce)
    return cipher.decrypt_and_verify(ciphertext, tag).decode("utf-8")

def save_secure(section, data, is_json=True):
    path = CACHE_DIR / f'{section}_safe.dat'
    with path.open('wb') as f:
        f.write(_encrypt(
            json.dumps(data) if is_json else data
        ))
    return

def load_secure(section, is_json=True, default=None) -> dict | Any:
    try:
        path = CACHE_DIR / f'{section}_safe.dat'
        data = None
        with path.open('rb') as f:
            data = f.read()
        decrypted_data = _decrypt(data)
        return json.loads(decrypted_data) if is_json else decrypted_data
    except Exception:
        return default
