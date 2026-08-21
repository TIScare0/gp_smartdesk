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


class Tools():
    def __init__(self) -> None:
        #Chat
        self.model = Model()
        self.intentRouter = IntentRouter()
        self.chat_mem = Memory()

    def chat(self, prompt):
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
            data = asdict(model_ins.call_model(userPrompt, 'src/images', method='txt2img'))
            path = data.get('response')
            return {
                'result': {'response': path.replace('src/', '')} #type: ignore
            }
        except Exception as e:
            if isinstance(e, ModelError):
                return {
                    'error': e.details
                }
            return {
                'error': str(e)
            }
