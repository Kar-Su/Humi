import numpy as np


class Engine:
    name = "base"

    def synthesize(self, text: str) -> tuple[np.ndarray, int]:
        raise NotImplementedError
