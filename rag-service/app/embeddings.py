"""
Multilingual (Bangla + English) embeddings, behind one interface:

  api    OpenAI-compatible /embeddings (default qwen/qwen3-embedding-8b at 1024 dimensions, the
         same model the existing chat retrieval uses, via AI Gateway or OpenRouter)
  local  sentence-transformers in-process (default BAAI/bge-m3, 1024 dimensions, no API cost)

Query and passage embeddings must come from the same model; the model name is stored with each
document at ingestion and checked at query time (see db.KnowledgeBase.check_embedding_model).
"""

from __future__ import annotations

import logging
import time
from typing import Protocol

import httpx

from .cache import TTLCache, cache_key
from .config import Settings

log = logging.getLogger("rag.embeddings")

# Qwen3 embeddings retrieve better when the *query* carries a task instruction; passages do not.
QWEN_QUERY_INSTRUCTION = "Instruct: Given an agriculture or gardening question, retrieve encyclopedia passages that answer it\nQuery: "


class Embedder(Protocol):
    model_name: str
    dimensions: int

    def embed_passages(self, texts: list[str]) -> list[list[float]]: ...
    def embed_query(self, text: str) -> list[float]: ...
    def embed_queries(self, texts: list[str]) -> list[list[float]]: ...


class ApiEmbedder:
    def __init__(self, settings: Settings) -> None:
        self.model_name = settings.embedding_model
        self.dimensions = settings.embedding_dimensions
        self._settings = settings
        self._http = httpx.Client(timeout=120)
        self._cache = TTLCache(settings.cache_size, settings.cache_ttl_s)

    def _request(self, inputs: list[str]) -> list[list[float]]:
        if not self._settings.embedding_api_key:
            raise RuntimeError("Embedding API key missing (AI_GATEWAY_API_KEY, OPENROUTER_API_KEY or RAG_EMBEDDING_API_KEY)")
        body = {"model": self.model_name, "input": inputs, "dimensions": self.dimensions}
        headers = {"Authorization": f"Bearer {self._settings.embedding_api_key}", "Content-Type": "application/json", "X-Title": "ChhadKrishi"}
        for attempt in range(5):
            try:
                response = self._http.post(f"{self._settings.embedding_base_url}/embeddings", json=body, headers=headers)
                if response.status_code in (429, 500, 502, 503, 504):
                    raise httpx.HTTPStatusError(f"HTTP {response.status_code}", request=response.request, response=response)
                response.raise_for_status()
                data = sorted(response.json()["data"], key=lambda d: d["index"])
                vectors = [d["embedding"] for d in data]
                if len(vectors) != len(inputs) or any(len(v) != self.dimensions for v in vectors):
                    raise RuntimeError(f"expected {len(inputs)} vectors of {self.dimensions} dimensions from {self.model_name}")
                return vectors
            except httpx.HTTPError as error:
                if attempt == 4:
                    raise
                wait = 2 ** attempt
                log.warning("embedding request failed (%s); retrying in %ss", type(error).__name__, wait)
                time.sleep(wait)
        raise RuntimeError("unreachable")

    def embed_passages(self, texts: list[str]) -> list[list[float]]:
        return self._request(texts)

    def embed_query(self, text: str) -> list[float]:
        return self.embed_queries([text])[0]

    def embed_queries(self, texts: list[str]) -> list[list[float]]:
        """All of a question's search queries in one request (cached per query)."""
        keys = [cache_key("q", self.model_name, t) for t in texts]
        vectors = [self._cache.get(k) for k in keys]
        missing = [i for i, v in enumerate(vectors) if v is None]
        if missing:
            prefix = QWEN_QUERY_INSTRUCTION if "qwen" in self.model_name.lower() else ""
            for i, vector in zip(missing, self._request([prefix + texts[i] for i in missing])):
                vectors[i] = vector
                self._cache.set(keys[i], vector)
        return vectors  # type: ignore[return-value]


class LocalEmbedder:
    def __init__(self, settings: Settings) -> None:
        from sentence_transformers import SentenceTransformer  # heavy import: only when selected

        self.model_name = settings.embedding_model
        self._model = SentenceTransformer(self.model_name, device="cpu")
        self.dimensions = int(self._model.get_sentence_embedding_dimension() or settings.embedding_dimensions)
        if self.dimensions != settings.embedding_dimensions:
            raise RuntimeError(f"{self.model_name} has {self.dimensions} dimensions; set RAG_EMBEDDING_DIMENSIONS={self.dimensions}")
        self._cache = TTLCache(settings.cache_size, settings.cache_ttl_s)
        # E5-family models need "query: " / "passage: " prefixes; bge-m3 needs none.
        self._e5 = "e5" in self.model_name.lower()

    def embed_passages(self, texts: list[str]) -> list[list[float]]:
        inputs = [f"passage: {t}" for t in texts] if self._e5 else texts
        return self._model.encode(inputs, batch_size=16, normalize_embeddings=True, show_progress_bar=False).tolist()

    def embed_query(self, text: str) -> list[float]:
        key = cache_key("q", self.model_name, text)
        cached = self._cache.get(key)
        if cached is not None:
            return cached
        vector = self._model.encode([f"query: {text}" if self._e5 else text], normalize_embeddings=True)[0].tolist()
        self._cache.set(key, vector)
        return vector

    def embed_queries(self, texts: list[str]) -> list[list[float]]:
        return [self.embed_query(t) for t in texts]


def build_embedder(settings: Settings) -> Embedder:
    return LocalEmbedder(settings) if settings.embedding_provider == "local" else ApiEmbedder(settings)
