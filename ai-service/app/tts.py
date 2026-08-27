from __future__ import annotations

import io

import httpx
import soundfile as sf

# Kontainer sovits memuat bobot Zeta dari mount /workspace/models.
_REF_AUDIO = "/workspace/models/sovits/zeta/Reference Audios/A1 (Neutral).wav"
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
        self._switch_weights(gpt, sovits)

    def _switch_weights(self, gpt_path: str, sovits_path: str) -> None:
        for endpoint, path in (
            ("set_gpt_weights", gpt_path),
            ("set_sovits_weights", sovits_path),
        ):
            resp = httpx.get(
                f"{self.base}/{endpoint}",
                params={"weights_path": path},
                timeout=300,
            )
            resp.raise_for_status()
            body = (
                resp.json()
                if resp.headers.get("content-type", "").startswith("application/json")
                else {}
            )
            if "success" not in str(body.get("message", "")):
                raise RuntimeError(f"{endpoint} gagal: {resp.status_code} {str(body)[:150]}")

    def synthesize(self, text: str) -> tuple[bytes, int]:
        payload = {
            "text": text,
            "text_lang": "en",
            "ref_audio_path": _REF_AUDIO,
            "prompt_text": _PROMPT_TEXT,
            "prompt_lang": "en",
            "speed_factor": 1.0,
            "media_type": "wav",
        }
        resp = httpx.post(self.tts_url, json=payload, timeout=120)
        resp.raise_for_status()
        data, rate = sf.read(io.BytesIO(resp.content), dtype="int16")
        return data.tobytes(), int(rate)
