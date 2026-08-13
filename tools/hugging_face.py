from dataclasses import dataclass
from pathlib import Path

from config import env_item
from huggingface_hub import InferenceClient
from huggingface_hub.errors import HfHubHTTPError

from utils import create_filename


@dataclass(frozen=True)
class HuggingModels:
    black_forest: str = 'black-forest-labs/FLUX.1-schnell'


class Hugging:
    def __init__(self, model:str):
        self.model = model
        self.client = InferenceClient(
            provider='auto',
            api_key=env_item('HUGGING_FACE')
        )

    def txt2image(self, prompt, path=None):
        try:
            image = self.client.text_to_image(
                prompt,
                model=self.model
            )
            filename = create_filename(prompt, 'png')
            save_path = Path(path) / filename if path else Path(filename)
            image.save(save_path)
            return {
                'status': True,
                'response': save_path,
            }
        except Exception as e:
            if isinstance(e, HfHubHTTPError) and e.response.status_code == 402:
                return {
                    'status': False,
                    'error': 'Usage limit exceeded'
                }
            return {
                'status': False,
                'error': 'Unkown error occured'
            }
