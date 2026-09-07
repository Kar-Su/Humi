from __future__ import annotations

import io
import logging
import time

import httpx
import soundfile as sf

logger = logging.getLogger("ai-service.tts")

# Kontainer sovits memuat bobot Zeta dari mount /workspace/models.
_REF_AUDIO = "/workspace/models/zeta/Reference Audios/A1 (Neutral).wav"
_PROMPT_TEXT = (
    "I think it's a good idea to have the reload there because "
    "sometimes in movies sometimes they don't reload"
)


class TTS:
    def __init__(self, url: str, profile: str = "zeta") -> None:
        self.base = url.rstrip("/")
        self.tts_url = self.base + "/tts"
        gpt = f"/workspace/models/{profile}/VestiaZeta_GPT (KitLemonfoot).ckpt"
        sovits = f"/workspace/models/{profile}/VestiaZeta_SoVITS (KitLemonfoot).pth"
        logger.info("[tts] init base=%s profile=%s", self.base, profile)
        try:
            self._switch_weights(gpt, sovits)
        except Exception as e:
            logger.warning("[tts] _switch_weights failed (akan coba lagi saat synthesize): %s", e)
            # jangan gagalkan Pipeline — sovits mungkin belum ready, TTS tetap bisa coba lagi nanti

    def _switch_weights(self, gpt_path: str, sovits_path: str) -> None:
        for endpoint, path in (
            ("set_gpt_weights", gpt_path),
            ("set_sovits_weights", sovits_path),
        ):
            logger.info("[tts] _switch_weights %s path=%s", endpoint, path)
            t0 = time.monotonic()
            try:
                resp = httpx.get(
                    f"{self.base}/{endpoint}",
                    params={"weights_path": path},
                    timeout=5,
                )
            except Exception as e:
                logger.error("[tts] _switch_weights %s http error: %s elapsed=%.2fs", endpoint, e, time.monotonic() - t0)
                raise
            logger.info("[tts] _switch_weights %s http=%d elapsed=%.2fs", endpoint, resp.status_code, time.monotonic() - t0)
            resp.raise_for_status()
            body = (
                resp.json()
                if resp.headers.get("content-type", "").startswith("application/json")
                else {}
            )
            logger.info("[tts] _switch_weights %s body=%s", endpoint, str(body)[:200])
            if "success" not in str(body.get("message", "")):
                raise RuntimeError(f"{endpoint} gagal: {resp.status_code} {str(body)[:150]}")

    def synthesize(self, text: str) -> tuple[bytes, int]:
        logger.info("[tts] synthesize text=%r tts_url=%s", text[:60], self.tts_url)
        t0 = time.monotonic()
        payload = {
            "text": text,
            "text_lang": "en",
            "ref_audio_path": _REF_AUDIO,
            "prompt_text": _PROMPT_TEXT,
            "prompt_lang": "en",
            "speed_factor": 1.0,
            "media_type": "wav",
        }
        try:
            resp = httpx.post(self.tts_url, json=payload, timeout=120)
            resp.raise_for_status()
        except Exception as e:
            logger.error("[tts] synthesize http failed: %s elapsed=%.2fs", e, time.monotonic() - t0, exc_info=True)
            raise
        data, rate = sf.read(io.BytesIO(resp.content), dtype="int16")
        pcm = data.tobytes()
        logger.info("[tts] synthesize done pcm=%d rate=%d elapsed=%.2fs", len(pcm), int(rate), time.monotonic() - t0)
        return pcm, int(rate)
