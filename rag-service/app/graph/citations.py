"""
Deterministic grounding checks. None of these use an LLM, so they cannot be talked out of a
failure:

  verbatim_quote     an evidence quote must literally occur in its passage (or is snapped to the
                     passage's closest real sentence, never paraphrased)
  validate_draft     every citation points at real evidence; answers cite their sources; every
                     number (doses, rates, temperatures, percentages…) in a cited sentence occurs
                     in a cited passage; named items (diseases, plants) are spelled as in the source
  repair_draft       removes the sentences/items that failed, so only grounded content survives
  page_reference     human-readable original page reference ("Vol. 1, p. 37; PDF p. 66")
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from .schemas import Draft, DraftItem

CITE_RE = re.compile(r"\[(\d{1,2}(?:\s*[,–-]\s*\d{1,2})*)\]")
BANGLA_DIGITS = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")
# Numbers worth checking: anything with a digit, incl. decimals, ranges and thousands separators.
NUMBER_RE = re.compile(r"(?<![\w.])(\d+(?:[.,]\d+)*)(?![\w])")
SENTENCE_SPLIT = re.compile(r"(?<=[.!?।])\s+|\n+")


def normalize_ws(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _norm_for_match(text: str) -> str:
    text = text.lower().replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"').replace("–", "-").replace("—", "-")
    return normalize_ws(text)


def _tokens(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def passage_sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", normalize_ws(text)) if len(s.strip()) > 20]


def verbatim_quote(quote: str, passage: str, *, min_overlap: float = 0.75) -> str | None:
    """The quote itself when it occurs in the passage; else the passage sentence it best matches."""
    if not quote or not quote.strip():
        return None
    if _norm_for_match(quote) in _norm_for_match(passage):
        return normalize_ws(quote)
    q = set(_tokens(quote))
    if len(q) < 4:
        return None
    best, best_score = None, 0.0
    for sentence in passage_sentences(passage):
        s = set(_tokens(sentence))
        if not s:
            continue
        score = len(q & s) / len(q)
        if score > best_score:
            best, best_score = sentence, score
    return best if best_score >= min_overlap else None


def cited_numbers(text: str) -> list[int]:
    out: list[int] = []
    for match in CITE_RE.finditer(text):
        for part in re.split(r"\s*,\s*", match.group(1)):
            if re.search(r"[–-]", part):
                a, b = (int(x) for x in re.split(r"\s*[–-]\s*", part))
                out.extend(range(min(a, b), max(a, b) + 1))
            else:
                out.append(int(part))
    return out


def _canon_number(raw: str) -> set[str]:
    """'1,000' / '1 000' / '1000' / '0.5' / '0,5' variants of one number."""
    raw = raw.translate(BANGLA_DIGITS)
    plain = raw.replace(",", "").replace(" ", "")
    forms = {raw, plain}
    if re.fullmatch(r"\d+,\d{1,2}", raw):  # decimal comma
        forms.add(raw.replace(",", "."))
    if plain.isdigit() and len(plain) > 3:
        forms.add(f"{int(plain):,}")
        forms.add(f"{int(plain):,}".replace(",", " "))
    return forms


def numbers_in(text: str) -> list[str]:
    text = CITE_RE.sub(" ", text.translate(BANGLA_DIGITS))
    # Ordinals at the start of list items ("1. Water…") are structure, not facts.
    text = re.sub(r"(?m)^\s*\d+[.)]\s", " ", text)
    return [m.group(1) for m in NUMBER_RE.finditer(text)]


def number_supported(number: str, passages: list[str]) -> bool:
    forms = _canon_number(number)
    haystack = " ".join(p.translate(BANGLA_DIGITS) for p in passages)
    haystack_compact = re.sub(r"(?<=\d)[  ,](?=\d{3}\b)", "", haystack)
    return any(re.search(rf"(?<![\d.]){re.escape(f)}(?![\d])", h) for f in forms for h in (haystack, haystack_compact))


def split_sentences(text: str) -> list[str]:
    return [s for s in (x.strip() for x in SENTENCE_SPLIT.split(text)) if s]


@dataclass
class Validation:
    errors: list[str]
    bad_sentences: set[str]
    bad_items: set[int]

    @property
    def ok(self) -> bool:
        return not self.errors


def validate_draft(draft: Draft, evidence_texts: list[str], *, require_source_terms: bool = False) -> Validation:
    n = len(evidence_texts)
    errors: list[str] = []
    bad_sentences: set[str] = set()
    bad_items: set[int] = set()

    if draft.status in ("insufficient_evidence", "needs_clarification"):
        return Validation([], set(), set())

    sentences = split_sentences(draft.answer)
    cited_any = False
    substantive = 0
    uncited_substantive = 0
    for sentence in sentences:
        refs = cited_numbers(sentence)
        invalid = [r for r in refs if r < 1 or r > n]
        if invalid:
            errors.append(f"Sentence cites evidence that does not exist {invalid}: {sentence[:120]}")
            bad_sentences.add(sentence)
            continue
        cited_any = cited_any or bool(refs)
        numbers = numbers_in(sentence)
        is_heading = len(sentence) < 40 or sentence.endswith(":") or sentence.startswith("#")
        if not is_heading:
            substantive += 1
            if not refs:
                uncited_substantive += 1
        if numbers and not refs:
            errors.append(f"Sentence states numbers {numbers} without a citation: {sentence[:120]}")
            bad_sentences.add(sentence)
            continue
        if refs:
            sources = [evidence_texts[r - 1] for r in refs]
            unsupported = [x for x in numbers if not number_supported(x, sources)]
            if unsupported:
                errors.append(f"Numbers {unsupported} do not appear in the cited evidence {refs}: {sentence[:120]}")
                bad_sentences.add(sentence)

    if not cited_any and not draft.items:
        errors.append("The answer cites no evidence.")
    elif substantive and uncited_substantive / substantive > 0.4:
        errors.append(f"{uncited_substantive} of {substantive} substantive sentences have no citation; cite each fact with [n].")

    for index, item in enumerate(draft.items):
        refs = [r for r in item.citations if 1 <= r <= n]
        if not refs or len(refs) != len(item.citations):
            errors.append(f"Item '{item.name}' needs valid citations (has {item.citations}).")
            bad_items.add(index)
            continue
        sources = [evidence_texts[r - 1] for r in refs]
        unsupported = [x for x in numbers_in(f"{item.name} {item.detail}") if not number_supported(x, sources)]
        if unsupported:
            errors.append(f"Item '{item.name}' states numbers {unsupported} not in its evidence.")
            bad_items.add(index)
            continue
        if require_source_terms and not _term_in(item.source_term, sources):
            errors.append(f"Item '{item.name}': source_term '{item.source_term}' must be copied exactly from the cited evidence.")
            bad_items.add(index)

    return Validation(errors, bad_sentences, bad_items)


def _term_in(term: str, sources: list[str]) -> bool:
    term = _norm_for_match(term or "")
    return len(term) >= 3 and any(term in _norm_for_match(s) for s in sources)


def repair_draft(draft: Draft, validation: Validation) -> Draft:
    """Drops failed sentences and items. Whatever remains passed every check."""
    answer = draft.answer
    for sentence in validation.bad_sentences:
        answer = answer.replace(sentence, "")
    answer = re.sub(r"\n{3,}", "\n\n", re.sub(r"[ \t]{2,}", " ", answer)).strip()
    items: list[DraftItem] = [item for i, item in enumerate(draft.items) if i not in validation.bad_items]
    return draft.model_copy(update={"answer": answer, "items": items})


def has_grounded_content(draft: Draft) -> bool:
    return bool(cited_numbers(draft.answer)) or bool(draft.items)


def renumber(draft: Draft) -> tuple[Draft, list[int]]:
    """Renumbers citations 1..k in order of first use; returns the draft and the original numbers."""
    order: list[int] = []
    for ref in cited_numbers(draft.answer) + [r for item in draft.items for r in item.citations]:
        if ref not in order:
            order.append(ref)
    mapping = {old: new for new, old in enumerate(order, start=1)}

    def fix(text: str) -> str:
        return CITE_RE.sub(lambda m: "[" + ", ".join(str(mapping[r]) for r in dict.fromkeys(cited_numbers(m.group(0))) if r in mapping) + "]", text)

    items = [item.model_copy(update={"citations": [mapping[r] for r in item.citations if r in mapping]}) for item in draft.items]
    return draft.model_copy(update={"answer": fix(draft.answer), "items": items}), order


def page_reference(page_label_start: str | None, page_label_end: str | None, pdf_start: int, pdf_end: int) -> str:
    """'Vol. 1, p. 37–38 (PDF p. 66–67)' from labels like 'V1:37'."""

    def parse(label: str | None) -> tuple[str | None, str | None]:
        m = re.fullmatch(r"V(\d+):(\w+)", label or "")
        return (m.group(1), m.group(2)) if m else (None, label)

    vol, start = parse(page_label_start)
    _, end = parse(page_label_end)
    pdf = f"PDF p. {pdf_start}" if pdf_start == pdf_end else f"PDF pp. {pdf_start}–{pdf_end}"
    if start is None:
        return pdf
    printed = f"p. {start}" if not end or end == start else f"pp. {start}–{end}"
    return f"Vol. {vol}, {printed} ({pdf})" if vol else f"{printed} ({pdf})"
