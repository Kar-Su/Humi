from __future__ import annotations

import json

import httpx

from app.llm.base import RateLimitError, parse_emotion, split_sentence
from app.persona import build_messages


class OpenRouterLLM:
    def __init__(self, api_key: str, model: str) -> None:
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY kosong — set di .env")
        self.api_key = api_key
        self.model = model

    async def stream(self, history: list[dict], on_sentence, is_interrupted) -> None:
        payload = {"model": self.model, "messages": build_messages(history), "stream": True}
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://github.com/Kar-Su/Humi",
        }
        seq = 0
        buffer = ""
        async with httpx.AsyncClient(timeout=300) as client:
            async with client.stream(
                "POST",
                "https://openrouter.ai/api/v1/chat/completions",
                json=payload,
                headers=headers,
            ) as resp:
                if resp.status_code == 429:
                    raise RateLimitError("openrouter 429 rate limited")
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                    except json.JSONDecodeError:
                        continue
                    if is_interrupted():
                        break
                    delta = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                    if not delta:
                        continue
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
