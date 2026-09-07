import shutil
from pathlib import Path
from enum import Flag, auto, unique
from typing import Any
from dataclasses import asdict

from utils import random_uuid
from network import Request
from config import update_key
from cache import (
    save_cache, 
    load_cache
)

from .model import (
    Model,
    Modality,
)
from .model import Error as ModelError
from .memory import Memory
from .memory import DOWNLOAD_URLS as fastembed_urls
from .intender import IntentRouter
from .downloader import Downloader
from .piper import Piper
from .piper import DOWNLOAD_URLS as piper_urls
from .paths import (
    APP_DATA,
    PIPER_PATH,
    TXT2AUDIO_PATH,
    OCR_PATH,
    FASTEMBED_PATH,
    USER_DOWNLOADS_PATH,
)
from .ocr import DOWNLOAD_URLS as ocr_urls
from .ocr import Ocr
from .pdf_tool import Pdf
from .pdf_bridge import PdfBridge

class ResponseTypes(Flag):
    model = auto()
    pdf = auto()
    piper = auto()
    paper_solver= auto()
    scanner = auto()


class Response:
    typ: ResponseTypes
    response: Any
    error: Any


class AppData:
    def __init__(self) -> None:
        pass

DOWNLOAD_MAP = {
    'piper': lambda: Downloader().download(piper_urls(), PIPER_PATH),
    'ocr': lambda: Downloader().download(ocr_urls, OCR_PATH),
    'fastembed': lambda: Downloader().download(fastembed_urls, FASTEMBED_PATH)
}


