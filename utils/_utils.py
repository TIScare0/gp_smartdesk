import json


def open_file(filename, is_json=False):
    data = None
    try:
        with open(filename, 'r') as f:
            data = f.read()
    except FileNotFoundError:
        return None
    return json.loads(data) if is_json else data

def save_file(filename, data, is_json=False):
    with open(filename, 'w', encoding='utf-8') as f:
        if is_json:
            json.dump(f, data)
            return
        f.write(data)
        return

def create_filename(chars: str, ext: str | None = None):
    filename = chars[:20].lower().replace(' ', '_')
    if ext:
        filename = filename + ext
    return filename
