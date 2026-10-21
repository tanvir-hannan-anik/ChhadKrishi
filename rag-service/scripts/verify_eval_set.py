"""
Verifies the evaluation set against the PDF itself, so no test item rests on an unchecked claim.

  python -m scripts.verify_eval_set ../Book/Agriculture.pdf

For each item in eval/questions.jsonl:
  answerable    every gold_quote must occur (whitespace/ligature-normalised) on one of its
                gold_pages, and every must_include term must occur in a gold quote
  unanswerable  none of the absent_terms may occur anywhere in the book
Verified items go to eval/dataset.verified.jsonl (with the evidence of verification); failures
are printed and excluded. The evaluator only ever uses the verified file.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def norm(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).replace("­", "")
    text = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1\2", text)  # hyphenated line breaks
    return re.sub(r"\s+", " ", text).strip().lower()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--questions", type=Path, default=ROOT / "eval" / "questions.jsonl")
    parser.add_argument("--out", type=Path, default=ROOT / "eval" / "dataset.verified.jsonl")
    args = parser.parse_args()

    import pymupdf

    doc = pymupdf.open(str(args.pdf))
    page_text: dict[int, str] = {}

    def text_of(page: int) -> str:
        if page not in page_text:
            page_text[page] = norm(doc[page - 1].get_text("text"))
        return page_text[page]

    full_book: str | None = None
    items = [json.loads(line) for line in args.questions.read_text(encoding="utf-8").splitlines() if line.strip()]
    verified, failed = [], []
    for item in items:
        problems = []
        if item["type"] == "answerable":
            found_on = {}
            for quote in item["gold_quotes"]:
                pages = [p for p in item["gold_pages"] if norm(quote) in text_of(p)]
                if pages:
                    found_on[quote] = pages
                else:
                    problems.append(f"quote not on pages {item['gold_pages']}: {quote[:80]}")
            joined = " ".join(norm(q) for q in item["gold_quotes"])
            for term in item.get("must_include", []):
                if norm(term) not in joined:
                    problems.append(f"must_include term '{term}' not in the gold quotes")
            item["verification"] = {"quotes_found_on_pages": found_on}
        else:
            if full_book is None:
                full_book = " ".join(text_of(p) for p in range(1, doc.page_count + 1))
            present = [t for t in item["absent_terms"] if re.search(rf"(?<![a-z]){re.escape(norm(t))}(?![a-z])", full_book)]
            if present:
                problems.append(f"terms that do occur in the book: {present}")
            item["verification"] = {"absent_terms_checked": item["absent_terms"]}
        (failed if problems else verified).append((item, problems))

    with args.out.open("w", encoding="utf-8") as handle:
        for item, _ in verified:
            handle.write(json.dumps(item, ensure_ascii=False) + "\n")
    for item, problems in failed:
        print(f"REJECTED {item['id']}: " + " | ".join(problems))
    print(f"{len(verified)} verified, {len(failed)} rejected → {args.out}")
    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
