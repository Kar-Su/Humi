from __future__ import annotations

import os


class MoodState:
    def __init__(self, hysteresis: int | None = None) -> None:
        if hysteresis is None:
            try:
                hysteresis = int(os.environ.get("MOOD_HYSTERESIS", "1"))
            except ValueError:
                hysteresis = 1
        self.hysteresis = max(1, hysteresis)
        self.current = "netral"
        self.pending: str | None = None
        self.pending_count = 0

    def update(self, raw: str) -> str:
        raw = raw or "netral"
        if raw == self.current:
            self.pending = None
            self.pending_count = 0
            return self.current
        if self.pending == raw:
            self.pending_count += 1
            if self.pending_count > self.hysteresis:
                self.current = raw
                self.pending = None
                self.pending_count = 0
                return self.current
            return self.current
        self.pending = raw
        self.pending_count = 1
        return self.current

    def reset(self) -> None:
        self.current = "netral"
        self.pending = None
        self.pending_count = 0
