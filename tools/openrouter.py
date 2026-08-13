from dataclasses import dataclass

import inspect

from openrouter import OpenRouter as OpenRouterAI
from openrouter.errors import OpenRouterError
from openrouter import RetryConfig
from config import env_item

@dataclass(frozen=True)
class OpenrouterModels:
    openrouter_free: str = 'openrouter/free'
    nvidia_3_ultra: str = 'nvidia/nemotron-3-ultra-550b-a55b:free'
    google_gemma_4: str = 'google/gemma-4-26b-a4b-it:free'


class OpenRouter:
    def __init__(self, model: str):
        self.model = model
        self.client = OpenRouterAI(
            env_item('OPENROUTER_API_KEY'),
            timeout_ms=30000
        )

    def txt2txt(self, prompt):
        try:
            data = self.client.chat.send(
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
        except OpenRouterError as e:
            if e.status_code == 429:
                return {'status': False, 'error': 'Rate limit exceeded'}
            if e.status_code == 402:
                return {'status': False, 'error': 'Insufficient credits'}
            return {'status': False, 'error': str(e)}
        except Exception as e:
            return {'status': False, 'error': f'Unknown error occurred; Error: {e}'}
