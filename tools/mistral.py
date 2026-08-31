from dataclasses import dataclass

from mistralai.client import Mistral as MistralAI
from mistralai.client.errors import MistralError

from config import MISTRAL_API_KEY


@dataclass(frozen=True)
class MistralModels:
    mistral_3b: str = 'ministral-3b-2512'
    mistral_8b: str = 'ministral-8b-2512'


class Mistral:
    def __init__(self, model: str):
        self.model = model
        self.client = MistralAI(api_key=MISTRAL_API_KEY)
        self.system_prompt = ''

    def txt2txt(self, prompt: str):
        try:
            data = self.client.chat.complete(
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
            )
            return {
                'status': True,
                'response': data.choices[0].message.content #type: ignore
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
