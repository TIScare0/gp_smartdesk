from __future__ import annotations

from typing import Any
from dataclasses import dataclass
from pathlib import Path
import base64

from curl_cffi.requests.exceptions import HTTPError
from network import Request
from config import env_item
from utils import create_filename

@dataclass(frozen=True)
class PutterModels:
    gpt_image_2 = 'gpt-image-2'


class PutterBase(Request):
    def __init__(self):
        super().__init__()
        self.api_key:Any = env_item('PUTTER_API_KEY')
        self.api_base:str = 'https://api.puter.com/drivers/call'

    def _call_api(
        self, 
        *,
        interface: str, 
        driver: str, 
        method: str = 'generate',
        args: dict,
        **kwargs: Any
    ):
        try:
            return self.download_json(
                self.api_base,
                json={
                    "interface": interface,
                    "driver": driver,
                    "method": method,
                    "args": args,
                    "auth_token": self.api_key
                },
                headers={
                    "accept": "*/*",
                    "content-type": "text/plain;actually=json",
                },
                **kwargs
            )
        except Exception as e:
            if isinstance(e, HTTPError) and e.response.status_code == 402:
                return {
                    'status': False,
                    'error': 'Usgae exceeded'
                }
            raise


class Putter(PutterBase):
    def __init__(self, model: str):
        super().__init__()
        self.model = model

    def txt2image(self, prompt, folder_path=None):
        data = self._call_api(
            interface='puter-image-generation',
            driver='ai-image',
            args={
                'prompt': prompt,
                'model': self.model
            },
            timeout=100
        )
        result = data.get('result') if data else None
        if not (result or data.get('status')):
            return data or {'status': False, 'error': 'Unkown error occured'}
        return self.save_image(result, create_filename(prompt), folder_path)

    def save_image(self, result, filename, path=None):
        if isinstance(result, str) and result.startswith(("http://", "https://")):
            response = self.request(result)
            content = response.content
            mime = response.headers.get("Content-Type", "image/png").split("/", 1)[-1].split(";", 1)[0]
        elif isinstance(result, str) and result.startswith("data:image/"):
            header, encoded = result.split(",", 1)
            mime = header.split(";")[0].split("/", 1)[1]
            mime = "jpg" if mime == "jpeg" else mime
            content = base64.b64decode(encoded)
        else:
            raise ValueError("Invalid image result")

        filename = Path(path or "") / filename
        if filename.suffix == "":
            filename = filename.with_suffix(f".{mime}")
        filename.write_bytes(content)

        return str(filename)
