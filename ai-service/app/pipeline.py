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
    def __init__(self, emit, emit_audio, lang: str = "id") -> None:
        logger.info("[pipeline] __init__ start")
        t0 = time.monotonic()
        self.emit = emit
        self.emit_audio = emit_audio
        self.llm = get_provider()
        logger.info(
            "[pipeline] llm ready model=%s elapsed=%.2fs", self.llm.model, time.monotonic() - t0
        )
        self.lang = lang if lang in ("id", "en") else "id"
        self.mood = MoodState()
        self.stt = STT(model=os.environ.get("WHISPER_MODEL", "small"))
        logger.info("[pipeline] stt ready elapsed=%.2fs", time.monotonic() - t0)
        try:
            self.tts = TTS()
            logger.info("[pipeline] tts ready elapsed=%.2fs", time.monotonic() - t0)
        except Exception as e:
            logger.warning("[pipeline] tts init failed, pakai dummy: %s", e)
            self.tts = TTS.__new__(TTS)  # type: ignore[attr-defined]
            self.tts.api_key = os.environ.get("FISH_API_KEY", "")  # type: ignore[attr-defined]
            self.tts.ref_id = os.environ.get(
                "FISH_REFERENCE_ID", "b8357529925148c3909f583caf29c33c"
            )  # type: ignore[attr-defined]
            self.tts.model = os.environ.get("FISH_MODEL", "").strip()  # type: ignore[attr-defined]
            self.tts.base = os.environ.get("FISH_API_BASE", "https://api.fish.audio").rstrip("/")  # type: ignore[attr-defined]
        self.history: list[dict] = []
        self.audio = bytearray()
        self.audio_rate = 16000
        self.interrupted = False
        logger.info(
            "[pipeline] __init__ done lang=%s elapsed=%.2fs", self.lang, time.monotonic() - t0
        )

    async def start(self) -> None:
        await self.emit(
            {
                "type": "session_ready",
                "config": {"model": self.llm.model, "voice": "fish-na7"},
            }
        )

    async def stop(self) -> None:
        pass

    async def handle(self, msg: protocol.Inbound, binary: bytes | None = None) -> None:
        logger.info(
            "[pipeline] handle type=%s text=%s",
            msg.type,
            (msg.text[:80] + "…") if msg.text and len(msg.text) > 80 else msg.text,
        )
        if msg.lang in ("id", "en"):
            self.lang = msg.lang
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
            logger.debug(
                "[pipeline] audio_chunk payload=%d total=%d", len(payload), len(self.audio)
            )
        elif msg.type == "audio_end":
            logger.info(
                "[pipeline] audio_end total_bytes=%d rate=%d", len(self.audio), self.audio_rate
            )
            t0 = time.monotonic()
            text = await asyncio.to_thread(self.stt.transcribe, bytes(self.audio), self.audio_rate)
            logger.info(
                "[pipeline] stt done text=%r elapsed=%.2fs", text[:100], time.monotonic() - t0
            )
            await self.emit({"type": "stt_final", "text": text})
            await self.run_turn(text)

    async def run_turn(self, user_text: str) -> None:
        logger.info(
            "[pipeline] run_turn text=%r history_len=%d model=%s",
            user_text[:80],
            len(self.history),
            self.llm.model,
        )
        t0 = time.monotonic()
        self.interrupted = False
        self.history.append({"role": "user", "content": user_text})
        full: list[str] = []
        emotions: list[str] = []
        tts_buffer: list[tuple[int, str, str]] = []
        tts_char = 0
        next_tts_seq = 1
        pending_tasks: list[asyncio.Task[None]] = []

        async def synthesize_and_emit(
            chunk_text: str, chunk_emotion: str, seq_chunk: int, seqs: list[int]
        ) -> None:
            try:
                pcm, rate = await asyncio.to_thread(
                    self.tts.synthesize, chunk_text, chunk_emotion, self.lang
                )
                if self.interrupted:
                    return
                duration = len(pcm) / 2 / rate if rate else 0
                await self.emit(
                    {
                        "type": "tts_start",
                        "seq": seq_chunk,
                        "seqs": seqs,
                        "emotion": chunk_emotion,
                        "format": "pcm16le",
                        "sample_rate": rate,
                        "duration": round(duration, 3),
                    }
                )
                await self.emit_audio(protocol.pack_audio(seq_chunk, pcm))
                await self.emit({"type": "tts_end", "seq": seq_chunk})
                logger.info(
                    "[pipeline] tts chunk seq=%d pcm=%d emotion=%s",
                    seq_chunk,
                    len(pcm),
                    chunk_emotion,
                )
            except Exception as e:
                logger.error("[pipeline] tts chunk failed seq=%d: %s", seq_chunk, e, exc_info=True)
                if not self.interrupted:
                    await self.emit({"type": "error", "message": f"tts error: {e}"})

        async def on_sentence(seq: int, text: str, emotion: str) -> None:
            nonlocal tts_char, next_tts_seq
            logger.info("[pipeline] on_sentence seq=%d emotion=%s text=%r", seq, emotion, text[:80])
            text = deslop(text)
            if not text:
                logger.debug("[pipeline] on_sentence seq=%d deslop empty, skip", seq)
                return
            emotion = self.mood.update(emotion)
            full.append(text)
            emotions.append(emotion)
            await self.emit({"type": "llm_sentence", "seq": seq, "text": text, "emotion": emotion})
            logger.info("[pipeline] llm_sentence emitted seq=%d", seq)
            tts_buffer.append((seq, text, emotion))
            tts_char += len(text)
            if len(tts_buffer) >= 2 or tts_char >= 120:
                chunk_text = " ".join(t for _, t, _ in tts_buffer)
                chunk_emotions = [e for _, _, e in tts_buffer]
                chunk_dominant = (
                    max(set(chunk_emotions), key=chunk_emotions.count)
                    if chunk_emotions
                    else "netral"
                )
                seqs = [s for s, _, _ in tts_buffer]
                seq_chunk = next_tts_seq
                next_tts_seq += 1
                pending_tasks.append(
                    asyncio.create_task(
                        synthesize_and_emit(chunk_text, chunk_dominant, seq_chunk, seqs)
                    )
                )
                tts_buffer.clear()
                tts_char = 0

        try:
            await self.llm.stream(
                self.history, on_sentence, lambda: self.interrupted, lang=self.lang
            )
            logger.info(
                "[pipeline] llm.stream done sentences=%d elapsed=%.2fs",
                len(full),
                time.monotonic() - t0,
            )
        except Exception as e:
            logger.error(
                "[pipeline] llm.stream failed: %s elapsed=%.2fs",
                e,
                time.monotonic() - t0,
                exc_info=True,
            )
            await self.emit({"type": "error", "message": f"llm error: {e}"})
            raise
        if tts_buffer:
            chunk_text = " ".join(t for _, t, _ in tts_buffer)
            chunk_emotions = [e for _, _, e in tts_buffer]
            chunk_dominant = (
                max(set(chunk_emotions), key=chunk_emotions.count) if chunk_emotions else "netral"
            )
            seqs = [s for s, _, _ in tts_buffer]
            seq_chunk = next_tts_seq
            next_tts_seq += 1
            pending_tasks.append(
                asyncio.create_task(
                    synthesize_and_emit(chunk_text, chunk_dominant, seq_chunk, seqs)
                )
            )
            tts_buffer.clear()
        if pending_tasks:
            try:
                await asyncio.gather(*pending_tasks)
            except Exception as e:
                logger.error("[pipeline] gather tts failed: %s", e, exc_info=True)
            if self.interrupted:
                for task in pending_tasks:
                    if not task.done():
                        task.cancel()
        if self.interrupted or not full:
            if full:
                self.history.append({"role": "assistant", "content": " ".join(full)})
            await self.emit({"type": "turn_end"})
            logger.info(
                "[pipeline] turn_end interrupted full=%r elapsed=%.2fs",
                " ".join(full)[:120],
                time.monotonic() - t0,
            )
            return
        assistant_text = " ".join(full)
        self.history.append({"role": "assistant", "content": assistant_text})
        await self.emit({"type": "turn_end"})
        logger.info(
            "[pipeline] turn_end full=%r elapsed=%.2fs", assistant_text[:120], time.monotonic() - t0
        )
