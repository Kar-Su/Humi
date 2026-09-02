from __future__ import annotations

import numpy as np


class STT:
    def __init__(
        self, model: str = "small", device: str = "cpu", compute_type: str = "int8"
    ) -> None:
        self._model = None
        self.model = model
        self.device = device
        self.compute_type = compute_type

    def _ensure(self):
        if self._model is None:
            from faster_whisper import WhisperModel

            self._model = WhisperModel(
                self.model,
                device=self.device,
                compute_type=self.compute_type,
            )
        return self._model

    def transcribe(self, pcm16: bytes, sample_rate: int) -> str:
        audio = np.frombuffer(pcm16, dtype=np.int16).astype(np.float32) / 32768.0
        segments, _ = self._ensure().transcribe(audio, beam_size=1)
        return " ".join(s.text.strip() for s in segments).strip()
