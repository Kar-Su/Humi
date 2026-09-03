from __future__ import annotations

import os
import time
from collections import deque

from app.llm.base import RateLimitError
from app.llm.groq import GroqLLM
from app.llm.ollama_client import OllamaLLM
from app.llm.openrouter import OpenRouterLLM


class _Bucket:
    def __init__(self, max_req: int, per_sec: int) -> None:
        self.max_req = max_req
        self.per_sec = per_sec
        self.q: deque[float] = deque()

    def allow(self) -> bool:
        now = time.monotonic()
        while self.q and self.q[0] <= now - self.per_sec:
            self.q.popleft()
        if len(self.q) >= self.max_req:
            return False
        self.q.append(now)
        return True


_bucket = _Bucket(max_req=30, per_sec=60)


class AutoLLM:
    def __init__(self, providers: list) -> None:
        self.providers = providers
        self.model = providers[0].model if providers else "auto"

    async def stream(self, history: list[dict], on_sentence, is_interrupted) -> None:
        last_err: Exception | None = None
        for p in self.providers:
            if not _bucket.allow():
                last_err = RateLimitError("client bucket 30 RPM exceeded")
                continue
            try:
                await p.stream(history, on_sentence, is_interrupted)
                return
            except RateLimitError as e:
                last_err = e
                continue
            except Exception as e:
                # ponytail: 429 only fallback, other errors fail fast
                if "429" in str(e) or "rate" in str(e).lower():
                    last_err = RateLimitError(str(e))
                    continue
                raise
        if last_err:
            raise last_err


def _ollama() -> OllamaLLM:
    base = os.environ.get("OLLAMA_BASE_URL", "http://ollama:11434")
    model = os.environ.get("LLM_MODEL") or os.environ.get("OLLAMA_MODEL", "qwen3:4b")
    return OllamaLLM(base, model)


def _groq() -> GroqLLM:
    return GroqLLM(
        api_key=os.environ.get("GROQ_API_KEY", ""),
        model=os.environ.get("LLM_MODEL", "llama-3.3-70b-versatile"),
    )


def _openrouter() -> OpenRouterLLM:
    return OpenRouterLLM(
        api_key=os.environ.get("OPENROUTER_API_KEY", ""),
        model=os.environ.get("LLM_MODEL", "qwen/qwen3-32b:free"),
    )


def get_provider():
    raw = os.environ.get("LLM_PROVIDER", "ollama").strip().lower() or "ollama"
    # ponytail: auto tries groq->openrouter->ollama, 1 backoff in AutoLLM
    if raw == "auto":
        providers = []
        if os.environ.get("GROQ_API_KEY"):
            providers.append(_groq())
        if os.environ.get("OPENROUTER_API_KEY"):
            providers.append(_openrouter())
        providers.append(_ollama())
        return AutoLLM(providers)
    if raw == "groq":
        return _groq()
    if raw == "openrouter":
        return _openrouter()
    return _ollama()
