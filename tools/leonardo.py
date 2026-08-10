from dataclasses import dataclass

from network import Request


@dataclass(frozen=True)
class LeonardoModels:
    ...

class LeonardoBase(Request):
    def __init__(self):
        super().__init__()

    ...


class LeonardoImage(Request):
    ...

