"""
Ingest the Agriculture Encyclopedia PDF into Supabase Postgres + pgvector.

  python -m scripts.ingest ../Book/Agriculture.pdf --dry-run          extract + chunk only, write JSONL + report
  python -m scripts.ingest ../Book/Agriculture.pdf                    extract (or reuse JSONL), embed, store
  python -m scripts.ingest ../Book/Agriculture.pdf --pages 30-120     a page range (testing)
  python -m scripts.ingest ../Book/Agriculture.pdf --reextract        ignore the cached JSONL

Run from rag-service/. Environment: see .env.example (SUPABASE_DB_URL, embedding provider key).
Safe to re-run: already-embedded chunks are skipped, so an interrupted run resumes.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.config import get_settings  # noqa: E402
from app.envfile import load_env_files  # noqa: E402
from app.ingest.pipeline import SourceInfo, extract_chunks, file_sha256, read_jsonl, report_summary, store, write_jsonl  # noqa: E402
from app.logging_setup import configure_logging  # noqa: E402

# Bibliographic data from the PDF's metadata and title pages.
ENCYCLOPEDIA = SourceInfo(
    id="eafs-2014",
    title="Encyclopedia of Agriculture and Food Systems (2nd ed.)",
    authors="Neal K. Van Alfen (Editor-in-Chief)",
    publisher="Elsevier / Academic Press",
    year=2014,
    isbn="978-0-08-093139-5",
    license_note="© 2014 Elsevier Inc. All rights reserved. Stored for internal retrieval only; excerpts are shown with page citations.",
)


def parse_pages(spec: str | None) -> range | None:
    if not spec:
        return None
    start, _, end = spec.partition("-")
    return range(int(start), int(end or start) + 1)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--dry-run", action="store_true", help="extract and chunk only; nothing is embedded or stored")
    parser.add_argument("--pages", help="PDF page range, e.g. 30-120 (1-based, inclusive)")
    parser.add_argument("--reextract", action="store_true", help="re-parse the PDF even if a chunk cache exists")
    parser.add_argument("--out", type=Path, default=ROOT / "data", help="directory for the JSONL cache and report")
    parser.add_argument("--workers", type=int, default=max(1, min(4, (os.cpu_count() or 2) - 1)), help="parallel extraction processes")
    args = parser.parse_args()

    load_env_files()
    settings = get_settings()
    configure_logging(settings.log_level, settings.log_json)
    log = logging.getLogger("rag.ingest")

    if not args.pdf.exists():
        log.error("PDF not found: %s", args.pdf)
        return 2
    pages = parse_pages(args.pages)
    suffix = f".p{pages.start}-{pages.stop - 1}" if pages else ""
    cache = args.out / f"{ENCYCLOPEDIA.id}{suffix}.chunks.jsonl"
    report_path = args.out / f"{ENCYCLOPEDIA.id}{suffix}.report.json"

    sha = file_sha256(args.pdf)
    meta_path = cache.with_suffix(".meta.json")
    cached_ok = cache.exists() and meta_path.exists() and json.loads(meta_path.read_text(encoding="utf-8")).get("sha256") == sha
    if cached_ok and not args.reextract:
        rows = read_jsonl(cache)
        summary = json.loads(report_path.read_text(encoding="utf-8")) if report_path.exists() else {}
        log.info("Reusing %d chunks from %s", len(rows), cache)
    else:
        chunks, report = extract_chunks(args.pdf, ENCYCLOPEDIA, pages=pages, ocr_language=settings.ocr_language, tesseract_cmd=settings.tesseract_cmd, workers=args.workers, progress=log.info)
        write_jsonl(chunks, report.authors, cache)
        rows = read_jsonl(cache)
        summary = report_summary(rows, report)
        report_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
        meta_path.write_text(json.dumps({"sha256": sha, "pages": args.pages}), encoding="utf-8")
        log.info("Wrote %s and %s", cache, report_path)

    print(json.dumps(summary, indent=2, ensure_ascii=False))
    if summary.get("extract", {}).get("pages_ocr_unavailable"):
        log.warning("Pages with no text layer were not OCR'd (install Tesseract and set TESSERACT_CMD): %s", summary["extract"]["pages_ocr_unavailable"])
    if args.dry_run:
        return 0

    if not settings.database_url:
        log.error("SUPABASE_DB_URL is not set")
        return 2
    from app.db import KnowledgeBase
    from app.embeddings import build_embedder

    embedder = build_embedder(settings)
    kb = KnowledgeBase(settings.database_url, embedder.dimensions)
    document = {
        "id": ENCYCLOPEDIA.id,
        "title": ENCYCLOPEDIA.title,
        "authors": ENCYCLOPEDIA.authors,
        "publisher": ENCYCLOPEDIA.publisher,
        "year": ENCYCLOPEDIA.year,
        "isbn": ENCYCLOPEDIA.isbn,
        "source_file": args.pdf.name,
        "sha256": sha,
        "page_count": summary.get("extract", {}).get("pages_total", 0),
        "embedding_model": embedder.model_name,
        "embedding_dimensions": embedder.dimensions,
        "license_note": ENCYCLOPEDIA.license_note,
        "ingest_report": summary,
    }
    try:
        result = store(kb, embedder, rows, document, batch=settings.embedding_batch, progress=log.info)
    finally:
        kb.close()
    log.info("Done: %s", result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
