from dataclasses import dataclass

from network import Request


@dataclass(frozen=True)
class LeonardoModels:
    flux_schnell: str = 'flux-schnell'


class LeonardoBase(Request):
    def __init__(self):
        super().__init__()

    def _call_graphql(self, query, operationame, variables, **kwargs):
        ...

    def _refresh_token(self, token):
        ...


class Leonardo(LeonardoBase):
    def __init__(self):
        super().__init__()
