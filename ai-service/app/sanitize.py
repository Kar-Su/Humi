from __future__ import annotations

import re

_EM = re.compile(r"[—–]")
_AS_AI = re.compile(r"\bAs an AI\b[^.]*\.\s*", re.IGNORECASE)
_FIRSTLY = re.compile(r"^\s*Firstly,?\s*", re.IGNORECASE | re.MULTILINE)
_SECONDLY = re.compile(r"^\s*Secondly,?\s*", re.IGNORECASE | re.MULTILINE)
_THIRDLY = re.compile(r"^\s*Thirdly,?\s*", re.IGNORECASE | re.MULTILINE)
_DELVE = re.compile(r"\bdelve\b", re.IGNORECASE)
_TAPESTRY = re.compile(r"\btapestry\b", re.IGNORECASE)
_ELLIPSIS = re.compile(r"\.{4,}")
_DBL_SPACE = re.compile(r" {2,}")

def deslop(text: str) -> str:
    # ponytail: regex only now, LLM judge when slop evades regex
    text = _EM.sub(", ", text)
    text = _AS_AI.sub("", text)
    text = _FIRSTLY.sub("", text)
    text = _SECONDLY.sub("", text)
    text = _THIRDLY.sub("", text)
    text = _DELVE.sub("explore", text)
    text = _TAPESTRY.sub("mix", text)
    text = _ELLIPSIS.sub("...", text)
    text = _DBL_SPACE.sub(" ", text)
    # trim spaces before punctuation
    text = re.sub(r"\s+([,.!?])", r"\1", text)
    return text.strip()
