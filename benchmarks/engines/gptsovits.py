import io
import json
import os
from pathlib import Path

import numpy as np
import requests
import soundfile as sf

MODELS_DIR = Path(__file__).resolve().parent.parent / "models" / "sovits"
API_URL = "http://127.0.0.1:9880/tts"

PROFILES = {
    "zeta": {
        "gpt": "VestiaZeta_GPT (KitLemonfoot).ckpt",
        "sovits": "VestiaZeta_SoVITS (KitLemonfoot).pth",
    },
    "pippa": {
        "gpt": "PipkinPippa_GPT (KitLemonfoot).ckpt",
        "sovits": "PipkinPippa_SoVITS (KitLemonfoot).pth",
    },
}

FALLBACK_LANGS = ["auto", "id", "en"]


SUPPORTED_PROMPT_LANGS = {"en", "zh", "ja", "ko", "yue"}


def _transcribe(path: Path) -> dict:
    cache = path.with_suffix(".transcript.json")
    if cache.exists():
        return json.loads(cache.read_text())
    from faster_whisper import WhisperModel

    model = WhisperModel("small", device="cpu", compute_type="int8")
    segments, info = model.transcribe(str(path))
    text = " ".join(s.text.strip() for s in segments)
    result = {"text": text, "language": info.language}
    cache.write_text(json.dumps(result))
    return result


def _first_ref(model_dir: Path) -> Path:
    for sub in ("Reference Audios", "Reference Audio"):
        refs = sorted((model_dir / sub).glob("*.wav"))
        if refs:
            return refs[0]
    raise FileNotFoundError(f"tidak ada reference audio di {model_dir}")


class Engine:
    name = "sovits"
    label = "sovits"

    def __init__(self) -> None:
        self.profile = os.environ.get("BENCH_SOVITS", "zeta")
        if self.profile not in PROFILES:
            raise ValueError(f"profile tidak dikenal: {self.profile}")
        self.label = f"sovits-{self.profile}"
        info = PROFILES[self.profile]
        self.model_dir = MODELS_DIR / self.profile
        self.gpt_path = f"/workspace/models/{self.profile}/{info['gpt']}"
        self.sovits_path = f"/workspace/models/{self.profile}/{info['sovits']}"
        ref = _first_ref(self.model_dir)
        self.ref_in_container = (
            f"/workspace/models/{self.profile}/{ref.relative_to(self.model_dir)}"
        )
        info = _transcribe(ref)
        self.prompt_text = info["text"]
        lang = info.get("language", "auto")
        self.prompt_lang = lang if lang in SUPPORTED_PROMPT_LANGS else "auto"
        self._switch_weights()
        print(f"[sovits-{self.profile}] ref={ref.name} ({lang}) prompt='{self.prompt_text[:60]}…'")

    def _switch_weights(self) -> None:
        for endpoint, path in [
            ("set_gpt_weights", self.gpt_path),
            ("set_sovits_weights", self.sovits_path),
        ]:
            r = requests.get(
                f"http://127.0.0.1:9880/{endpoint}", params={"weights_path": path}, timeout=300
            )
            body = (
                r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
            )
            if r.status_code != 200 or "success" not in str(body.get("message", "")):
                raise RuntimeError(f"{endpoint} gagal: {r.status_code} {str(body)[:150]}")

    def synthesize(self, text: str) -> tuple[np.ndarray, int]:
        last_err = None
        for lang in FALLBACK_LANGS:
            payload = {
                "text": text,
                "text_lang": lang,
                "ref_audio_path": self.ref_in_container,
                "prompt_text": self.prompt_text,
                "prompt_lang": self.prompt_lang,
                "speed_factor": 1.0,
                "media_type": "wav",
            }
            try:
                r = requests.post(API_URL, json=payload, timeout=120)
                r.raise_for_status()
                samples, rate = sf.read(io.BytesIO(r.content), dtype="float32")
                self.lang_used = lang
                return np.asarray(samples), rate
            except requests.HTTPError as e:
                last_err = e
                detail = e.response.text[:200] if e.response is not None else ""
                print(f"[sovits-{self.profile}] text_lang={lang} gagal: {detail}")
        raise RuntimeError(f"semua text_lang gagal: {last_err}")
