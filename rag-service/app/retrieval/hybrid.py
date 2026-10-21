"""
Hybrid retrieval.

  1. Vector search for each rewritten query (multilingual embeddings: Bangla queries work too).
  2. Keyword search (Postgres full-text, OR of the rewriter's English keywords).
  3. Reciprocal-rank fusion of all lists, plus a small boost for chunks whose metadata matches the
     entities in the question (crop, disease, soil, season, nutrient).
  4. Reranking (cross-encoder when enabled, otherwise the fused score).
  5. Context filtering: drop weak matches, near-duplicates (overlapping chunks of the same section)
     and over-representation of one section, then keep the top K.
"""

from __future__ import annotations

import logging
import re
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Protocol, Sequence

from ..cache import TTLCache, cache_key
from ..db import Filters
from ..embeddings import Embedder
from .rerank import Reranker

log = logging.getLogger("rag.retrieval")

RRF_K = 60


class SearchBackend(Protocol):
    def vector_search(self, vector: Sequence[float], limit: int, filters: Filters | None = None) -> list[dict]: ...
    def keyword_search(self, keywords: Sequence[str], limit: int, filters: Filters | None = None) -> list[dict]: ...


@dataclass
class Passage:
    id: str
    content: str
    article: str
    heading_path: str
    page_start: int
    page_end: int
    page_label_start: str | None
    page_label_end: str | None
    chunk_type: str
    doi: str | None = None
    volume: str | None = None
    authors: str | None = None
    document_title: str | None = None
    publisher: str | None = None
    year: int | None = None
    metadata: dict[str, list[str]] = field(default_factory=dict)
    similarity: float | None = None
    keyword_rank: float | None = None
    fused: float = 0.0
    rerank: float | None = None
    sources: list[str] = field(default_factory=list)

    @staticmethod
    def from_row(row: dict) -> "Passage":
        return Passage(
            id=row["id"],
            content=row["content"],
            article=row["article"],
            heading_path=row["heading_path"],
            page_start=row["page_start"],
            page_end=row["page_end"],
            page_label_start=row.get("page_label_start"),
            page_label_end=row.get("page_label_end"),
            chunk_type=row.get("chunk_type", "text"),
            doi=row.get("doi"),
            volume=row.get("volume"),
            authors=row.get("article_authors"),
            document_title=row.get("document_title"),
            publisher=row.get("publisher"),
            year=row.get("year"),
            metadata={k: list(row.get(k) or []) for k in ("crops", "diseases", "soils", "seasons", "nutrients")},
        )

    @property
    def score(self) -> float:
        return self.rerank if self.rerank is not None else self.fused


@dataclass
class RetrievalResult:
    passages: list[Passage]
    candidates: int
    vector_hits: int
    keyword_hits: int
    best_similarity: float | None


def _overlap_ratio(a: str, b: str) -> float:
    wa, wb = set(re.findall(r"\w+", a.lower())), set(re.findall(r"\w+", b.lower()))
    if not wa or not wb:
        return 0.0
    return len(wa & wb) / min(len(wa), len(wb))


class HybridRetriever:
    def __init__(self, backend: SearchBackend, embedder: Embedder, reranker: Reranker, *, top_k_vector: int = 30, top_k_keyword: int = 30, min_similarity: float = 0.45, cache: TTLCache | None = None) -> None:
        self.backend = backend
        self.embedder = embedder
        self.reranker = reranker
        self.top_k_vector = top_k_vector
        self.top_k_keyword = top_k_keyword
        self.min_similarity = min_similarity
        self.cache = cache or TTLCache(256, 900)

    def retrieve(self, *, question: str, queries: Sequence[str], keywords: Sequence[str], entities: dict[str, list[str]] | None = None, filters: Filters | None = None, top_k: int = 6, exclude_ids: Sequence[str] = ()) -> RetrievalResult:
        key = cache_key("retrieve", question, list(queries), list(keywords), entities, filters.__dict__ if filters else None, top_k, list(exclude_ids))
        cached = self.cache.get(key)
        if cached is not None:
            return cached

        pool: dict[str, Passage] = {}
        vector_hits = keyword_hits = 0
        best_similarity: float | None = None

        def add(rows: list[dict], source: str, weight: float) -> None:
            for rank, row in enumerate(rows):
                if row["id"] in exclude_ids:
                    continue
                passage = pool.get(row["id"]) or Passage.from_row(row)
                pool[row["id"]] = passage
                passage.fused += weight / (RRF_K + rank + 1)
                passage.sources.append(source)
                if "similarity" in row and row["similarity"] is not None:
                    passage.similarity = max(passage.similarity or 0.0, float(row["similarity"]))
                if "keyword_rank" in row and row["keyword_rank"] is not None:
                    passage.keyword_rank = max(passage.keyword_rank or 0.0, float(row["keyword_rank"]))

        # The original question plus the rewrites (deduplicated), embedded in one request; the
        # vector searches and the keyword search then run concurrently (each on its own connection).
        all_queries = [q for q in dict.fromkeys([question, *queries]) if q.strip()]
        vectors = self.embedder.embed_queries(all_queries) if all_queries else []
        with ThreadPoolExecutor(max_workers=4) as executor:
            vector_jobs = [executor.submit(self.backend.vector_search, v, self.top_k_vector, filters) for v in vectors]
            keyword_job = executor.submit(self.backend.keyword_search, keywords, self.top_k_keyword, filters) if keywords else None
            for i, job in enumerate(vector_jobs):
                rows = job.result()
                vector_hits += len(rows)
                if rows:
                    best_similarity = max(best_similarity or 0.0, max(float(r["similarity"]) for r in rows))
                add(rows, f"vector:{i}", 1.0)
            if keyword_job is not None:
                rows = keyword_job.result()
                keyword_hits = len(rows)
                add(rows, "keyword", 1.0)

        # Metadata boost: entities named in the question.
        if entities:
            for passage in pool.values():
                matches = sum(len(set(passage.metadata.get(k, [])) & set(v)) for k, v in entities.items())
                if matches:
                    passage.fused *= 1 + 0.15 * min(matches, 3)

        candidates = sorted(pool.values(), key=lambda p: p.fused, reverse=True)[:40]
        # Context filtering, step 1: a chunk found only by vector search must be reasonably similar.
        candidates = [p for p in candidates if p.keyword_rank is not None or (p.similarity or 0.0) >= self.min_similarity]
        candidates = self.reranker.rerank(question, candidates)
        result = RetrievalResult(self._select(candidates, top_k), len(pool), vector_hits, keyword_hits, best_similarity)
        self.cache.set(key, result)
        return result

    @staticmethod
    def _select(candidates: list[Passage], top_k: int) -> list[Passage]:
        """Context filtering, step 2: no near-duplicates, at most 3 chunks from one section."""
        chosen: list[Passage] = []
        per_section: dict[str, int] = {}
        for passage in candidates:
            if any(_overlap_ratio(passage.content, c.content) > 0.8 for c in chosen):
                continue
            if per_section.get(passage.heading_path, 0) >= 3:
                continue
            chosen.append(passage)
            per_section[passage.heading_path] = per_section.get(passage.heading_path, 0) + 1
            if len(chosen) >= top_k:
                break
        return chosen
