"""Deterministic metadata tagging (crop, disease/pest, soil, season, nutrient) from the lexicon."""

from __future__ import annotations

import re
from functools import lru_cache

from .lexicon import CATEGORIES


def _is_bangla(term: str) -> bool:
    return any("ঀ" <= ch <= "৿" for ch in term)


@lru_cache(maxsize=1)
def _patterns() -> dict[str, list[tuple[str, re.Pattern[str]]]]:
    compiled: dict[str, list[tuple[str, re.Pattern[str]]]] = {}
    for category, vocab in CATEGORIES.items():
        entries = []
        for canonical, synonyms in vocab.items():
            english = sorted({s for s in synonyms if not _is_bangla(s)}, key=len, reverse=True)
            bangla = sorted({s for s in synonyms if _is_bangla(s)}, key=len, reverse=True)
            parts = []
            if english:
                # Whole words, case-insensitive; "ph" must stay a standalone token ("pH 6.5").
                parts.append(r"(?<![A-Za-z])(?:" + "|".join(re.escape(s) for s in english) + r")(?![A-Za-z])")
            if bangla:
                # Bangla has no reliable \b; match as substrings.
                parts.append("(?:" + "|".join(re.escape(s) for s in bangla) + ")")
            entries.append((canonical, re.compile("|".join(parts), re.IGNORECASE)))
        compiled[category] = entries
    return compiled


def tag(text: str, *, min_hits: int = 1) -> dict[str, list[str]]:
    """Canonical terms per category found in `text` (at least `min_hits` mentions)."""
    out: dict[str, list[str]] = {}
    for category, entries in _patterns().items():
        found = []
        for canonical, pattern in entries:
            hits = len(pattern.findall(text))
            if hits >= min_hits:
                found.append((hits, canonical))
        out[category] = [c for _, c in sorted(found, key=lambda x: (-x[0], x[1]))][:8]
    return out


def tag_query(text: str) -> dict[str, list[str]]:
    """Entities mentioned in a question (any language); used to boost matching chunks."""
    return {k: v for k, v in tag(text).items() if v}
