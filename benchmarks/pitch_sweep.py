import subprocess
import tempfile
from pathlib import Path

import soundfile as sf

from engines.mms import Engine as MmsEngine

ROOT = Path(__file__).resolve().parent
RUNNER = ROOT / "rvc-runner" / ".venv" / "bin" / "python"
SCRIPT = ROOT / "rvc-runner" / "run_convert.py"
OUTDIR = ROOT / "out" / "rvc-pitch"

VOICES = {
    "kobo": sorted((ROOT / "models/rvc/kobo/kobo").glob("*.pth"))[0],
    "zeta": sorted((ROOT / "models/rvc/zeta/zeta").glob("*.pth"))[0],
}


def main() -> None:
    OUTDIR.mkdir(parents=True, exist_ok=True)
    wav, sr = MmsEngine().synthesize("Halo! Aku Humi. Ayo ngobrol santai bareng aku, ya!")
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "in.wav"
        sf.write(src, wav, sr)
        for voice, model in VOICES.items():
            idx = model.parent / (model.stem + ".index")
            index = str(idx) if idx.exists() else ""
            for pitch in (2, 4, 6):
                out = OUTDIR / f"{voice}_+{pitch}.wav"
                cmd = [
                    str(RUNNER),
                    str(SCRIPT),
                    "--input", str(src),
                    "--output", str(out.resolve()),
                    "--model", str(model.resolve()),
                    "--device", "cpu",
                    "--pitch", str(pitch),
                ]
                if index:
                    cmd += ["--index", index]
                print(f"[{voice} +{pitch}] merender…")
                subprocess.run(cmd, check=True, capture_output=True, text=True)
                print(f"[{voice} +{pitch}] OK -> {out.name}")


if __name__ == "__main__":
    main()
