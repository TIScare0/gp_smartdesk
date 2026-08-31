from dataclasses import dataclass

from cohere import ClientV2
from cohere.core.api_error import ApiError

from config import COHERE_API_KEY


@dataclass(frozen=True)
class CohereModels:
    cohere_03: str = 'command-a-03-2025'


class Cohere:
    def __init__(self, model: str):
        self.model = model
        self.client = ClientV2(api_key=COHERE_API_KEY)
        self.system_prompt = ''

    def txt2txt(self, prompt):
        try:
            data = self.client.chat(
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
                ], #type: ignore
            )
            return {
                'status': True,
                'response': data.message.content[0].text #type: ignore
            }
        except Exception as e:
            if isinstance(e, ApiError) and e.status_code >= 402: #type: ignore
                return {
                    'status': False,
                    'error': 'Usage limit exceeded'
                }
            return {
                'status': False,
                'error': f'Unkown expected occured; Error: {e!s}'
            }
