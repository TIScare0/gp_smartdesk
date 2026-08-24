from pathlib import Path
import json
import uuid
from urllib.parse import quote

KNOWN_EXTENSIONS = {
    'jpg',
    'jpeg',
    'png',
    'webp',
    'gif',
    'bmp',
    'mp4',
    'webm',
}


def open_file(filename, is_json=False):
    data = None
    try:
        with open(filename, 'r') as f:
            data = f.read()
    except FileNotFoundError:
        return None
    return json.loads(data) if is_json else data


def save_file(filename, data, _type='w', is_json=False):
    if _type == 'wb':
        with open(filename, _type) as f:
            f.write(data)
    else:
        with open(filename, _type, encoding='utf-8') as f:
            if is_json:
                json.dump(data, f)
            else:
                f.write(data)


def create_filename(chars: str, ext: str | None = None):
    filename = chars[:20].lower().replace(' ', '_')
    if ext:
        filename = f'{filename}.{ext}'
    return filename


def determine_ext(url, default_ext: str | None = 'unknown_video'):
    if not url:
        return default_ext

    url = url.partition('?')[0].rstrip('/')

    guess = url.rpartition('.')[2].lower()

    if guess in KNOWN_EXTENSIONS:
        return guess

    return default_ext

def random_uuid() -> str:
    return str(uuid.uuid4())

def file_url(path: Path) -> str:
    return "/__file__/" + quote(
        str(path).lstrip("/"),
        safe="/",
    )
