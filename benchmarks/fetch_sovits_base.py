from pathlib import Path

from huggingface_hub import snapshot_download

BASE_DIR = Path(__file__).resolve().parent / "models" / "gsv-base"

PATTERNS = [
    "gsv-v2final-pretrained/**",
    "chinese-roberta-wwm-ext-large/**",
    "chinese-hubert-base/**",
]


def main() -> None:
    print(f"mengunduh base model ke {BASE_DIR} …")
    snapshot_download(
        repo_id="lj1995/GPT-SoVITS",
        local_dir=BASE_DIR,
        allow_patterns=PATTERNS,
    )
    print(f"base model siap di {BASE_DIR}")


if __name__ == "__main__":
    main()
