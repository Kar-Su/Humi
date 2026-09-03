from __future__ import annotations

import json

import httpx

from app.llm.base import RateLimitError, parse_emotion, split_sentence
from app.persona import build_messages


class GroqLLM:
    def __init__(self, api_key: str, model: str) -> None:
        if not api_key:
            raise ValueError("GROQ_API_KEY kosong — set di .env")
        self.api_key = api_key
        self.model = model

    async def stream(self, history: list[dict], on_sentence, is_interrupted) -> None:
        payload = {"model": self.model, "messages": build_messages(history), "stream": True}
        headers = {"Authorization": f"Bearer {self.api_key}"}
        seq = 0
        buffer = ""
        skipping_think = False
        async with httpx.AsyncClient(timeout=300) as client:
            async with client.stream(
                "POST",
                "https://api.groq.com/openai/v1/chat/completions",
                json=payload,
                headers=headers,
            ) as resp:
                if resp.status_code == 429:
                    raise RateLimitError("groq 429 rate limited")
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
                    # ponytail: Groq Qwen <think> bisa bocor di streaming content
                    if skipping_think:
                        if "</think>" in delta:
                            delta = delta.split("</think>", 1)[1]
                            skipping_think = False
                        else:
                            continue
                    if "<think>" in delta:
                        before, after = delta.split("<think>", 1)
                        if "</think>" in after:
                            delta = before + after.split("</think>", 1)[1]
                        else:
                            delta = before
                            skipping_think = True
                            if not delta:
                                continue
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
