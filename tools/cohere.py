from dataclasses import dataclass

from cohere import ClientV2
from cohere.core.api_error import ApiError

from config import env_item


@dataclass(frozen=True)
class CohereModels:
    cohere_03: str = 'command-a-03-2025'


class Cohere:
    def __init__(self, model: str):
        self.model = model
        self.client = ClientV2(env_item('COHERE_API_KEY'))

    def txt2txt(self, prompt):
        try:
            data = self.client.chat(
                model=self.model,
                messages=[
                    {
                        'role': 'user',
                        'content': prompt,
                    }
                ]
            )
            return {
                'status': True,
                'response': data.message.content[0].text
            }
        except Exception as e:
            if isinstance(e, ApiError) and e.status_code >= 402:
                return {
                    'status': False,
                    'error': 'Usage limit exceeded'
                }
            return {
                'status': False,
                'error': f'Unkown expected occured; Error: {e!s}'
            }
