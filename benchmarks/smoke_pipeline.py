import argparse
import asyncio
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
import websockets

OUT = Path(__file__).resolve().parent / "out" / "smoke"


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="ws://localhost:8080/ws")
    parser.add_argument("--text", default="Hello! Tell me a short funny story.")
    parser.add_argument("--audio", action="store_true", help="simpan audio ke out/smoke/")
    args = parser.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    audio: dict[int, bytearray] = {}
    rates: dict[int, int] = {}
    failed = False

    async with websockets.connect(args.url) as ws:
        await ws.send(json.dumps({"type": "text", "text": args.text}))
        while True:
            raw = await ws.recv()
            if isinstance(raw, bytes):
                seq = int.from_bytes(raw[0:4], "little")
                length = int.from_bytes(raw[4:8], "little")
                audio.setdefault(seq, bytearray()).extend(raw[8 : 8 + length])
                continue
            msg = json.loads(raw)
            t = msg.get("type")
            if t == "tts_start":
                rates[msg["seq"]] = msg["sample_rate"]
            detail = {k: v for k, v in msg.items() if k != "type"}
            print(f"EVENT {t} {detail}", flush=True)
            if t == "error":
                failed = True
                break
            if t == "turn_end":
                break

    if args.audio:
        for seq, buf in audio.items():
            arr = np.frombuffer(bytes(buf), dtype=np.int16)
            rate = rates.get(seq, 32000)
            sf.write(OUT / f"{seq:02d}.wav", arr, rate)
        print(f"audio: {len(audio)} segmen -> {OUT}")
    else:
        print(f"audio: {sum(len(b) for b in audio.values())} byte ({len(audio)} segmen)")

    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    asyncio.run(main())