class Tools():
    def __init__(self) -> None:
        #Chat
        self.model = Model()
        self.intentRouter = None
        self.chat_mem = None
        self._model_index = 0

        #downloads
        self._downloads = {}

        self.pref_cache_key = 'user_preference'
        self.pdf = Pdf
        self.pdf_bridge = PdfBridge(self.pdf)

    def load_intender(self):
        if not self.intentRouter:
            self.intentRouter = IntentRouter()
        return self.intentRouter

    def detect_intent(self, user_text, is_api_safe=True):
        return self.load_intender().detect(user_text, is_api_safe)

    def get_model(self, _type='txt2txt'):
        self.models = self.model.available_models(Modality.TEXT if _type == 'txt2txt' else Modality.IMAGE)
        if isinstance(self.models, ModelError):
            return {'error': self.models.details}

        available = [x for x in self.models if not x.is_limit_reached]
        if not available:
            return {'error': 'No model available'}

        model = available[self._model_index % len(available)]
        self._model_index += 1

        model_ins = self.model.set_model(model.model_name)
        return model_ins

    def chat(self, prompt):
        print('CHAT: Called Func with prompt (first 100 char)', prompt[:100])
        if not self.chat_mem:
            self.chat_mem = Memory()
        self.chat_mem.add(prompt)
        prompt = f'''
        BELOW THERE IS USER_MEMORY DON'T SAY TO USER THAT YOU HAVE USER_MEMORY
        AND USE IT FOR YOURSELF.
        USER_MEMORY: {self.chat_mem.get_memory(prompt)}
        USER_PROMPT: {prompt}
        '''
        self.chat_mem.save_memories()
        model_ins = self.get_model()
        try:
            return {'result': asdict(model_ins.call_model(prompt))} #type: ignore
        except Exception as e:
            if isinstance(e, ModelError):
                return {'error': e.details}
            return {'error': str(e)}

    def gen_image(self, userPrompt):
        model_ins = self.get_model(_type='txt2img')
        target_path = APP_DATA / "images"
        target_path.mkdir(parents=True, exist_ok=True)
        try:
            data = asdict(
                model_ins.call_model(
                    userPrompt,
                    str(target_path),
                    method='txt2img'
                )
            )
            path: str | None = data.get('response')
            if not path:
                return data
            return {'response': f'__file__/{path.removeprefix('/')}'}
        except Exception as e:
            if isinstance(e, ModelError):
                return {'error': e.details}
            return {'error': str(e)}

    def check_download(self, download_id):
        job = self._downloads.get(download_id)

        if not job:
            return {
                "status": False,
                "error": "Download not found"
            }

        downloader = Downloader()

        complete = downloader.check_paths(
            job["urls"],
            job["path"]
        )

        return {
            "status": True,
            "completed": complete
        }
    
    def download(self, _id: str):
        func = DOWNLOAD_MAP.get(_id)

        if not func:
            return {
                "status": False,
                "error": f"Unknown download: {_id}",
            }

        try:
            self._downloads[_id] = func()
        except Exception as e:
            return {
                'status': False,
                'error': str(e)
            }

        return {
            "status": True,
            "id": _id,
        }

    def download_step(self, _id: str):
        generator = self._downloads.get(_id)
        if generator is None:
            return {
                "status": False,
                "error": "Download not started",
            }

        try:
            return {
                "status": True,
                "done": False,
                "data": next(generator),
            }
        except StopIteration as e:
            self._downloads.pop(_id, None)
            return {
                "status": True,
                "done": True,
                "data": e.value,
            }

        except Exception as e:
            self._downloads.pop(_id, None)
            return {
                "status": False,
                "done": True,
                "error": str(e),
            }
    
    def load_voices(self):
        return ['amy']
    
    def txt2audio(self, text: str):
        piper = Piper()
        is_voice_load = piper.load_voice()
        if not is_voice_load.get('status'): #type: ignore
            return is_voice_load
        return piper.txt2audio(text, TXT2AUDIO_PATH / f'{random_uuid()}.wav')

    def ocr(self, image_data: str):
        try:
            ocr_ins = Ocr()
            is_loaded = ocr_ins.load_model()
            if not is_loaded.get('status'):
                return is_loaded
            if not image_data.startswith("data:image/"):
                return {"status": False, "error": "Invalid image data",}

            header, encoded = image_data.split(",", 1)

            import base64
            import uuid

            suffix = ".png"

            if "jpeg" in header or "jpg" in header:
                suffix = ".jpg"
            elif "webp" in header:
                suffix = ".webp"

            temp_path = OCR_PATH / f"{uuid.uuid4()}{suffix}"

            temp_path.write_bytes(base64.b64decode(encoded))

            try:
                return ocr_ins.extract_text(temp_path)
            finally:
                temp_path.unlink(missing_ok=True)

        except Exception as e:
            return {
                "status": False,
                "error": str(e),
            }

    def checkNvidiaApiKey(self, key):
        try:
            response = Request().request(
                'https://integrate.api.nvidia.com/v1/models',
                headers={
                    'Authorization': f'Bearer {key}'
                },
                timeout=10
            )

            return {'valid': response.status_code == 200} #type: ignore

        except Exception:
            return {'valid': False}

    def save_key(self, provider: str, new_key: str) -> None:
        update_key(provider, new_key)

    def set_preference(self, key, value):
        cached = load_cache(self.pref_cache_key)
        if not cached:
            cached = {}
        cached.update({key: value})
        save_cache(self.pref_cache_key, cached)
        return {'stored': True}

    def get_preference(self, key):
        try:
            return {'result': load_cache(self.pref_cache_key, default={})[key]}
        except Exception:
            return {}

    def copy_to_download_path(self, file_path: str, _type=None):
        try:
            if file_path.startswith('__file__'):
                file_path = file_path[len('__file__'):]

            source = Path(file_path)

            if not source.is_file():
                return {'error': f'File does not exist: {source}'}

            download_path = USER_DOWNLOADS_PATH / _type if _type else USER_DOWNLOADS_PATH
            download_path.mkdir(parents=True, exist_ok=True)

            destination = download_path / source.name
            shutil.copy2(source, destination)

            return {
                'response': f'Successfully copied to {destination}'
            }

        except Exception as e:
            return {'error': str(e)}

    def pdf_stage(self, stage_id, paths):
        return self.pdf_bridge.pdf_stage(stage_id, paths)

    def pdf_stage_info(self, stage_id, file_name):
        return self.pdf_bridge.pdf_stage_info(stage_id, file_name)

    def pdf_unlock(self, stage_id, file_name, password):
        return self.pdf_bridge.pdf_unlock(stage_id, file_name, password)

    def pdf_run(self, stage_id, tool, options):
        return self.pdf_bridge.pdf_run(stage_id, tool, options)

    def pdf_export(self, output_path, suggested_name):
        return self.pdf_bridge.pdf_export(output_path, suggested_name)
    
    def pdf_pick_files(self, allow_multiple=True):
        return self.pdf_bridge.pdf_pick_files(allow_multiple)

    def get_images(self):
        image_path = APP_DATA / 'images'
        extensions = {'.png', '.jpg', '.jpeg', '.webp', '.gif'}

        return [
            {'image': f'__file__/{file}'}
            for file in sorted(
                image_path.iterdir(),
                key=lambda file: file.stat().st_mtime,
                reverse=True
            )
            if file.is_file() and file.suffix.lower() in extensions
        ]
