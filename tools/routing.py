from enum import Flag, auto
from fastembed import TextEmbedding

class Intents(Flag):
    IMAGES = auto()
    AUDIO = auto()
    PAPER_SOLVER = auto()
    CHAT = auto()


class IntentRouter:
    INTENTS = {
        Intents.IMAGES: [
            "generate an image",
            "create a picture",
            "draw something",
            "make an illustration",
            "generate a photo",
            "create an image",
        ],
        Intents.AUDIO: [
            "generate audio",
            "create speech",
            "generate a voice",
            "text to speech",
            "create an audio",
        ],
        Intents.PAPER_SOLVER: [
            "solve this question paper",
            "solve this exam paper",
            "answer these questions",
            "solve this worksheet",
            "solve this paper",
        ],
    }

    def __init__(self):
        self.embed_model = TextEmbedding()
        self.intents = {
            name: [
                self._embed(text)
                for text in examples
            ]
            for name, examples in self.INTENTS.items()
        }

    def _embed(self, text: str):
        return next(self.embed_model.embed([text])) #type: ignore

    @staticmethod
    def _similarity(a, b):
        return float(
            a @ b
            / ((a @ a) ** 0.5 * (b @ b) ** 0.5)
        )

    def detect(self, text: str):
        print("EMBED TEXT:", repr(text))
        print("TYPE:", type(text))
        embedding = self._embed(text)

        scores = {
            intent: max(
                self._similarity(embedding, example)
                for example in examples
            )
            for intent, examples in self.intents.items()
        }

        intent, score = max(
            scores.items(),
            key=lambda item: item[1],
        )

        if score < 0.65:
            return Intents.CHAT

        return intent
