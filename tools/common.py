from __future__ import annotations
from dataclasses import dataclass
from enum import Flag, auto

from .putter import Putter, PutterModels
from .gemini import Gemini, GeminiModels
from .leonardo import Leonardo, LeonardoModels
from .bing import Bing, BingModels
from .cohere import Cohere, CohereModels
from .hugging_face import Hugging, HuggingModels
from .mistral import Mistral, MistralModels
from .nvidia import Nvidia, NvidiaModels
from .openrouter import OpenRouter, OpenrouterModels


class Modality(Flag):
    TEXT = auto()
    IMAGE = auto()


@dataclass(frozen=True)
class ModelInfo:
    name: str
    provider: type
    core_mode: Modality


class Models:
    GEMINI = {
        GeminiModels.flash: ModelInfo(
            name=GeminiModels.flash,
            provider=Gemini,
            core_mode=Modality.TEXT
        ),
        GeminiModels.flash_lite: ModelInfo(
            name=GeminiModels.flash_lite,
            provider=Gemini,
            core_mode=Modality.TEXT
        ),
        GeminiModels.flash_lite_previous: ModelInfo(
            name=GeminiModels.flash_lite_previous,
            provider=Gemini,
            core_mode=Modality.TEXT
        ),        
        GeminiModels.flash_previous: ModelInfo(
            name=GeminiModels.flash_previous,
            provider=Gemini,
            core_mode=Modality.TEXT
        ),        
        GeminiModels.flash_stable: ModelInfo(
            name=GeminiModels.flash_stable,
            provider=Gemini,
            core_mode=Modality.TEXT
        ),        
        GeminiModels.gemma_26b: ModelInfo(
            name=GeminiModels.gemma_26b,
            provider=Gemini,
            core_mode=Modality.TEXT
        ),        
        GeminiModels.gemma_31b: ModelInfo(
            name=GeminiModels.gemma_31b,
            provider=Gemini,
            core_mode=Modality.TEXT
        ),
    }
    LEONARDO = {
        LeonardoModels.flux_schnell: ModelInfo(
            name=LeonardoModels.flux_schnell,
            provider=Leonardo,
            core_mode=Modality.IMAGE
        )
    }
    PUTTER = {
        PutterModels.gpt_image_2: ModelInfo(
            name=PutterModels.gpt_image_2,
            provider=Putter,
            core_mode=Modality.IMAGE
        ),
    }
    NVIDIA = {
        NvidiaModels.meta_glimmer_30b: ModelInfo(
            name=NvidiaModels.meta_glimmer_30b,
            provider=Nvidia,
            core_mode=Modality.IMAGE | Modality.TEXT
        )
    }
    MISTRAL = {
        NvidiaModels.nemotron_3_5: ModelInfo(
            name=NvidiaModels.meta_glimmer_30b,
            provider=Nvidia,
            core_mode=Modality.TEXT
        )
    }
    HUGGING_FACE = {
        HuggingModels.black_forest: ModelInfo(
            name=HuggingModels.black_forest,
            provider=Hugging,
            core_mode=Modality.IMAGE
        )
    }
    NIGHTCAFE = {
        
    }
    OPENROUTER = {
        OpenrouterModels.nvidia_3_ultra: ModelInfo(
            name=OpenrouterModels.nvidia_3_ultra,
            provider=OpenRouter,
            core_mode=Modality.TEXT
        ),        
        OpenrouterModels.google_gemma_4: ModelInfo(
            name=OpenrouterModels.google_gemma_4,
            provider=OpenRouter,
            core_mode=Modality.TEXT
        ),        
        OpenrouterModels.openrouter_free: ModelInfo(
            name=OpenrouterModels.openrouter_free,
            provider=OpenRouter,
            core_mode=Modality.TEXT
        ),
    }
    BING = {
        BingModels.bing_2_5_image: ModelInfo(
            name=BingModels.bing_2_5_image,
            provider=Bing,
            core_mode=Modality.IMAGE
        )
    }
    ALL = {
        **GEMINI,
        **PUTTER
    }


class Model:
    def __init__(self, model: str):
        self.model_name = model
        self.info = self._get_model_info()
        self.client = self.info.provider(self.model_name)

    def _get_model_info(self) -> ModelInfo:
        try:
            return Models.ALL[self.model_name]
        except KeyError:
            raise ValueError(
                f"Unknown model: {self.model_name}"
            )

    @classmethod
    def all_models(cls, _type: Modality | None = None) -> list[ModelInfo]:
        if _type is None:
            return list(Models.ALL.values())

        return [
            model
            for model in Models.ALL.values()
            if model.core_mode == _type
        ]
