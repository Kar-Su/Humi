from __future__ import annotations

import json
import logging
import time

import httpx

from app.llm.base import parse_emotion, split_sentence
from app.persona import build_messages

logger = logging.getLogger("ai-service.llm.ollama")

class OllamaLLM:
    def __init__(self, base_url: str, model: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def stream(self, history: list[dict], on_sentence, is_interrupted) -> None:
        logger.info(
            "[llm.ollama] stream start model=%s base=%s history_len=%d",
            self.model,
            self.base_url,
            len(history),
        )
        t0 = time.monotonic()
        payload = {
            "model": self.model,
            "messages": build_messages(history),
            "stream": True,
            "think": False,
        }
        seq = 0
        buffer = ""
        chunk_count = 0
        try:
            async with httpx.AsyncClient(timeout=300) as client:
                async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as resp:
                    resp.raise_for_status()
                    logger.info("[llm.ollama] http %d connected", resp.status_code)
                    async for line in resp.aiter_lines():
                        if not line:
                            continue
                        try:
                            chunk = json.loads(line)
                        except json.JSONDecodeError:
                            continue
                        if is_interrupted():
                            logger.info("[llm.ollama] interrupted chunks=%d", chunk_count)
                            break
                        if chunk.get("done"):
                            logger.info(
                                "[llm.ollama] done chunks=%d seq=%d elapsed=%.2fs",
                                chunk_count,
                                seq,
                                time.monotonic() - t0,
                            )
                            break
                        delta = chunk.get("message", {}).get("content", "")
                        if delta:
                            chunk_count += 1
                        buffer += delta
                        sentence, rest = split_sentence(buffer)
                        if sentence:
                            emotion, clean = parse_emotion(sentence)
                            seq += 1
                            logger.info(
                                "[llm.ollama] sentence seq=%d emotion=%s text=%r",
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
                    "[llm.ollama] flush seq=%d emotion=%s text=%r", seq, emotion, clean[:60]
                )
                await on_sentence(seq, clean.strip(), emotion)
            logger.info(
                "[llm.ollama] stream done chunks=%d seq=%d elapsed=%.2fs",
                chunk_count,
                seq,
                time.monotonic() - t0,
            )
        except Exception as e:
            logger.error(
                "[llm.ollama] stream failed: %s elapsed=%.2fs",
                e,
                time.monotonic() - t0,
                exc_info=True,
            )
            raise
