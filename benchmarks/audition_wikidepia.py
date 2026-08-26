import argparse
from pathlib import Path

import numpy as np
import soundfile as sf

from engines.wikidepia import load_synthesizer, speaker_names

ROOT = Path(__file__).resolve().parent


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sentence", default="Halo! Aku Humi. Ayo ngobrol santai bareng aku, ya!")
    parser.add_argument("--outdir", default=str(ROOT / "out" / "audition"))
    parser.add_argument("--only", default="", help="koma-separated nama speaker; kosong = semua")
    args = parser.parse_args()

    synth = load_synthesizer()
    names = speaker_names(synth)
    if args.only:
        wanted = {s.strip() for s in args.only.split(",")}
        names = [n for n in names if n in wanted]

    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    print(f"{len(names)} speaker: {', '.join(names)}")
    for i, name in enumerate(names, start=1):
        try:
            out = synth.tts(args.sentence, speaker_name=name)
            wav = out["wav"] if isinstance(out, dict) else out
            path = outdir / f"{i:02d}_{name}.wav"
            sf.write(path, np.asarray(wav), synth.output_sample_rate)
            print(f"[{i}/{len(names)}] {name} -> {path.name}")
        except Exception as e:
            print(f"[{i}/{len(names)}] {name} GAGAL: {e}")


if __name__ == "__main__":
    main()
