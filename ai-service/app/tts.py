from __future__ import annotations

import io
import logging
import os

import httpx
import soundfile as sf

logger = logging.getLogger("ai-service.tts")

_EMOTION_TAG = {
    "senang": "happy",
    "sedih": "sad",
    "kaget": "surprised",
    "penasaran": "curious",
    "netral": None,
}


class TTS:
    def __init__(self, url: str | None = None, profile: str = "zeta") -> None:
        del url, profile  # sovits legacy, keep compat
        self.api_key = os.environ.get("FISH_API_KEY", "")
        self.ref_id = os.environ.get("FISH_REFERENCE_ID", "b8357529925148c3909f583caf29c33c")
        self.model = os.environ.get("FISH_MODEL", "").strip()
        self.base = os.environ.get("FISH_API_BASE", "https://api.fish.audio").rstrip("/")
        if not self.api_key:
            logger.warning("[tts] FISH_API_KEY kosong — set di .env")
        logger.info(
            "[tts] fish base=%s ref=%s model=%s",
            self.base,
            self.ref_id[:8] + "***",
            self.model or "(default)",
        )

    def synthesize(self, text: str, emotion: str | None = None) -> tuple[bytes, int]:
        tag = _EMOTION_TAG.get(emotion or "netral")
        tagged = f"[{tag}] {text}" if tag else text
        payload: dict[str, str] = {"text": tagged, "reference_id": self.ref_id, "format": "wav"}
        if self.model:
            payload["model"] = self.model
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        logger.info("[tts] fish text=%r emotion=%s tag=%s", text[:60], emotion, tag)
        resp = httpx.post(f"{self.base}/v1/tts", json=payload, headers=headers, timeout=60)
        resp.raise_for_status()
        data, rate = sf.read(io.BytesIO(resp.content), dtype="int16")
        pcm = data.tobytes()
        logger.info("[tts] done pcm=%d rate=%d", len(pcm), int(rate))
        return pcm, int(rate)
