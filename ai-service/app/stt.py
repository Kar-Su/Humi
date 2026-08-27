from __future__ import annotations

import numpy as np


class STT:
    def __init__(
        self, model: str = "small", device: str = "cpu", compute_type: str = "int8"
    ) -> None:
        from faster_whisper import WhisperModel

        self._model = WhisperModel(model, device=device, compute_type=compute_type)

    def transcribe(self, pcm16: bytes, sample_rate: int) -> str:
        audio = np.frombuffer(pcm16, dtype=np.int16).astype(np.float32) / 32768.0
        segments, _ = self._model.transcribe(audio, beam_size=1)
        return " ".join(s.text.strip() for s in segments).strip()
