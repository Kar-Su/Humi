import os
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

from engines.mms import Engine as MmsEngine

ROOT = Path(__file__).resolve().parent.parent
RUNNER_PY = ROOT / "rvc-runner" / ".venv" / "bin" / "python"
RUNNER_SCRIPT = ROOT / "rvc-runner" / "run_convert.py"
MODELS_DIR = ROOT / "models" / "rvc"

PROFILES = ("kobo", "zeta")


class Engine:
    name = "rvc"

    def __init__(self) -> None:
        self.profile = os.environ.get("BENCH_RVC", "kobo")
        if self.profile not in PROFILES:
            raise ValueError(f"profile tidak dikenal: {self.profile}")
        self.label = f"mms-rvc-{self.profile}"
        if self.pitch:
            self.label += f"+{self.pitch}"
        self.device = os.environ.get("BENCH_RVC_DEVICE", "cpu")
        self.pitch = int(os.environ.get("BENCH_RVC_PITCH", "0"))

        model_dir = MODELS_DIR / self.profile / self.profile
        pth = sorted(model_dir.glob("*.pth"))
        idx = sorted(model_dir.glob("*.index"))
        if not pth:
            raise FileNotFoundError(f"model .pth tidak ditemukan di {model_dir}")
        self.model_path = str(pth[0])
        self.index_path = str(idx[0]) if idx else None
        self.base = MmsEngine()
        print(f"[{self.label}] model={pth[0].name} device={self.device}")

    def _convert(self, src_wav: str) -> str:
        dst_wav = src_wav.replace(".in.wav", ".out.wav")
        cmd = [
            str(RUNNER_PY),
            str(RUNNER_SCRIPT),
            "--input",
            src_wav,
            "--output",
            dst_wav,
            "--model",
            self.model_path,
            "--device",
            self.device,
            "--pitch",
            str(self.pitch),
        ]
        if self.index_path:
            cmd += ["--index", self.index_path]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if result.returncode != 0 or not Path(dst_wav).exists():
            raise RuntimeError(f"RVC gagal: {result.stderr[-300:]}")
        return dst_wav

    def synthesize(self, text: str) -> tuple[np.ndarray, int]:
        wav, rate = self.base.synthesize(text)
        with tempfile.TemporaryDirectory(prefix="rvc-") as tmp:
            src = str(Path(tmp) / "in.wav")
            sf.write(src, wav, rate)
            dst = self._convert(src)
            samples, out_rate = sf.read(dst, dtype="float32")
        return np.asarray(samples), int(out_rate)
