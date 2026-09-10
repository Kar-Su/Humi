from __future__ import annotations

import re
from typing import Protocol

EMOTION_TAG = re.compile(
    r"^\s*\[(happy|sad|angry|excited|calm|nervous|confident|surprised|satisfied|delighted|scared|worried|upset|frustrated|depressed|empathetic|embarrassed|disgusted|moved|proud|relaxed|grateful|curious|sarcastic)\]\s*"
)


def parse_emotion(text: str) -> tuple[str, str]:
    m = EMOTION_TAG.match(text)
    if m:
        return m.group(1), text[m.end() :]
    return "netral", text


def split_sentence(buffer: str) -> tuple[str, str]:
    match = re.search(r"[.!?…]+", buffer)
    if match:
        end = match.end()
        return buffer[:end], buffer[end:]
    return "", buffer


class RateLimitError(Exception):
    pass


class LLMProvider(Protocol):
    model: str

    async def stream(
        self, history: list[dict], on_sentence, is_interrupted, lang: str = "id"
    ) -> None: ...
