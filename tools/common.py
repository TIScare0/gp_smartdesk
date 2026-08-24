from enum import Flag, auto
from typing import Any
from dataclasses import asdict

from .model import (
    Model,
    Modality,
)
from .model import Error as ModelError
from .memory import Memory
from .routing import (
    IntentRouter,
    Intents
)
from utils import random_uuid
from .downloader import Downloader
from .piper import Piper
from .piper import DOWNLOAD_URLS as piper_urls
from .paths import (
    PIPER_PATH,
    TXT2AUDIO_PATH,
    OCR_PATH,
)
from .ocr import DOWNLOAD_URLS as ocr_urls
from .ocr import Ocr


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
}


class Tools():
    def __init__(self) -> None:
        #Chat
        self.model = Model()
        self.intentRouter = None
        self.chat_mem = None
        self._downloads = {}

    def chat(self, prompt):
        if not self.chat_mem:
            self.chat_mem = Memory()
        if not self.intentRouter:
            self.intentRouter = IntentRouter()

        intent = self.intentRouter.detect(prompt)
        if intent != Intents.CHAT:
            return self.router(prompt)
        models = self.model.available_models(Modality.TEXT)
        if isinstance(models, ModelError):
            return {'error': models.details}
        model = next(x for x in models if not x.is_limit_reached)
        model_ins = self.model.set_model(model.model_name)
        try:
            return {
                'result': asdict(model_ins.call_model(prompt)) #type: ignore
            }
        except Exception as e:
            if isinstance(e, ModelError):
                return {
                    'error': e.details,
                }
            return {
                'error': str(e),
            }

    def router(self, result: Intents, *args, **kwargs):
        if result == Intents.IMAGES:
            return self.gen_image(*args, **kwargs)
        elif result == Intents.AUDIO:
            ...
        elif result == Intents.PAPER_SOLVER:
            ...

    def gen_image(self, userPrompt):
        models = self.model.available_models(Modality.IMAGE)
        if isinstance(models, ModelError):
            return {'error': models.details}
        model = next(x for x in models if not x.is_limit_reached)
        if not model:
            return {'error': 'No model avaliable'}
        model_ins = self.model.set_model(model.model_name)
        try:
            data = asdict(model_ins.call_model(userPrompt, 'src/images', method='txt2img')) #type: ignore
            path = data.get('response')
            return {'result': {'response': path.replace('src/', '')}} #type: ignore
        except Exception as e:
            if isinstance(e, ModelError):
                return {'error': e.details}
            return {'error': str(e)}
    
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
