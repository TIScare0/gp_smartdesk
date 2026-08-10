from __future__ import annotations
from dataclasses import dataclass

from .gemini import GeminiChat, GeminiModels
from .leonardo import LeonardoImage

@dataclass(frozen=True)
class AllModels(
    GeminiModels,
):
    pass

class Model:
    def __init__(self, _type: str | list[str]):
        self._type: str | list[str] = _type
        self.models = {
            'text': GeminiChat,
            'image': LeonardoImage,
        }

    def model(self):
        for _type, model in self.models:
            if _type == self._type:
                return model
        raise RuntimeError(f'Got Unkown type {self._type}')
