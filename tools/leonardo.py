from dataclasses import dataclass

from network import Request, AppError
from config import (
    env_item,
    update_env_item
)

@dataclass(frozen=True)
class LeonardoModels:
    flux_schnell: str = 'flux-schnell'


class LeonardoBase(Request):
    def __init__(self):
        super().__init__()
        self.session_token  = env_item('LEONARDO_SESSION_TOKEN')
        self.refresh_token = env_item('LEONARDO_REFRESH_TOKEN')
        self.access_token = env_item('LEONARDO_ACCESS_TOKEN')
        self.user_id = None

    def refresh_session(self):
        data = self.download_json(
            'https://app.leonardo.ai/api/auth/get-session',
            headers={
                'Accept': '*/*'
            },
            cookies={
                '__Secure-better-auth.session_data.0': self.access_token,
                '__Secure-better-auth.session_data.1': self.refresh_token,
                '__Secure-better-auth.session_token': self.session_token
            }
        )
        if not data:
            return {
                'status': False,
                'error': 'Logged out need relogin'
            }
        session_data = data.get('session', {})
        access_token = session_data.get('accessToken')
        user_id = session_data.get('userId')
        if not (access_token and user_id):
            return {
                'status': False,
                'error': 'Logged out need relogin'
            }
        self.user_id = user_id
        self.access_token = access_token
        update_env_item('LEONARDO_ACCESS_TOKEN', self.access_token)

    def _call_graphql(self, query: str, operationame: str, variables: dict, **kwargs):
        try:
            response = self.download_json(
                    'https://api.leonardo.ai/v1/graphql',
                    json={
                        'operationName': operationame,
                        'query': query,
                        'variables': variables,
                    },
                    headers={
                        'Authorization': 'Bearer ' + str(self.access_token),
                        'Referer': 'https://app.leonardo.ai/',
                        'x-leo-schema-version': '1.258.8',
                    },
                    **kwargs
                )
            if errors := response.get('errors'):
                return {
                    'status': False,
                    'error': errors[0].get('message')
                }
            return {
                'status': True,
                **response['data']
            }
        except Exception as e:
            if isinstance(e, AppError):
                if  e.status_code == 429:
                    return {
                        'status': False,
                        'error': 'Usage limit reached'
                    }
                elif e.status_code == 400:
                    return {
                        'status': False,
                        'error': 'Maybe Too many image added, Something else'
                    }
                elif e.status_code == 403:
                    return {
                        'status': False,
                        'error': 'Adult Content banned'
                    }
                elif e.status_code == 402:
                    return {
                        'status': False,
                        'error': 'Usage limit added',
                    }
            return {
                'status': False,
                'error': f'Unkown Error occurred; Error: {str(e)}'
            }


class Leonardo(LeonardoBase):
    MODEL_STYLE_MAP = {
        'flux-schnell': '111dc692-d470-4eec-b791-3475abac4c46'
    }

    def __init__(self, model:str):
        super().__init__()
        self.model = model
        self.refresh_session()

    def txt2image(self, prompt:str):
        generate = self._call_graphql(
            '''
            mutation Generate($request: CreateGenerationRequest!) {
                generate(request: $request) {
                    apiCreditCost
                    generationId
                }
            }
            ''',
            operationame='Generate',
            variables={
                "request":{
                    "model":self.model,
                    "public":True,
                    "parameters":{
                        "height":672,
                        "width":1184,
                        "prompt_enhance":"AUTO",
                        "quantity":4,
                        "style_ids":[
                            self.MODEL_STYLE_MAP[self.model]
                        ],
                        "prompt":prompt
                    }
                }
            }
        )
        if not generate.get('status'):
            return generate
        generate = generate['generate']
        generationId = generate.get('generationId')
        while True:
            data = self._call_graphql(
                '''
                query GetAIGenerationFeedStatuses($where: generations_bool_exp = {}) {
                    generations(where: $where) {
                        id
                        status
                        __typename
                    }
                }
                ''',
                operationame='GetAIGenerationFeedStatuses',
                variables={
                    "where": {
                    "id": { "_in": [generationId] },
                    "status": { "_in": ["PENDING", "COMPLETE", "FAILED"] }
                    }
                }
            )
            if not data.get('status'):
                return data
            data = data['generations'][0]
            if data.get('status') == 'COMPLETE':
                generated = self._call_graphql(
                    '''
                    query GetAIGenerationFeed($where: generations_bool_exp = {}, $limit: Int, $offset: Int = 0) {
                        generations(
                            limit: $limit
                            offset: $offset
                            order_by: [{createdAt: desc}]
                            where: $where
                        ) {
                            generated_images {
                                url
                            }
                        }
                    }
                    ''',
                    operationame='GetAIGenerationFeed',
                    variables={
                        "where": {
                            "userId": {
                                "_eq": self.user_id
                            },
                            "teamId": {
                                "_is_null": True
                            },
                            "canvasRequest": {
                                "_eq": False
                            },
                            "_and": [
                                {
                                    "source": {
                                        "_neq": "BLUEPRINTS"
                                    }
                                },
                                {
                                    "source": {
                                        "_neq": "LIGHTNING_STREAM"
                                    }
                                },
                                {
                                    "universalUpscaler": {
                                        "_is_null": True
                                    }
                                }
                            ]
                        },
                        "offset": 0,
                        "limit": 20
                    }
                )
                if not generated.get('status'):
                    return generated
                try:
                    generated_image_url = generated['generations'][0]['generated_images'][0].get('url')
                    return {
                        'status': True,
                        'response': generated_image_url
                    }
                except Exception:
                    return {
                        'status': False,
                        'error': 'Image url not found'
                    }
