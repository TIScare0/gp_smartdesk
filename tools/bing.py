import time
import urllib.parse
from dataclasses import dataclass

from network import Request
from utils import create_filename, determine_ext, save_file


@dataclass(frozen=True)
class BingModels:
    bing_2_5_image: str = 'MAI-Image-2.5-Flash'


class Bing(Request):
    def __init__(self, model: str):
        super().__init__()
        self.model = model

    def txt2img(self, prompt, path=None):
        if self.model == BingModels.bing_2_5_image:
            response_url = self.request(
                'https://www.bing.com/images/create/ai-image-generator',
                headers={
                    'content-type': 'application/x-www-form-urlencoded',
                    'referer': 'https://www.bing.com/',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
                },
                params={
                    'FORM': 'GENCRE',
                    'ctype': 'image',
                    'mdl': 10,
                    'ar': 4,
                    'rt': 4,
                    'q': prompt
                },
                method='POST',
            ).url
            parsed_url = urllib.parse.parse_qs(
                urllib.parse.urlparse(response_url).query)
            _id = (parsed_url.get('id') or [None])[0]
            if not _id:
                return {
                    'status': False,
                    'error': 'Id param not found.'
                }

            while True:
                data = self.download_json(
                    f'https://www.bing.com/images/create/ai-image-generator/async/results/{_id}')
                if data.get('status') >= 1:
                    try:
                        url = data.get('records', [])[0].get(
                            'mediaItems', [None])[0].get('src')
                    except Exception:
                        return {
                            'status': False,
                            'error': 'Unable to get Url'
                        }
                    filename = create_filename(
                        prompt, determine_ext(url, default_ext='jpeg'))
                    saved_path = f'{path}/{filename}' if path else filename
                    save_file(
                        filename=saved_path,
                        data=self.request(url).content,
                        _type='wb'
                    )
                    return {
                        'status': True,
                        'response': saved_path
                    }
                time.sleep(3)
