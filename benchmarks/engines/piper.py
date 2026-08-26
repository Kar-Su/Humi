import tarfile
import urllib.request
from pathlib import Path

import numpy as np

MODEL_URL = (
    "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/"
    "vits-piper-id_ID-news_tts-medium.tar.bz2"
)
MODELS_DIR = Path(__file__).resolve().parent.parent / "models"


def _ensure_model() -> Path:
    MODELS_DIR.mkdir(exist_ok=True)
    target = MODELS_DIR / "vits-piper-id_ID-news_tts-medium"
    if (target / "id_ID-news_tts-medium.onnx").exists():
        return target
    archive = MODELS_DIR / "piper-id.tar.bz2"
    print(f"mengunduh {MODEL_URL}")
    urllib.request.urlretrieve(MODEL_URL, archive)
    with tarfile.open(archive) as tar:
        tar.extractall(MODELS_DIR)
    archive.unlink()
    return target


class Engine:
    name = "piper-id"

    def __init__(self) -> None:
        from piper import PiperVoice

        root = _ensure_model()
        self.voice = PiperVoice.load(str(root / "id_ID-news_tts-medium.onnx"))

    def synthesize(self, text: str) -> tuple[np.ndarray, int]:
        chunks = list(self.voice.synthesize(text))
        rate = chunks[0].sample_rate
        pcm = b"".join(chunk.audio_int16_bytes for chunk in chunks)
        samples = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768.0
        return samples, rate
