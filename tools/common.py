from enum import Flag, auto
from typing import Any

from .model import Model


class ResponseTypes(Flag):
    model = auto()
    pdf = auto()
    piper = auto()
    paper_solver= auto()
    scanner = auto()


class Response:
    typ: ResponseTypes
    response: Any
    error: Any


class Tools(
    Model,
    
):
    def __init__(self) -> None:
        self.model = Model()