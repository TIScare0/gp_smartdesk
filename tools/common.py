from __future__ import annotations

from dataclasses import dataclass
from enum import Flag, auto
from typing import Any, Callable, Mapping

from .bing import Bing, BingModels
from .cohere import Cohere, CohereModels
from .gemini import Gemini, GeminiModels
from .mistral import Mistral, MistralModels
from .nvidia import Nvidia, NvidiaModels
from .openrouter import OpenRouter, OpenrouterModels

from cache import load_cache, save_cache


class Modality(Flag):
    TEXT = auto()
    IMAGE = auto()


@dataclass(frozen=True)
class ModelLimit:
    rps: float | None = None
    rpm: int | None = None
    tpm: int | None = None
    rpd: int | None = None
    monthly_requests: int | None = None
    images: int | None = None
    cooldown: int | None = None
    daily_requests: int | None = None


@dataclass(frozen=True)
class ModelInfo:
    name: str
    provider: type
    core_mode: Modality
    limits: ModelLimit


class Models:
    GEMINI = {
        GeminiModels.flash: ModelInfo(
            name=GeminiModels.flash,
            provider=Gemini,
            core_mode=Modality.TEXT,
            limits=ModelLimit(
                rpm=5,
                tpm=250_000,
                rpd=20,
            ),
        ),
        GeminiModels.flash_lite: ModelInfo(
            name=GeminiModels.flash_lite,
            provider=Gemini,
            core_mode=Modality.TEXT,
            limits=ModelLimit(
                rpm=15,
                tpm=250_000,
                rpd=500,
            ),
        ),
        GeminiModels.flash_lite_previous: ModelInfo(
            name=GeminiModels.flash_lite_previous,
            provider=Gemini,
            core_mode=Modality.TEXT,
            limits=ModelLimit(
                rpm=15,
                tpm=250_000,
                rpd=500,
            ),
        ),
        GeminiModels.flash_previous: ModelInfo(
            name=GeminiModels.flash_previous,
            provider=Gemini,
            core_mode=Modality.TEXT,
            limits=ModelLimit(
                rpm=5,
                tpm=250_000,
                rpd=20,
            ),
        ),
        GeminiModels.flash_stable: ModelInfo(
            name=GeminiModels.flash_stable,
            provider=Gemini,
            core_mode=Modality.TEXT,
            limits=ModelLimit(
                rpm=5,
                tpm=250_000,
                rpd=20,
            ),
        ),
        GeminiModels.gemma_26b: ModelInfo(
            name=GeminiModels.gemma_26b,
            provider=Gemini,
            core_mode=Modality.TEXT,
            limits=ModelLimit(
                rpm=30,
                tpm=16_000,
                rpd=14_400,
            ),
        ),
        GeminiModels.gemma_31b: ModelInfo(
            name=GeminiModels.gemma_31b,
            provider=Gemini,
            core_mode=Modality.TEXT,
            limits=ModelLimit(
                rpm=30,
                tpm=16_000,
                rpd=14_400,
            ),
        ),
    }

    NVIDIA = {
        NvidiaModels.meta_glimmer_30b: ModelInfo(
            name=NvidiaModels.meta_glimmer_30b,
            provider=Nvidia,
            core_mode=Modality.IMAGE | Modality.TEXT,
            limits=ModelLimit(
                rpm=40,
            ),
        ),
    }

    MISTRAL = {
        MistralModels.mistral_3b: ModelInfo(
            name=MistralModels.mistral_3b,
            provider=Mistral,
            core_mode=Modality.TEXT,
            limits=ModelLimit(
                tpm=1_300_000,
                rpm=750,
            ),
        ),
        MistralModels.mistral_8b: ModelInfo(
            name=MistralModels.mistral_8b,
            provider=Mistral,
            core_mode=Modality.TEXT,
            limits=ModelLimit(
                tpm=625_000,
                rpm=187,
            ),
        ),
    }

    OPENROUTER = {
        OpenrouterModels.nvidia_3_ultra: ModelInfo(
            name=OpenrouterModels.nvidia_3_ultra,
            provider=OpenRouter,
            core_mode=Modality.TEXT,
            limits=ModelLimit(
                rpm=12,
                daily_requests=30,
                monthly_requests=900,
            ),
        ),
        OpenrouterModels.openrouter_free: ModelInfo(
            name=OpenrouterModels.openrouter_free,
            provider=OpenRouter,
            core_mode=Modality.TEXT,
            limits=ModelLimit(
                rpm=8,
                daily_requests=20,
                monthly_requests=600,
            ),
        ),
    }

    BING = {
        BingModels.bing_2_5_image: ModelInfo(
            name=BingModels.bing_2_5_image,
            provider=Bing,
            core_mode=Modality.IMAGE,
            limits=ModelLimit(
                images=20,
                cooldown=30,
            ),
        ),
    }

    COHERE = {
        CohereModels.cohere_03: ModelInfo(
            name=CohereModels.cohere_03,
            provider=Cohere,
            core_mode=Modality.TEXT,
            limits=ModelLimit(
                rpm=20,
                monthly_requests=1_000,
            ),
        ),
    }

    ALL = {
        **GEMINI,
        **NVIDIA,
        **MISTRAL,
        **OPENROUTER,
        **BING,
        **COHERE,
    }


