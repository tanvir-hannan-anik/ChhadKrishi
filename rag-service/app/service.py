"""Wires settings → database, embedder, reranker, retriever, LLM and the compiled graph."""

from __future__ import annotations

import logging
import threading
from dataclasses import dataclass
from typing import Any

from .cache import TTLCache, cache_key
from .config import Settings
from .db import KnowledgeBase
from .embeddings import Embedder, build_embedder
from .graph.pipeline import Deps, GraphState, build_graph, run
from .llm import LlmClient, OpenAICompatibleClient
from .retrieval.hybrid import HybridRetriever
from .retrieval.rerank import build_reranker

log = logging.getLogger("rag.service")


@dataclass
class KnowledgeService:
    settings: Settings
    kb: Any
    embedder: Embedder
    retriever: HybridRetriever
    llm: LlmClient
    graph: Any
    answers: TTLCache

    def answer(self, request: GraphState, *, use_cache: bool = True) -> dict:
        # Photos are not cached (they are personal and large); text answers are, briefly.
        cacheable = use_cache and not request.get("image")
        key = cache_key("answer", {k: v for k, v in request.items() if k != "image"}) if cacheable else ""
        if cacheable and (hit := self.answers.get(key)) is not None:
            return hit | {"cached": True}
        result = run(self.graph, request)
        if cacheable and result["status"] in ("answered", "partial", "abstained", "not_applicable"):
            self.answers.set(key, result)
        return result | {"cached": False}


_lock = threading.Lock()
_service: KnowledgeService | None = None


def build_service(settings: Settings, *, kb: Any = None, embedder: Embedder | None = None, llm: LlmClient | None = None) -> KnowledgeService:
    embedder = embedder or build_embedder(settings)
    kb = kb if kb is not None else KnowledgeBase(settings.database_url, embedder.dimensions)
    retriever = HybridRetriever(
        kb,
        embedder,
        build_reranker(settings.reranker, settings.reranker_model),
        top_k_vector=settings.top_k_vector,
        top_k_keyword=settings.top_k_keyword,
        min_similarity=settings.min_vector_similarity,
        cache=TTLCache(settings.cache_size, min(settings.cache_ttl_s, 900)),
    )
    llm = llm or OpenAICompatibleClient(settings)
    graph = build_graph(Deps(settings=settings, llm=llm, retriever=retriever))
    return KnowledgeService(settings, kb, embedder, retriever, llm, graph, TTLCache(settings.cache_size, settings.cache_ttl_s))


def get_service(settings: Settings) -> KnowledgeService:
    global _service
    with _lock:
        if _service is None:
            _service = build_service(settings)
        return _service


def set_service(service: KnowledgeService | None) -> None:
    """Tests inject a service built with fakes."""
    global _service
    with _lock:
        _service = service
