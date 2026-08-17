import random
from dataclasses import dataclass

from network import AppError, Request
from utils import create_filename, save_file


@dataclass(frozen=True)
class PerchanceModels:
    perc_anime: str = 'perchance-anime'
    perc_cinematic: str = 'perchance-cinematic'
    perc_oil_painting: str = 'perchance-oil-painting'
    perc_sketch: str = 'perchance-sketch'
    perc_normal: str = 'perchance-normal'


class Perchance(Request):
    def __init__(self, model: str):
        self.model: str = model
        super().__init__()

    PROMPT_MAP = {
        "anime": (
            "high-quality anime artwork, detailed anime illustration, "
            "clean lineart, expressive eyes, detailed hair, beautiful colors, "
            "soft lighting, polished shading, professional anime key visual, "
            "highly detailed, aesthetically pleasing composition."
        ),

        "cinematic": (
            "cinematic shot, dynamic lighting, professional composition, "
            "film still, cinematic color grading, depth of field, "
            "dramatic atmosphere, sharp focus, fine details, "
            "realistic lighting, visually striking, high-quality cinematic photography."
        ),

        "oil-painting": (
            "traditional oil painting, rich brush strokes, textured paint, "
            "classical artistic composition, rich colors, soft natural lighting, "
            "detailed painterly rendering, expressive brushwork, "
            "fine art aesthetic, beautiful and highly detailed."
        ),

        "sketch": (
            "detailed pencil sketch, hand-drawn artwork, clean pencil lines, "
            "realistic shading, cross-hatching, fine details, paper texture, "
            "natural proportions, artistic composition, traditional sketching style."
        ),

        "normal": (
            "high-quality digital artwork, detailed composition, natural lighting, "
            "balanced colors, sharp details, realistic proportions, "
            "clean rendering, aesthetically pleasing, professional quality."
        ),
    }

    def txt2img(self, prompt, path=None):
        try:
            headers = {
                'referer': 'https://image-generation.perchance.org/embed'}
            api_base = 'https://image-generation.perchance.org/api'
            cachebust = random.random()
            user_token_data = self.download_json(
                f'{api_base}/verifyUser',
                params={
                    'thread': 0,
                    '__cacheBust': cachebust
                },
                headers=headers
            )
            user_token = user_token_data['userKey']
            req_id = random.random()
            generated = self.download_json(
                f'{api_base}/generate',
                params={
                    'userKey': user_token,
                    'requestId': req_id,
                    'adAccessCode': '',
                    '__cacheBust': cachebust,
                },
                json={
                    'adAccessCode': "",
                    'channel': 'ai-text-to-image-generator',
                    'seed': random.randint(-5, 100),
                    'subChannel': "public",
                    'userKey': user_token,
                    'requestId': req_id,
                    'resolution': '768x512',
                    'prompt': f'{prompt},{self.PROMPT_MAP[self.model.removeprefix('perchance-')]}',
                    'negativePrompt': '',
                    'guidanceScale': 7,
                },
            )
            if generated.get('status') == 'success':
                ext = generated.get('fileExtension') or 'jpeg'
                image_url = api_base.removesuffix(
                    '/api') + generated.get('imageDownloadUrl')
                filename = create_filename(prompt, ext)
                filename = path.removesuffix(
                    '/') + '/' + filename if path else filename
                save_file(
                    filename=filename,
                    data=self.request(image_url).content,
                    _type='wb'
                )
                return {
                    'status': True,
                    'response': filename
                }
        except AppError as e:
            return {
                'status': False,
                'error': f'Unkown error occured, Error: {e!s}'
            }
