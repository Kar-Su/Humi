from __future__ import annotations

import re

_REPLACEMENTS: list[tuple[str, str]] = [
    ("ng", "ŋ"),
    ("ny", "ɲ"),
    ("sy", "ʃ"),
    ("kh", "x"),
    ("c", "tʃ"),
    ("j", "dʒ"),
]

_RE_COMPILED: list[tuple[re.Pattern[str], str]] = [
    (re.compile(re.escape(src), re.IGNORECASE), tgt) for src, tgt in _REPLACEMENTS
]


def to_ipa_id(text: str) -> str:
    """Broad IPA for Indonesian. Rule-based, no deps. Keeps emotion tags intact."""
    if not text:
        return text
    # preserve bracket tags like [happy] — don't convert inside brackets
    # split by bracket tags, only convert non-tag parts
    parts = re.split(r"(\[[^\]]+\])", text)
    out: list[str] = []
    for part in parts:
        if part.startswith("[") and part.endswith("]"):
            out.append(part)
            continue
        converted = part
        for pat, tgt in _RE_COMPILED:
            converted = pat.sub(tgt, converted)
        out.append(converted)
    return "".join(out)
