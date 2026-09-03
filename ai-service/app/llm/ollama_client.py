from __future__ import annotations

import json

import httpx

from app.llm.base import parse_emotion, split_sentence
from app.persona import build_messages


class OllamaLLM:
    def __init__(self, base_url: str, model: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def stream(self, history: list[dict], on_sentence, is_interrupted) -> None:
        payload = {
            "model": self.model,
            "messages": build_messages(history),
            "stream": True,
            "think": False,
        }
        seq = 0
        buffer = ""
        async with httpx.AsyncClient(timeout=300) as client:
            async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    try:
                        chunk = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if is_interrupted():
                        break
                    if chunk.get("done"):
                        break
                    delta = chunk.get("message", {}).get("content", "")
                    buffer += delta
                    sentence, rest = split_sentence(buffer)
                    if sentence:
                        emotion, clean = parse_emotion(sentence)
                        seq += 1
                        await on_sentence(seq, clean.strip(), emotion)
                        buffer = rest
        if buffer.strip() and not is_interrupted():
            seq += 1
            emotion, clean = parse_emotion(buffer)
            await on_sentence(seq, clean.strip(), emotion)
