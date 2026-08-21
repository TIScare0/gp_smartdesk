from dataclasses import dataclass

from google import genai
from google.genai._gaos.lib.compat_errors import RateLimitError

from config import env_item
from network import Request


@dataclass(frozen=True)
class GeminiModels:
    flash = 'gemini-3.6-flash'
    flash_lite = "gemini-3.1-flash-lite"
    flash_previous = "gemini-3-flash"


class GeminiBase(Request):
    def __init__(self, model: str):
        super().__init__()
        self.model = model
        self.client = genai.Client(api_key=env_item('GEMINI_API_KEY'))
        self.system_prompt = ''

    def base_interaction(self, prompt, **kwargs):
        try:
            interaction = self.client.interactions.create(model=self.model, input=prompt, system_instruction=self.system_prompt, **kwargs)
            return {
                'status': True,
                'response': interaction
            }
        except RateLimitError:
            return {
                'status': False,
                'error': 'Rate Limit Error'
            }


class Gemini(GeminiBase):
    def __init__(self, model: str):
        super().__init__(model)

    def txt2txt(self, prompt) -> dict:
        data = self.base_interaction(prompt)
        if resp := data.get('response'):
            data['response'] = resp.output_text
        return data
