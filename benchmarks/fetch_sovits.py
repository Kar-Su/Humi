import sys
import urllib.request
import zipfile
from pathlib import Path

BASE = "https://huggingface.co/Kit-Lemonfoot/kitlemonfoot_gptsovits_models/resolve/main"
MODELS_DIR = Path(__file__).resolve().parent / "models" / "sovits"

MODELS = {
    "zeta": "Vestia Zeta (KitLemonfoot).zip",
    "pippa": "Pipkin Pippa (KitLemonfoot).zip",
}


def main() -> None:
    wanted = sys.argv[1:] or list(MODELS)
    for key in wanted:
        fname = MODELS[key]
        url = f"{BASE}/{urllib.request.quote(fname)}"
        dest_dir = MODELS_DIR / key
        if any(dest_dir.glob("*")):
            print(f"[{key}] sudah ada, lewati")
            continue
        archive = MODELS_DIR / f"{key}.zip"
        archive.parent.mkdir(parents=True, exist_ok=True)
        print(f"[{key}] mengunduh {fname} …")
        urllib.request.urlretrieve(url, archive)
        print(f"[{key}] mengekstrak …")
        dest_dir.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(archive) as zf:
            zf.extractall(dest_dir)
        archive.unlink()
        for p in sorted(dest_dir.rglob("*")):
            if p.is_file():
                print(f"  {p.relative_to(MODELS_DIR)} ({p.stat().st_size:,} B)")


if __name__ == "__main__":
    main()
