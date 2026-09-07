from __future__ import annotations

import asyncio
import logging
import os
import time

from app import protocol
from app.llm import get_provider
from app.mood import MoodState
from app.sanitize import deslop
from app.stt import STT
from app.tts import TTS

logger = logging.getLogger("ai-service.pipeline")


class Pipeline:
    def __init__(self, emit, emit_audio) -> None:
        logger.info("[pipeline] __init__ start")
        t0 = time.monotonic()
        self.emit = emit
        self.emit_audio = emit_audio
        self.llm = get_provider()
        logger.info("[pipeline] llm ready model=%s elapsed=%.2fs", self.llm.model, time.monotonic() - t0)
        self.mood = MoodState()
        self.stt = STT(model=os.environ.get("WHISPER_MODEL", "small"))
        logger.info("[pipeline] stt ready elapsed=%.2fs", time.monotonic() - t0)
        try:
            self.tts = TTS(os.environ.get("SOVITS_URL", "http://host.docker.internal:9880"))
            logger.info("[pipeline] tts ready elapsed=%.2fs", time.monotonic() - t0)
        except Exception as e:
            logger.warning("[pipeline] tts init failed, pakai dummy: %s", e)
            self.tts = TTS.__new__(TTS)
            self.tts.base = os.environ.get("SOVITS_URL", "http://host.docker.internal:9880").rstrip("/")
            self.tts.tts_url = self.tts.base + "/tts"
        self.history: list[dict] = []
        self.audio = bytearray()
        self.audio_rate = 16000
        self.interrupted = False
        logger.info("[pipeline] __init__ done elapsed=%.2fs", time.monotonic() - t0)

    async def start(self) -> None:
        await self.emit(
            {
                "type": "session_ready",
                "config": {"model": self.llm.model, "voice": "sovits-zeta"},
            }
        )

    async def stop(self) -> None:
        pass

    async def handle(self, msg: protocol.Inbound, binary: bytes | None = None) -> None:
        logger.info("[pipeline] handle type=%s text=%s", msg.type, (msg.text[:80] + "…") if msg.text and len(msg.text) > 80 else msg.text)
        if msg.type == "interrupt":
            logger.info("[pipeline] interrupt")
            self.interrupted = True
            self.mood.reset()
        elif msg.type == "text" and msg.text:
            await self.run_turn(msg.text)
        elif msg.type == "audio_start":
            logger.info("[pipeline] audio_start rate=%s", msg.sample_rate)
            self.audio = bytearray()
            self.audio_rate = msg.sample_rate or 16000
        elif msg.type == "audio_chunk" and binary is not None:
            _, payload = protocol.unpack_audio(binary)
            self.audio += payload
            logger.debug("[pipeline] audio_chunk payload=%d total=%d", len(payload), len(self.audio))
        elif msg.type == "audio_end":
            logger.info("[pipeline] audio_end total_bytes=%d rate=%d", len(self.audio), self.audio_rate)
            t0 = time.monotonic()
            text = await asyncio.to_thread(self.stt.transcribe, bytes(self.audio), self.audio_rate)
            logger.info("[pipeline] stt done text=%r elapsed=%.2fs", text[:100], time.monotonic() - t0)
            await self.emit({"type": "stt_final", "text": text})
            await self.run_turn(text)

    async def run_turn(self, user_text: str) -> None:
        logger.info("[pipeline] run_turn text=%r history_len=%d model=%s", user_text[:80], len(self.history), self.llm.model)
        t0 = time.monotonic()
        self.interrupted = False
        self.history.append({"role": "user", "content": user_text})
        full: list[str] = []

        async def on_sentence(seq: int, text: str, emotion: str) -> None:
            logger.info("[pipeline] on_sentence seq=%d emotion=%s text=%r", seq, emotion, text[:80])
            text = deslop(text)
            if not text:
                logger.debug("[pipeline] on_sentence seq=%d deslop empty, skip", seq)
                return
            emotion = self.mood.update(emotion)
            full.append(text)
            await self.emit({"type": "llm_sentence", "seq": seq, "text": text, "emotion": emotion})
            logger.info("[pipeline] llm_sentence emitted seq=%d", seq)
            if self.interrupted:
                logger.info("[pipeline] interrupted after llm_sentence seq=%d", seq)
                return
            t_tts = time.monotonic()
            pcm, rate = await asyncio.to_thread(self.tts.synthesize, text)
            logger.info("[pipeline] tts done seq=%d pcm=%d rate=%d elapsed=%.2fs", seq, len(pcm), rate, time.monotonic() - t_tts)
            await self.emit(
                {"type": "tts_start", "seq": seq, "format": "pcm16le", "sample_rate": rate}
            )
            await self.emit_audio(protocol.pack_audio(seq, pcm))
            await self.emit({"type": "tts_end", "seq": seq})
            logger.info("[pipeline] tts audio sent seq=%d", seq)

        try:
            await self.llm.stream(self.history, on_sentence, lambda: self.interrupted)
            logger.info("[pipeline] llm.stream done sentences=%d elapsed=%.2fs", len(full), time.monotonic() - t0)
        except Exception as e:
            logger.error("[pipeline] llm.stream failed: %s elapsed=%.2fs", e, time.monotonic() - t0, exc_info=True)
            await self.emit({"type": "error", "message": f"llm error: {e}"})
            raise
        self.history.append({"role": "assistant", "content": " ".join(full)})
        await self.emit({"type": "turn_end"})
        logger.info("[pipeline] turn_end full=%r elapsed=%.2fs", " ".join(full)[:120], time.monotonic() - t0)