ProviderFactory = Callable[[ModelInfo], Any]


class Model:
    def __init__(
        self,
        providers: Mapping[type, Any] | None = None,
        factories: Mapping[type, ProviderFactory] | None = None,
    ):
        self._providers = dict(providers or {})
        self._factories = dict(factories or {})

    @staticmethod
    def _get_model_info(model_name: str) -> ModelInfo:
        try:
            return Models.ALL[model_name]
        except KeyError:
            raise ValueError(f"Unknown model: {model_name}") from None

    @classmethod
    def all_models(
        cls,
        _type: Modality | None = None,
    ) -> list[ModelInfo]:
        if _type is None:
            return list(Models.ALL.values())

        return [
            model
            for model in Models.ALL.values()
            if model.core_mode & _type
        ]

    @classmethod
    def model_names(
        cls,
        _type: Modality | None = None,
    ) -> list[str]:
        return [
            model.name
            for model in cls.all_models(_type)
        ]

    @classmethod
    def providers(cls) -> list[type]:
        return list({
            model.provider
            for model in Models.ALL.values()
        })

    @classmethod
    def provider_models(cls, provider: type) -> list[ModelInfo]:
        return [
            model
            for model in Models.ALL.values()
            if model.provider is provider
        ]

    def info(self, model_name: str) -> ModelInfo:
        return self._get_model_info(model_name)

    def limits(self, model_name: str) -> ModelLimit:
        return self.info(model_name).limits

    def provider(self, model_name: str) -> Any:
        info = self.info(model_name)

        if info.provider in self._providers:
            return self._providers[info.provider]

        if info.provider in self._factories:
            provider = self._factories[info.provider](info)
            self._providers[info.provider] = provider
            return provider

        try:
            provider = info.provider()
        except TypeError as exc:
            raise TypeError(
                f"No provider injection or factory configured for {info.provider.__name__}"
            ) from exc

        self._providers[info.provider] = provider
        return provider

    def model(self, model_name: str) -> Any:
        return self.provider(model_name)

    def load(self, model_name: str) -> tuple[Any, ModelInfo]:
        info = self.info(model_name)
        return self.model(model_name), info

    def save_limits(self, model_name: str) -> None:
        info = self.info(model_name)
        save_cache(
            f"model_{model_name}_limits",
            {
                "name": info.name,
                "provider": info.provider.__name__,
                "core_mode": info.core_mode.value,
                "limits": {
                    key: value
                    for key, value in vars(info.limits).items()
                    if value is not None
                },
            },
        )

    def cached_limits(self, model_name: str) -> dict:
        return load_cache(
            f"model_{model_name}_limits",
            default={},
        )
