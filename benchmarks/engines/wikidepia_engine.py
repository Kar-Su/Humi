import os

import numpy as np

from engines.wikidepia import load_synthesizer, speaker_names


class Engine:
    name = "wikidepia"

    def __init__(self) -> None:
        self.speaker = os.environ.get("BENCH_WIKI_SPEAKER", "gadis")
        self.synth = load_synthesizer()
        names = speaker_names(self.synth)
        if self.speaker not in names:
            raise ValueError(f"speaker '{self.speaker}' tidak ada. contoh pilihan: {names[:10]} …")

    def synthesize(self, text: str) -> tuple[np.ndarray, int]:
        out = self.synth.tts(text, speaker_name=self.speaker)
        wav = out["wav"] if isinstance(out, dict) else out
        return np.asarray(wav), int(self.synth.output_sample_rate)
