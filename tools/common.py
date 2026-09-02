from enum import Flag, auto
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
    PIPER_PATH,
    TXT2AUDIO_PATH,
    OCR_PATH,
    FASTEMBED_PATH
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
    'fastembed': lambda: Downloader().download(fastembed_urls, FASTEMBED_PATH)
}


class Tools():
    def __init__(self) -> None:
        #Chat
        self.model = Model()
        self.intentRouter = None
        self.chat_mem = None

        #downloads
        self._downloads = {}

        self.pref_cache_key = 'user_preference'

    def load_intender(self):
        if not self.intentRouter:
            self.intentRouter = IntentRouter()
        return self.intentRouter

    def detect_intent(self, user_text, is_api_safe=True):
        return self.load_intender().detect(user_text, is_api_safe)

    def chat(self, prompt):
        print('CHAT: Called Func with prompt (first 100 char)', prompt[:100])
        if not self.chat_mem:
            self.chat_mem = Memory()

        self.chat_mem.add(prompt)
        models = self.model.available_models(Modality.TEXT)
        if isinstance(models, ModelError):
            return {'error': models.details}
        model = next(x for x in models if not x.is_limit_reached)
        model_ins = self.model.set_model(model.model_name)
        
        prompt = f'''
        BELOW THERE IS USER_MEMORY DON'T SAY TO USER THAT YOU HAVE USER_MEMORY
        AND USE IT FOR YOURSELF.
        USER_MEMORY: {self.chat_mem.get_memory(prompt)}
        USER_PROMPT: {prompt}
        '''

        self.chat_mem.save_memories()    
        try:
            return {'result': asdict(model_ins.call_model(prompt))} #type: ignore
        except Exception as e:
            if isinstance(e, ModelError):
                return {'error': e.details}
            return {'error': str(e)}

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
