"""
Batch ingestion: extract → chunk → tag → embed → upsert.

- Extraction output is cached as JSONL next to the run (data/<doc_id>.chunks.jsonl), so embedding
  can be retried without re-parsing 2,700 pages.
- Chunk ids are content hashes: re-running skips chunks already embedded with the same model
  (resumable after a crash or rate limit) and removes chunks that no longer exist.
- Embeddings are requested in batches; each batch is committed on its own.
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Callable

from ..db import KnowledgeBase
from ..embeddings import Embedder
from .chunker import Chunk, Chunker
from .pdf_extract import ExtractReport, iter_blocks

log = logging.getLogger("rag.ingest")


@dataclass
class SourceInfo:
    id: str
    title: str
    authors: str | None = None
    publisher: str | None = None
    year: int | None = None
    isbn: str | None = None
    license_note: str | None = None


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def _extract_range(args: tuple[str, int, int, str, str]) -> tuple[list, ExtractReport]:
    pdf, start, end, ocr_language, tesseract_cmd = args
    report = ExtractReport()
    blocks = list(iter_blocks(pdf, pages=range(start, end), ocr_language=ocr_language, tesseract_cmd=tesseract_cmd, report=report))
    return blocks, report


def _article_ranges(pdf: Path, pages: range, parts: int) -> list[tuple[int, int]]:
    """Splits pages into about `parts` ranges that start on article boundaries (extraction state resets per article)."""
    import pymupdf

    with pymupdf.open(str(pdf)) as doc:
        starts = sorted({p for level, _, p in doc.get_toc(simple=True) if level == 2 and pages.start < p < pages.stop})
    cuts = [pages.start] + [starts[round(i * len(starts) / parts)] for i in range(1, parts) if starts] + [pages.stop]
    cuts = sorted(set(cuts))
    return [(a, b) for a, b in zip(cuts, cuts[1:]) if b > a]


def _merge_reports(reports: list[ExtractReport]) -> ExtractReport:
    merged = ExtractReport()
    for r in reports:
        merged.pages_total = r.pages_total
        for name in ("pages_processed", "pages_skipped_front_matter", "pages_ocr", "tables", "figures", "images", "blocks"):
            setattr(merged, name, getattr(merged, name) + getattr(r, name))
        merged.pages_ocr_unavailable += r.pages_ocr_unavailable
        merged.authors.update(r.authors)
        merged.articles = max(merged.articles, r.articles)
    return merged


def extract_chunks(pdf: Path, source: SourceInfo, *, pages: range | None = None, ocr_language: str = "eng", tesseract_cmd: str = "", workers: int = 1, progress: Callable[[str], None] = print) -> tuple[list[Chunk], ExtractReport]:
    """Extraction runs in parallel over article-aligned page ranges; chunking is sequential, in page order."""
    import pymupdf

    started = time.monotonic()
    if pages is None:
        with pymupdf.open(str(pdf)) as doc:
            pages = range(1, doc.page_count + 1)
    ranges = _article_ranges(pdf, pages, max(1, workers) * 3)
    jobs = [(str(pdf), a, b, ocr_language, tesseract_cmd) for a, b in ranges]
    results: list[tuple[list, ExtractReport]] = []
    if workers > 1 and len(jobs) > 1:
        from concurrent.futures import ProcessPoolExecutor

        with ProcessPoolExecutor(max_workers=workers) as pool:
            for i, result in enumerate(pool.map(_extract_range, jobs), start=1):
                results.append(result)
                progress(f"  extracted range {i}/{len(jobs)} (pages {jobs[i - 1][1]}–{jobs[i - 1][2] - 1})")
    else:
        for i, job in enumerate(jobs, start=1):
            results.append(_extract_range(job))
            progress(f"  extracted range {i}/{len(jobs)} (pages {job[1]}–{job[2] - 1})")
    blocks = [b for part, _ in results for b in part]
    report = _merge_reports([r for _, r in results])
    report.blocks = len(blocks)
    chunks = list(Chunker(source.id).chunk(blocks))
    progress(f"Extracted {len(blocks)} blocks → {len(chunks)} chunks in {time.monotonic() - started:.0f}s with {workers} worker(s)")
    return chunks, report


def write_jsonl(chunks: list[Chunk], authors: dict[str, str], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for chunk in chunks:
            row = chunk.as_row() | {"article_authors": authors.get(chunk.article)}
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def read_jsonl(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def embedding_input(row: dict) -> str:
    return f"{row['heading_path']}\n\n{row['content']}"


def store(kb: KnowledgeBase, embedder: Embedder, rows: list[dict], document: dict, *, batch: int = 64, progress: Callable[[str], None] = print) -> dict:
    kb.ensure_schema()
    existing = kb.document(document["id"])
    if existing and existing["embedding_model"] != embedder.model_name:
        # Mixed models in one table would make similarity scores meaningless.
        progress(f"Embedding model changed ({existing['embedding_model']} → {embedder.model_name}): re-embedding every chunk.")
        done: set[str] = set()
    else:
        done = kb.existing_chunk_ids(document["id"]) if existing else set()
    kb.upsert_document(document)

    todo = [r for r in rows if r["id"] not in done]
    progress(f"{len(rows)} chunks: {len(rows) - len(todo)} already stored, {len(todo)} to embed")
    started = time.monotonic()
    for i in range(0, len(todo), batch):
        part = todo[i : i + batch]
        vectors = embedder.embed_passages([embedding_input(r) for r in part])
        kb.insert_chunks(part, vectors)
        if (i // batch) % 10 == 0 or i + batch >= len(todo):
            rate = (i + len(part)) / max(1e-6, time.monotonic() - started)
            progress(f"  embedded {i + len(part)}/{len(todo)} ({rate:.1f} chunks/s)")
    removed = kb.delete_stale_chunks(document["id"], {r["id"] for r in rows})
    return {"total": len(rows), "embedded": len(todo), "skipped": len(rows) - len(todo), "removed_stale": removed}


def report_summary(rows: list[dict], report: ExtractReport) -> dict:
    from collections import Counter

    types = Counter(r["chunk_type"] for r in rows)
    tagged = {k: sum(1 for r in rows if r[k]) for k in ("crops", "diseases", "soils", "seasons", "nutrients")}
    lengths = sorted(len(r["content"]) for r in rows) or [0]
    return {
        "extract": report.as_dict(),
        "chunks": len(rows),
        "chunk_types": dict(types),
        "chunks_with_metadata": tagged,
        "chars": {"min": lengths[0], "median": lengths[len(lengths) // 2], "max": lengths[-1]},
    }


__all__ = ["SourceInfo", "extract_chunks", "write_jsonl", "read_jsonl", "store", "report_summary", "file_sha256", "asdict"]
