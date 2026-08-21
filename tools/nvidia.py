import base64
import mimetypes
from dataclasses import dataclass

from openai import APIError, OpenAI

from config import env_item


@dataclass(frozen=True)
class NvidiaModels:
    nemotron_3_5: str = 'nvidia/nemotron-3.5-lightning-30b-a3b'
    meta_glimmer_30b: str = 'meta/muse-glimmer-30b'


class Nvidia:
    def __init__(self, model: str, thinking: bool = False):
        self.thinking = thinking
        self.model = model
        self.client = OpenAI(
            api_key=env_item('NVIDIA_API_KEY'),
            base_url='https://integrate.api.nvidia.com/v1'
        )
        self.system_prompt = ''

    def txt2txt(self, prompt):
        try:
            data = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        'role': 'user',
                        'content': prompt
                    },
                    {
                        'role': 'system',
                        'content': self.system_prompt
                    }
                ],
                stream=False,
                temperature=1,
                top_p=0.95,
                max_tokens=16384,
                extra_body={"chat_template_kwargs": {
                    "enable_thinking": self.thinking}, "reasoning_budget": 16384},
            )
            return {
                'status': True,
                'response': data.choices[0].message.content
            }
        except Exception as e:
            if isinstance(e, APIError) and e.code == 429:
                return {
                    'status': False,
                    'error': 'Rate limit wait for 1 min'
                }
            return {
                'status': False,
                'error': f'Unkown error occurred; Error: {e!s}'
            }

    def image_url(self, image_path_or_url: str) -> str:
        if image_path_or_url.startswith(("http://", "https://")):
            return image_path_or_url
        mime_type, _ = mimetypes.guess_type(image_path_or_url)
        if mime_type is None or not mime_type.startswith("image/"):
            raise ValueError("Unsupported image format")
        with open(image_path_or_url, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
        return f"data:{mime_type};base64,{b64}"

    def image2txt(self, prompt: str, image_path_or_url: str):
        try:
            data = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt,
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": self.image_url(image_path_or_url),
                                },
                            },
                        ],
                    }
                ],
                stream=False,
                temperature=1,
                top_p=0.95,
                max_tokens=16384,
                extra_body={"chat_template_kwargs": {
                    "enable_thinking": self.thinking}},
            )
            return {
                'status': True,
                'response': data.choices[0].message.content
            }
        except Exception as e:
            print(e)
            if isinstance(e, APIError):
                if e.code == 400:
                    return {
                        'status': False,
                        'error': 'Model does not support image to text'
                    }
                elif e.code == 429:
                    return {
                        'status': False,
                        'error': 'Rate limit exceeded'
                    }
            return {
                'status': False,
                'error': f'Unkown error occurred; Error: {e!s}'
            }
