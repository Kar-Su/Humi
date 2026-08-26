import numpy as np
import torch
from transformers import AutoTokenizer, VitsModel

MODEL_ID = "facebook/mms-tts-ind"


class Engine:
    name = "mms-ind"

    def __init__(self) -> None:
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        self.model = VitsModel.from_pretrained(MODEL_ID)
        self.model.eval()

    def synthesize(self, text: str) -> tuple[np.ndarray, int]:
        inputs = self.tokenizer(text, return_tensors="pt")
        with torch.no_grad():
            out = self.model(**inputs).waveform
        return out.squeeze().numpy(), self.model.config.sampling_rate
