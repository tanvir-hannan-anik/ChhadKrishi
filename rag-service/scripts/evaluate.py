"""
Measures the pipeline on the verified evaluation set (eval/dataset.verified.jsonl).

  python -m scripts.evaluate retrieval            retrieval only (rewrite + hybrid search)
  python -m scripts.evaluate answer               full graph: grounding, citations, abstention
  python -m scripts.evaluate vision               photo diagnosis on eval/vision/manifest.jsonl
  python -m scripts.evaluate all  [--limit N]

Metrics (each with n and a 95% Wilson interval — small sets give wide intervals; report them):
  retrieval   page_hit@1/@3/@6: a retrieved chunk spans a gold page; quote_hit@6: a retrieved
              chunk contains a gold quote; MRR over page hits
  answer      answered_rate (answerable items answered or partially answered)
              grounded_accuracy: answered AND cites a chunk on a gold page AND the answer text
                (English items) contains every must_include term
              citation_correctness: share of citations whose quote is verbatim in its stored
                chunk and whose page range matches the stored chunk (re-checked from the DB)
              unsupported_number_rate: final answers re-run through the numeric validator
              abstention_recall: unanswerable items correctly abstained / not answered
              false_abstention_rate: answerable items abstained
  vision      candidate_hit@3 vs labelled condition terms; abstention on unusable/non-plant photos
Reports are written to eval/reports/<timestamp>-<mode>.json and .md.
"""

from __future__ import annotations

import argparse
import json
import math
import mimetypes
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.config import get_settings  # noqa: E402
from app.envfile import load_env_files  # noqa: E402
from app.logging_setup import configure_logging  # noqa: E402


def wilson(successes: int, n: int, z: float = 1.96) -> dict:
    if n == 0:
        return {"rate": None, "n": 0, "ci95": None}
    p = successes / n
    denom = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / denom
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denom
    return {"rate": round(p, 4), "n": n, "successes": successes, "ci95": [round(max(0, centre - half), 4), round(min(1, centre + half), 4)]}


def load_items(path: Path, limit: int | None) -> list[dict]:
    if not path.exists():
        raise SystemExit(f"{path} not found — run: python -m scripts.verify_eval_set ../Book/Agriculture.pdf")
    items = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    return items[:limit] if limit else items


def covers(chunk: dict, pages: list[int]) -> bool:
    return any(chunk["page_start"] <= p <= chunk["page_end"] for p in pages)


def eval_retrieval(service, items: list[dict]) -> dict:
    from app.graph.pipeline import GraphState  # noqa: F401
    from app.ingest.metadata import tag_query
    from app.graph.schemas import RewriteOut
    from app.graph import prompts

    rows, hits1, hits3, hits6, quote6, rr = [], 0, 0, 0, 0, 0.0
    answerable = [i for i in items if i["type"] == "answerable"]
    for item in answerable:
        try:
            rw = service.llm.complete_json(prompts.REWRITE_SYSTEM, f"QUESTION:\n{item['question']}", RewriteOut)
            queries, keywords = rw.queries, rw.keywords + rw.crops + rw.problems
        except Exception:
            queries, keywords = [], []
        result = service.retriever.retrieve(question=item["question"], queries=queries, keywords=keywords, entities=tag_query(item["question"]), top_k=6)
        ranks = [k for k, p in enumerate(result.passages, start=1) if covers({"page_start": p.page_start, "page_end": p.page_end}, item["gold_pages"])]
        first = ranks[0] if ranks else None
        hits1 += bool(first and first <= 1)
        hits3 += bool(first and first <= 3)
        hits6 += bool(first and first <= 6)
        rr += 1 / first if first else 0
        q = any(any(_n(gq) in _n(p.content) for gq in item["gold_quotes"]) for p in result.passages)
        quote6 += q
        rows.append({"id": item["id"], "lang": item.get("lang", "en"), "first_hit_rank": first, "quote_hit": q, "retrieved_pages": [(p.page_start, p.page_end) for p in result.passages]})
    n = len(answerable)
    by_lang = {}
    for lang in sorted({r["lang"] for r in rows}):
        sub = [r for r in rows if r["lang"] == lang]
        by_lang[lang] = {"page_hit@6": wilson(sum(1 for r in sub if r["first_hit_rank"]), len(sub))}
    return {
        "page_hit@1": wilson(hits1, n),
        "page_hit@3": wilson(hits3, n),
        "page_hit@6": wilson(hits6, n),
        "quote_hit@6": wilson(quote6, n),
        "mrr": round(rr / n, 4) if n else None,
        "by_language": by_lang,
        "items": rows,
    }


