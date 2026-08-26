import argparse
import csv
import time
from datetime import UTC, datetime
from pathlib import Path

import soundfile as sf

from engines import REGISTRY, load_engine

ROOT = Path(__file__).resolve().parent


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--engine", choices=[*REGISTRY, "all"], default="all")
    parser.add_argument("--corpus", default=str(ROOT / "korpus_tts.txt"))
    parser.add_argument("--outdir", default=str(ROOT / "out"))
    args = parser.parse_args()

    corpus = [line.strip() for line in Path(args.corpus).read_text().splitlines() if line.strip()]
    engines = list(REGISTRY) if args.engine == "all" else [args.engine]
    rows: list[dict[str, str | float]] = []

    for name in engines:
        print(f"[{name}] memuat model…")
        t0 = time.perf_counter()
        engine = load_engine(name)
        label = getattr(engine, "label", name)
        print(f"[{name}] model siap dalam {time.perf_counter() - t0:.1f}s")

        outdir = Path(args.outdir).resolve() / label
        outdir.mkdir(parents=True, exist_ok=True)

        for i, text in enumerate(corpus, start=1):
            start = time.perf_counter()
            samples, rate = engine.synthesize(text)
            elapsed = time.perf_counter() - start
            duration = len(samples) / rate
            rtf = elapsed / duration if duration > 0 else float("inf")
            wav_path = outdir / f"{i:02d}.wav"
            sf.write(wav_path, samples, rate)
            rows.append(
                {
                    "engine": label,
                    "no": i,
                    "kalimat": text,
                    "rtf": round(rtf, 3),
                    "durasi_s": round(duration, 2),
                    "file": str(wav_path.relative_to(ROOT)),
                }
            )
            print(f"[{label}] {i:02d}/12 RTF={rtf:.2f} dur={duration:.1f}s -> {wav_path.name}")

    stamp = datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC")
    with (ROOT / "HASIL.md").open("a") as f:
        f.write(f"\n## Run {stamp}\n\n")
        f.write("| Engine | No | RTF | Durasi (s) | Skor 1-5 |\n|---|---|---|---|---|\n")
        for r in rows:
            f.write(f"| {r['engine']} | {r['no']} | {r['rtf']} | {r['durasi_s']} | |\n")

    csv_path = ROOT / "out" / "hasil.csv"
    csv_path.parent.mkdir(exist_ok=True)
    with csv_path.open("w", newline="") as f:
        writer = csv.DictWriter(
            f, fieldnames=["engine", "no", "kalimat", "rtf", "durasi_s", "file"]
        )
        writer.writeheader()
        writer.writerows(rows)
    print(f"selesai. audio di out/<engine>/, metrik di HASIL.md & {csv_path}")


if __name__ == "__main__":
    main()
