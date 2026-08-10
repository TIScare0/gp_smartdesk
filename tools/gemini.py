from google import genai
from google.cloud import monitoring_v3
from dataclasses import dataclass

from config import env_item
from network import Request


@dataclass(frozen=True)
class ModelLimit:
    rpm: int | None = None
    tpm: int | None = None
    rpd: int | None = None


@dataclass(frozen=True)
class GeminiModel:
    name: str
    limits: ModelLimit


class GeminiModels:
    flash = GeminiModel(
        name="gemini-3.6-flash",
        limits=ModelLimit(
            rpm=5,
            tpm=250_000,
            rpd=20,
        ),
    )

    flash_previous = GeminiModel(
        name="gemini-3-flash",
        limits=ModelLimit(
            rpm=5,
            tpm=250_000,
            rpd=20,
        ),
    )

    flash_stable = GeminiModel(
        name="gemini-2.5-flash",
        limits=ModelLimit(
            rpm=5,
            tpm=250_000,
            rpd=20,
        ),
    )

    flash_lite = GeminiModel(
        name="gemini-3.1-flash-lite",
        limits=ModelLimit(
            rpm=15,
            tpm=250_000,
            rpd=500,
        ),
    )

    flash_lite_previous = GeminiModel(
        name="gemini-3.5-flash-lite",
        limits=ModelLimit(
            rpm=15,
            tpm=250_000,
            rpd=500,
        ),
    )

    gemma_26b = GeminiModel(
        name="gemma-4-26b",
        limits=ModelLimit(
            rpm=30,
            tpm=16_000,
            rpd=14_400,
        ),
    )

    gemma_31b = GeminiModel(
        name="gemma-4-31b",
        limits=ModelLimit(
            rpm=30,
            tpm=16_000,
            rpd=14_400,
        ),
    )

    tts = GeminiModel(
        name="gemini-3.1-flash-tts",
        limits=ModelLimit(
            rpm=3,
            tpm=10_000,
            rpd=10,
        ),
    )


class Usage:
    requests = 0
    input_tokens = 0
    output_tokens = 0
    total_tokens = 0


class GeminiBase(Request):
    def __init__(self):
        super().__init__()
        self.client = genai.Client(api_key=env_item('GEMINI_API_KEY'))
        self.monitor_client = monitoring_v3.MetricServiceClient()

    @staticmethod
    def usage():
        return {
            "requests": Usage.requests,
            "input_tokens": Usage.input_tokens,
            "output_tokens": Usage.output_tokens,
            "total_tokens": Usage.total_tokens,
        }

    @staticmethod
    def update_usage(usage_metadata):
        Usage.requests += 1
        Usage.input_tokens += usage_metadata.prompt_token_count or 0
        Usage.output_tokens += usage_metadata.candidates_token_count or 0
        Usage.total_tokens += usage_metadata.total_token_count or 0

class GeminiChat(GeminiBase):
    def __init__(self):
        super().__init__()

    def txt2txt(self, prompt):...