def _n(text: str) -> str:
    import re
    import unicodedata

    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", text)).strip().lower()


def eval_answers(service, items: list[dict]) -> dict:
    from app.graph.citations import numbers_in, number_supported, split_sentences, cited_numbers

    rows = []
    for item in items:
        started = time.monotonic()
        try:
            result = service.answer({"task": "answer", "question": item["question"], "lang": item.get("lang", "en")}, use_cache=False)
            error = None
        except Exception as exc:  # an evaluation run reports failures rather than stopping
            result, error = {"status": "error", "citations": [], "answer": ""}, type(exc).__name__
        latency = round(time.monotonic() - started, 2)

        citations = result.get("citations", [])
        stored = {c["id"]: c for c in service.kb.chunks_by_ids([c["chunk_id"] for c in citations])} if citations else {}
        correct = sum(
            1
            for c in citations
            if c["chunk_id"] in stored
            and _n(c["quote"]) in _n(stored[c["chunk_id"]]["content"])
            and c["pdf_page_start"] == stored[c["chunk_id"]]["page_start"]
        )
        # Independent re-check of numbers in the final answer against the cited chunks.
        unsupported = 0
        texts = {c["n"]: stored[c["chunk_id"]]["content"] for c in citations if c["chunk_id"] in stored}
        for sentence in split_sentences(result.get("answer", "")):
            refs = cited_numbers(sentence)
            for number in numbers_in(sentence):
                if not refs or not number_supported(number, [texts.get(r, "") for r in refs]):
                    unsupported += 1
        answered = result["status"] in ("answered", "partial")
        gold_cited = item["type"] == "answerable" and any(covers({"page_start": c["pdf_page_start"], "page_end": c["pdf_page_end"]}, item["gold_pages"]) for c in citations)
        terms_ok = True
        if item["type"] == "answerable" and item.get("lang", "en") == "en":
            terms_ok = all(_n(t) in _n(result.get("answer", "") + " " + json.dumps(result.get("items", []), ensure_ascii=False)) for t in item.get("must_include", []))
        rows.append({
            "id": item["id"], "type": item["type"], "lang": item.get("lang", "en"), "status": result["status"], "error": error,
            "answered": answered, "gold_page_cited": gold_cited, "terms_ok": terms_ok, "citations": len(citations),
            "citations_correct": correct, "unsupported_numbers": unsupported, "latency_s": latency,
            "abstain_reason": result.get("abstain_reason"),
        })

    ans = [r for r in rows if r["type"] == "answerable"]
    una = [r for r in rows if r["type"] == "unanswerable"]
    total_cites = sum(r["citations"] for r in rows)
    answered_rows = [r for r in rows if r["answered"]]
    return {
        "answered_rate": wilson(sum(r["answered"] for r in ans), len(ans)),
        "grounded_accuracy": wilson(sum(r["answered"] and r["gold_page_cited"] and r["terms_ok"] for r in ans), len(ans)),
        "grounded_accuracy_when_answered": wilson(sum(r["gold_page_cited"] and r["terms_ok"] for r in ans if r["answered"]), sum(r["answered"] for r in ans)),
        "citation_correctness": wilson(sum(r["citations_correct"] for r in rows), total_cites),
        "answers_with_unsupported_numbers": wilson(sum(1 for r in answered_rows if r["unsupported_numbers"]), len(answered_rows)),
        "abstention_recall": wilson(sum(not r["answered"] for r in una), len(una)),
        "false_abstention_rate": wilson(sum(r["status"] == "abstained" for r in ans), len(ans)),
        "errors": sum(1 for r in rows if r["error"]),
        "median_latency_s": sorted(r["latency_s"] for r in rows)[len(rows) // 2] if rows else None,
        "items": rows,
    }


def eval_vision(service, manifest: Path) -> dict:
    if not manifest.exists():
        return {"status": "not_run", "reason": f"{manifest} not found. Add labelled photos (see eval/README.md); nothing was measured."}
    rows = []
    for line in manifest.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        item = json.loads(line)
        path = manifest.parent / item["image"]
        media = mimetypes.guess_type(path.name)[0] or "image/jpeg"
        result = service.answer({"task": "diagnose", "question": item.get("note", ""), "lang": item.get("lang", "en"), "image": path.read_bytes(), "image_media_type": media}, use_cache=False)
        names = " ".join(f"{i.get('name', '')} {i.get('source_term', '')}" for i in result.get("items", [])[:3]).lower()
        hit = any(t.lower() in names for t in item.get("label_terms", []))
        rows.append({"image": item["image"], "expected": item["expected"], "status": result["status"], "hit@3": hit})
    diag = [r for r in rows if r["expected"] == "diagnose"]
    abst = [r for r in rows if r["expected"] == "abstain"]
    return {
        "candidate_hit@3": wilson(sum(r["hit@3"] for r in diag), len(diag)),
        "abstained_on_diagnosable": wilson(sum(r["status"] == "abstained" for r in diag), len(diag)),
        "abstention_on_unusable": wilson(sum(r["status"] in ("abstained", "needs_clarification") for r in abst), len(abst)),
        "items": rows,
    }


def to_markdown(mode: str, report: dict) -> str:
    lines = [f"# Evaluation: {mode}", "", f"Run at {report['run_at']} · settings: `{json.dumps(report['settings'])}`", ""]
    for section, metrics in report["results"].items():
        lines += [f"## {section}", "", "| metric | rate | n | 95% CI |", "|---|---|---|---|"]
        for key, value in metrics.items():
            if isinstance(value, dict) and "rate" in value:
                ci = value["ci95"]
                lines.append(f"| {key} | {value['rate']} | {value['n']} | {ci[0]}–{ci[1]} |" if ci else f"| {key} | – | 0 | – |")
            elif key not in ("items", "by_language"):
                lines.append(f"| {key} | {value} | | |")
        lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["retrieval", "answer", "vision", "all"])
    parser.add_argument("--dataset", type=Path, default=ROOT / "eval" / "dataset.verified.jsonl")
    parser.add_argument("--vision-manifest", type=Path, default=ROOT / "eval" / "vision" / "manifest.jsonl")
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()

    load_env_files()
    settings = get_settings()
    configure_logging("WARNING")
    from app.service import build_service

    service = build_service(settings)
    items = load_items(args.dataset, args.limit) if args.mode != "vision" else []
    results: dict = {}
    if args.mode in ("retrieval", "all"):
        results["retrieval"] = eval_retrieval(service, items)
    if args.mode in ("answer", "all"):
        results["answer"] = eval_answers(service, items)
    if args.mode in ("vision", "all"):
        results["vision"] = eval_vision(service, args.vision_manifest)

    stamp = time.strftime("%Y%m%d-%H%M%S")
    report = {"run_at": stamp, "settings": settings.redacted(), "dataset": str(args.dataset.name), "results": results}
    out = ROOT / "eval" / "reports"
    out.mkdir(parents=True, exist_ok=True)
    (out / f"{stamp}-{args.mode}.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    (out / f"{stamp}-{args.mode}.md").write_text(to_markdown(args.mode, report), encoding="utf-8")
    print(to_markdown(args.mode, report))
    service.kb.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
