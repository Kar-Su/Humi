from __future__ import annotations

import logging
import time

import numpy as np

logger = logging.getLogger("ai-service.stt")


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
            logger.info(
                "[stt] loading WhisperModel model=%s device=%s compute=%s",
                self.model,
                self.device,
                self.compute_type,
            )
            t0 = time.monotonic()
            from faster_whisper import WhisperModel

            self._model = WhisperModel(
                self.model,
                device=self.device,
                compute_type=self.compute_type,
            )
            logger.info("[stt] WhisperModel loaded elapsed=%.2fs", time.monotonic() - t0)
        return self._model

    def transcribe(self, pcm16: bytes, sample_rate: int) -> str:
        logger.info("[stt] transcribe pcm=%d sr=%d", len(pcm16), sample_rate)
        t0 = time.monotonic()
        audio = np.frombuffer(pcm16, dtype=np.int16).astype(np.float32) / 32768.0
        segments, _ = self._ensure().transcribe(audio, beam_size=1)
        text = " ".join(s.text.strip() for s in segments).strip()
        logger.info(
            "[stt] transcribe done text=%r elapsed=%.2fs", text[:100], time.monotonic() - t0
        )
        return text
