from __future__ import annotations

import asyncio
import os

from app import protocol
from app.llm import LLM
from app.stt import STT
from app.tts import TTS


class Pipeline:
    def __init__(self, emit, emit_audio) -> None:
        self.emit = emit
        self.emit_audio = emit_audio
        self.llm = LLM(
            os.environ.get("OLLAMA_BASE_URL", "http://ollama:11434"),
            os.environ.get("OLLAMA_MODEL", "qwen3:8b"),
        )
        self.stt = STT(model=os.environ.get("WHISPER_MODEL", "small"))
        self.tts = TTS(os.environ.get("SOVITS_URL", "http://host.docker.internal:9880"))
        self.history: list[dict] = []
        self.audio = bytearray()
        self.audio_rate = 16000
        self.interrupted = False

    async def start(self) -> None:
        self.emit(
            {
                "type": "session_ready",
                "config": {"model": self.llm.model, "voice": "sovits-zeta"},
            }
        )

    async def stop(self) -> None:
        pass

    async def handle(self, msg: protocol.Inbound, binary: bytes | None = None) -> None:
        if msg.type == "interrupt":
            self.interrupted = True
        elif msg.type == "text" and msg.text:
            await self.run_turn(msg.text)
        elif msg.type == "audio_start":
            self.audio = bytearray()
            self.audio_rate = msg.sample_rate or 16000
        elif msg.type == "audio_chunk" and binary is not None:
            _, payload = protocol.unpack_audio(binary)
            self.audio += payload
        elif msg.type == "audio_end":
            text = await asyncio.to_thread(self.stt.transcribe, bytes(self.audio), self.audio_rate)
            self.emit({"type": "stt_final", "text": text})
            await self.run_turn(text)

    async def run_turn(self, user_text: str) -> None:
        self.interrupted = False
        self.history.append({"role": "user", "content": user_text})
        full: list[str] = []

        async def on_sentence(seq: int, text: str, emotion: str) -> None:
            full.append(text)
            await self.emit({"type": "llm_sentence", "seq": seq, "text": text, "emotion": emotion})
            if self.interrupted:
                return
            pcm, rate = await asyncio.to_thread(self.tts.synthesize, text)
            await self.emit(
                {"type": "tts_start", "seq": seq, "format": "pcm16le", "sample_rate": rate}
            )
            await self.emit_audio(protocol.pack_audio(seq, pcm))
            await self.emit({"type": "tts_end", "seq": seq})

        await self.llm.stream(self.history, on_sentence, lambda: self.interrupted)
        self.history.append({"role": "assistant", "content": " ".join(full)})
        await self.emit({"type": "turn_end"})
