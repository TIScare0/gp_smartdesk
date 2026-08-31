import re
from enum import Flag, auto


class Intents(Flag):
    IMAGES = auto()
    CHAT = auto()


class IntentRouter:
    ACTION_WORDS = r"(generate|create|make|draw|render|paint|design|sketch|illustrate|produce)"
    IMAGE_NOUNS = r"(image|picture|photo|pic|illustration|drawing|painting|artwork|graphic|logo|icon|wallpaper|avatar|poster)"
    PATTERNS = [
        re.compile(rf"\b{ACTION_WORDS}\b.{{0,20}}\b{IMAGE_NOUNS}\b", re.IGNORECASE),
        re.compile(rf"\b{IMAGE_NOUNS}\b.{{0,20}}\bof\b", re.IGNORECASE),  # "picture of a cat"
        re.compile(r"\bshow me (a|an)\b.{0,20}\b(picture|image|photo)\b", re.IGNORECASE),
        re.compile(r"\btext[- ]?to[- ]?image\b", re.IGNORECASE),
        re.compile(r"\bimg2img|txt2img\b", re.IGNORECASE),
    ]
    NEGATIVE_PATTERNS = [
        re.compile(r"\b(report|summary|plan|list|table|document|essay|code|script|function|email|story|poem|outline|presentation|spreadsheet)\b", re.IGNORECASE),
    ]

    def detect(self, text: str, is_api_safe: bool = False):
        text = (text or "").strip()

        if not text:
            return self._respond(Intents.CHAT, is_api_safe)

        if any(p.search(text) for p in self.NEGATIVE_PATTERNS):
            return self._respond(Intents.CHAT, is_api_safe)

        if any(p.search(text) for p in self.PATTERNS):
            return self._respond(Intents.IMAGES, is_api_safe)

        return self._respond(Intents.CHAT, is_api_safe)

    @staticmethod
    def _respond(intent: Intents, is_api_safe: bool):
        return {"result": intent.name} if is_api_safe else intent
