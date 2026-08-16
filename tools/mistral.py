from dataclasses import dataclass

from mistralai.client import Mistral as MistralAI
from mistralai.client.errors import MistralError

from config import env_item


@dataclass(frozen=True)
class MistralModels:
    mistral_3b: str = 'ministral-3b-2512'
    mistral_8b: str = 'ministral-8b-2512'


class Mistral:
    def __init__(self, model: str):
        self.model = model
        self.client = MistralAI(api_key=env_item('MISTRAL_API_KEY'))

    def txt2txt(self, prompt: str):
        try:
            data = self.client.chat.complete(
                model=self.model,
                messages=[{
                    'role': 'user',
                    'content': prompt
                }]
            )
            return {
                'status': True,
                'response': data.choices[0].message.content
            }
        except MistralError as e:
            if e.status_code == 429:
                return {
                    'status': False,
                    'error': 'Usage limit exceeded'
                }
            return {
                'status': False,
                'error': f'Unkown error occured; Error: {e!s}'
            }
