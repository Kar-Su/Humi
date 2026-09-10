from __future__ import annotations

import json
import logging
import time

import httpx

from app.llm.base import RateLimitError, parse_emotion, split_sentence
from app.persona import build_messages

logger = logging.getLogger("ai-service.llm.groq")

class GroqLLM:
    def __init__(self, api_key: str, model: str) -> None:
        if not api_key:
            raise ValueError("GROQ_API_KEY kosong — set di .env")
        self.api_key = api_key
        self.model = model

    async def stream(self, history: list[dict], on_sentence, is_interrupted) -> None:
        logger.info("[llm.groq] stream start model=%s history_len=%d", self.model, len(history))
        t0 = time.monotonic()
        payload = {"model": self.model, "messages": build_messages(history), "stream": True}
        headers = {"Authorization": f"Bearer {self.api_key}"}
        seq = 0
        buffer = ""
        skipping_think = False
        chunk_count = 0
        async with httpx.AsyncClient(timeout=300) as client:
            async with client.stream(
                "POST",
                "https://api.groq.com/openai/v1/chat/completions",
                json=payload,
                headers=headers,
            ) as resp:
                if resp.status_code == 429:
                    logger.warning("[llm.groq] 429 rate limited")
                    raise RateLimitError("groq 429 rate limited")
                resp.raise_for_status()
                logger.info("[llm.groq] http %d connected", resp.status_code)
                async for line in resp.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        logger.info(
                            "[llm.groq] DONE chunks=%d seq=%d elapsed=%.2fs",
                            chunk_count,
                            seq,
                            time.monotonic() - t0,
                        )
                        break
                    try:
                        chunk = json.loads(data)
                    except json.JSONDecodeError:
                        continue
                    if is_interrupted():
                        logger.info("[llm.groq] interrupted chunks=%d", chunk_count)
                        break
                    delta = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                    if not delta:
                        continue
                    chunk_count += 1
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
                        logger.info(
                            "[llm.groq] sentence seq=%d emotion=%s text=%r",
                            seq,
                            emotion,
                            clean[:60],
                        )
                        await on_sentence(seq, clean.strip(), emotion)
                        buffer = rest
        if buffer.strip() and not is_interrupted():
            seq += 1
            emotion, clean = parse_emotion(buffer)
            logger.info("[llm.groq] flush seq=%d emotion=%s text=%r", seq, emotion, clean[:60])
            await on_sentence(seq, clean.strip(), emotion)
        logger.info(
            "[llm.groq] stream done chunks=%d seq=%d buffer_remain=%d elapsed=%.2fs",
            chunk_count,
            seq,
            len(buffer),
            time.monotonic() - t0,
        )
