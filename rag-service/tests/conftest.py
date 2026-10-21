from __future__ import annotations

import os
import sys
from dataclasses import replace
from pathlib import Path
from typing import Any, Callable

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
# Tests never read the developer's real keys or database.
for key in ("SUPABASE_DB_URL", "GROQ_API_KEY", "OPENROUTER_API_KEY", "AI_GATEWAY_API_KEY", "RAG_SERVICE_TOKEN"):
    os.environ.pop(key, None)
os.environ["RAG_SERVICE_TOKEN"] = "test-token"
os.environ["RAG_SKIP_ENV_FILES"] = "1"

from app.config import get_settings  # noqa: E402
from app.llm import LlmError  # noqa: E402


class FakeEmbedder:
    model_name = "fake"
    dimensions = 4

    def embed_query(self, text: str) -> list[float]:
        return [1.0, 0.0, 0.0, 0.0]

    def embed_passages(self, texts: list[str]) -> list[list[float]]:
        return [[1.0, 0.0, 0.0, 0.0] for _ in texts]

    def embed_queries(self, texts: list[str]) -> list[list[float]]:
        return [self.embed_query(t) for t in texts]


def make_row(i: int, content: str, *, article: str = "Tomato Diseases", section: str = "Late Blight", page: int = 100, similarity: float = 0.7, **meta) -> dict:
    return {
        "id": f"doc:{i}",
        "document_id": "doc",
        "chunk_type": "text",
        "volume": "Part 3",
        "article": article,
        "article_authors": "A Author",
        "section": section,
        "subsection": "",
        "heading_path": f"{article} › {section}",
        "page_start": page,
        "page_end": page,
        "page_label_start": f"V3:{page - 30}",
        "page_label_end": f"V3:{page - 30}",
        "doi": "10.1016/test",
        "content": content,
        "crops": meta.get("crops", []),
        "diseases": meta.get("diseases", []),
        "soils": [],
        "seasons": [],
        "nutrients": [],
        "document_title": "Encyclopedia of Agriculture and Food Systems",
        "publisher": "Elsevier",
        "year": 2014,
        "similarity": similarity,
    }


class FakeBackend:
    """In-memory stand-in for KnowledgeBase search."""

    configured = True

    def __init__(self, rows: list[dict]) -> None:
        self.rows = rows
        self.vector_calls = 0
        self.keyword_calls = 0

    def vector_search(self, vector, limit, filters=None):
        self.vector_calls += 1
        return [dict(r) for r in self.rows][:limit]

    def keyword_search(self, keywords, limit, filters=None):
        self.keyword_calls += 1
        words = {w.lower() for k in keywords for w in k.split()}
        hits = [dict(r, keyword_rank=0.5) for r in self.rows if words & set(r["content"].lower().split())]
        return hits[:limit]

    def stats(self):
        return {"documents": [{"id": "doc", "chunks": len(self.rows)}]}


class ScriptedLlm:
    """Returns scripted outputs per schema name: a value, a list (consumed in order) or a callable."""

    def __init__(self, script: dict[str, Any]) -> None:
        self.script = script
        self.calls: list[tuple[str, Any]] = []

    def complete_json(self, system, user, schema, *, vision=False, temperature=0.0):
        name = schema.__name__
        self.calls.append((name, user))
        entry = self.script.get(name)
        if entry is None:
            raise LlmError(f"no script for {name}")
        if isinstance(entry, list):
            entry = entry.pop(0) if len(entry) > 1 else entry[0]
        if isinstance(entry, Exception):
            raise entry
        value = entry(user) if callable(entry) else entry
        return schema.model_validate(value)


@pytest.fixture
def settings():
    return replace(get_settings(), strict=True, min_evidence=1, max_generation_attempts=2, top_k_final=4, min_vector_similarity=0.4, database_url="postgres://fake")


@pytest.fixture
def make_service(settings) -> Callable:
    from app.service import build_service

    def factory(rows: list[dict], script: dict[str, Any]):
        backend = FakeBackend(rows)
        llm = ScriptedLlm(script)
        service = build_service(settings, kb=backend, embedder=FakeEmbedder(), llm=llm)
        return service, backend, llm

    return factory
