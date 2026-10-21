"""
Rerankers. The cross-encoder (default BAAI/bge-reranker-v2-m3, multilingual) scores each
(question, passage) pair jointly and is far more precise than embedding similarity; it needs
~2.3 GB RAM, so it is opt-in (RAG_RERANKER=cross-encoder). Without it, the fused hybrid score
orders candidates and the LLM evidence grader (graph node) does the precise filtering.
"""

from __future__ import annotations

import logging
import threading
from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    from .hybrid import Passage

log = logging.getLogger("rag.rerank")


class Reranker(Protocol):
    name: str

    def rerank(self, question: str, passages: list["Passage"]) -> list["Passage"]: ...


class FusionReranker:
    name = "fusion"

    def rerank(self, question: str, passages: list["Passage"]) -> list["Passage"]:
        return sorted(passages, key=lambda p: p.fused, reverse=True)


class CrossEncoderReranker:
    name = "cross-encoder"

    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        self._model = None
        self._lock = threading.Lock()

    def _load(self):
        with self._lock:
            if self._model is None:
                from sentence_transformers import CrossEncoder

                self._model = CrossEncoder(self.model_name, device="cpu", max_length=512)
        return self._model

    def rerank(self, question: str, passages: list["Passage"]) -> list["Passage"]:
        if not passages:
            return passages
        try:
            scores = self._load().predict([(question, f"{p.heading_path}\n{p.content}") for p in passages], batch_size=16)
        except Exception as error:  # the service keeps answering with fused order
            log.warning("cross-encoder unavailable (%s); using fused order", type(error).__name__)
            return FusionReranker().rerank(question, passages)
        for passage, score in zip(passages, scores):
            passage.rerank = float(score)
        return sorted(passages, key=lambda p: p.rerank or 0.0, reverse=True)


def build_reranker(kind: str, model_name: str) -> Reranker:
    return CrossEncoderReranker(model_name) if kind == "cross-encoder" else FusionReranker()
