from __future__ import annotations

import json
import logging
import time

import httpx

from app.llm.base import RateLimitError, parse_emotion, split_sentence
from app.persona import build_messages

logger = logging.getLogger("ai-service.llm.openrouter")


class OpenRouterLLM:
    def __init__(self, api_key: str, model: str) -> None:
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY kosong — set di .env")
        self.api_key = api_key
        self.model = model

    async def stream(
        self, history: list[dict], on_sentence, is_interrupted, lang: str = "id"
    ) -> None:
        logger.info(
            "[llm.openrouter] stream start model=%s history_len=%d", self.model, len(history)
        )
        t0 = time.monotonic()
        payload = {"model": self.model, "messages": build_messages(history, lang), "stream": True}
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://github.com/Kar-Su/Humi",
        }
        seq = 0
        buffer = ""
        chunk_count = 0
        async with httpx.AsyncClient(timeout=300) as client:
            async with client.stream(
                "POST",
                "https://openrouter.ai/api/v1/chat/completions",
                json=payload,
                headers=headers,
            ) as resp:
                if resp.status_code == 429:
                    logger.warning("[llm.openrouter] 429 rate limited")
                    raise RateLimitError("openrouter 429 rate limited")
                resp.raise_for_status()
                logger.info("[llm.openrouter] http %d connected", resp.status_code)
                async for line in resp.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        logger.info(
                            "[llm.openrouter] DONE chunks=%d seq=%d elapsed=%.2fs",
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
                        logger.info("[llm.openrouter] interrupted chunks=%d", chunk_count)
                        break
                    delta = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                    if not delta:
                        continue
                    chunk_count += 1
                    buffer += delta
                    sentence, rest = split_sentence(buffer)
                    if sentence:
                        emotion, clean = parse_emotion(sentence)
                        seq += 1
                        logger.info(
                            "[llm.openrouter] sentence seq=%d emotion=%s text=%r",
                            seq,
                            emotion,
                            clean[:60],
                        )
                        await on_sentence(seq, clean.strip(), emotion)
                        buffer = rest
        if buffer.strip() and not is_interrupted():
            seq += 1
            emotion, clean = parse_emotion(buffer)
            logger.info(
                "[llm.openrouter] flush seq=%d emotion=%s text=%r", seq, emotion, clean[:60]
            )
            await on_sentence(seq, clean.strip(), emotion)
        logger.info(
            "[llm.openrouter] stream done chunks=%d seq=%d elapsed=%.2fs",
            chunk_count,
            seq,
            time.monotonic() - t0,
        )
