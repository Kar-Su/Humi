import urllib.request
from pathlib import Path

BASE = "https://github.com/Wikidepia/indonesian-tts/releases/download/v1.2"
ASSETS = ["checkpoint_1260000-inference.pth", "config.json", "speakers.pth"]
MODELS_DIR = Path(__file__).resolve().parent.parent / "models" / "wikidepia"


def ensure_assets() -> Path:
    import json

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    for name in ASSETS:
        target = MODELS_DIR / name
        if target.exists():
            continue
        print(f"mengunduh {name} …")
        urllib.request.urlretrieve(f"{BASE}/{name}", target)
        if name == ASSETS[1]:
            cfg = json.loads(target.read_text())

            def absolutize(node):
                if isinstance(node, dict):
                    return {k: absolutize(v) for k, v in node.items()}
                if isinstance(node, list):
                    return [absolutize(v) for v in node]
                if isinstance(node, str) and node.endswith(".pth") and "/" not in node:
                    return str(MODELS_DIR / node)
                return node

            target.write_text(json.dumps(absolutize(cfg)))
    return MODELS_DIR


def load_synthesizer():
    from TTS.utils.synthesizer import Synthesizer

    root = ensure_assets()
    return Synthesizer(
        tts_checkpoint=str(root / ASSETS[0]),
        tts_config_path=str(root / ASSETS[1]),
        tts_speakers_file=str(root / ASSETS[2]),
    )


def speaker_names(synth) -> list[str]:
    manager = getattr(synth, "tts_speaker_manager", None)
    if manager is not None and hasattr(manager, "name_to_id"):
        return sorted(manager.name_to_id.keys())
    import torch

    data = torch.load(MODELS_DIR / ASSETS[2], map_location="cpu", weights_only=False)
    return sorted(data.keys())
