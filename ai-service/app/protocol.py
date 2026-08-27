from __future__ import annotations

import struct
from typing import Literal

from pydantic import BaseModel

EMOTIONS = ("netral", "senang", "sedih", "kaget", "penasaran")

# Framing audio biner: [seq u32 LE][len u32 LE][payload]
_HEADER = struct.Struct("<II")
HEADER_BYTES = _HEADER.size


class Inbound(BaseModel):
    type: Literal["text", "audio_start", "audio_chunk", "audio_end", "interrupt"]
    text: str | None = None
    format: str | None = None
    sample_rate: int | None = None
    seq: int | None = None


class Config(BaseModel):
    model: str
    voice: str


class Outbound(BaseModel):
    type: Literal[
        "session_ready",
        "stt_final",
        "llm_sentence",
        "tts_start",
        "tts_end",
        "turn_end",
        "error",
    ]
    config: Config | None = None
    text: str | None = None
    emotion: str | None = None
    seq: int | None = None
    format: str | None = None
    sample_rate: int | None = None
    message: str | None = None


def pack_audio(seq: int, payload: bytes) -> bytes:
    return _HEADER.pack(seq, len(payload)) + payload


def unpack_audio(frame: bytes) -> tuple[int, bytes]:
    seq, length = _HEADER.unpack_from(frame)
    payload = frame[HEADER_BYTES : HEADER_BYTES + length]
    return seq, payload
