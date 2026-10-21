"""
All configuration comes from environment variables (see rag-service/.env.example). Secrets are
read once at start-up and never logged; `Settings.redacted()` is what /health and logs show.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def _int(name: str, default: int) -> int:
    try:
        return int(_env(name, str(default)))
    except ValueError:
        return default


def _float(name: str, default: float) -> float:
    try:
        return float(_env(name, str(default)))
    except ValueError:
        return default


def _bool(name: str, default: bool) -> bool:
    value = _env(name, "1" if default else "0").lower()
    return value in {"1", "true", "yes", "on"}


# OpenAI-compatible endpoints the service can use for chat/vision LLMs and embeddings.
PROVIDER_BASE_URLS = {
    "groq": "https://api.groq.com/openai/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "gateway": "https://ai-gateway.vercel.sh/v1",
}
PROVIDER_KEYS = {"groq": "GROQ_API_KEY", "openrouter": "OPENROUTER_API_KEY", "gateway": "AI_GATEWAY_API_KEY"}
# Defaults mirror src/lib/ai/config.ts so the Python graph and the Next.js app use the same models.
LLM_DEFAULTS = {
    "groq": ("openai/gpt-oss-120b", "qwen/qwen3.8-27b"),
    "openrouter": ("google/gemma-4-31b-it:free", "google/gemma-4-31b-it:free"),
    "gateway": ("anthropic/claude-sonnet-5.5", "anthropic/claude-sonnet-5.5"),
}


@dataclass(frozen=True)
class Settings:
    service_token: str
    database_url: str

    llm_provider: str
    llm_base_url: str
    llm_api_key: str
    llm_model: str
    vision_model: str
    llm_timeout_s: float

    embedding_provider: str  # "api" | "local"
    embedding_model: str
    embedding_dimensions: int
    embedding_base_url: str
    embedding_api_key: str
    embedding_batch: int

    reranker: str  # "cross-encoder" | "none"
    reranker_model: str

    # Retrieval / grounding thresholds.
    top_k_vector: int
    top_k_keyword: int
    top_k_final: int
    min_vector_similarity: float
    min_evidence: int
    max_generation_attempts: int
    strict: bool

    cache_ttl_s: int
    cache_size: int
    log_level: str
    log_json: bool
    ocr_language: str
    tesseract_cmd: str

    extra: dict = field(default_factory=dict)

    def redacted(self) -> dict:
        return {
            "llm_provider": self.llm_provider,
            "llm_model": self.llm_model,
            "llm_fallbacks": [f"{f['name']}:{f['model']}" for f in self.extra.get("llm_fallbacks", [])],
            "vision_model": self.vision_model,
            "embedding_provider": self.embedding_provider,
            "embedding_model": self.embedding_model,
            "embedding_dimensions": self.embedding_dimensions,
            "reranker": self.reranker,
            "strict": self.strict,
            "database": bool(self.database_url),
            "llm_key": bool(self.llm_api_key),
            "embedding_key": bool(self.embedding_api_key) or self.embedding_provider == "local",
        }


def _pick_provider(forced: str) -> str:
    if forced in PROVIDER_BASE_URLS:
        return forced
    for name in ("gateway", "groq", "openrouter"):
        if _env(PROVIDER_KEYS[name]):
            return name
    return "groq"


def _fallbacks(primary: str) -> list[dict]:
    """
    RAG_LLM_FALLBACK=openrouter (comma-separated) adds endpoints tried when the primary is rate
    limited or down. Each uses that provider's key and RAG_LLM_FALLBACK_MODEL (default: the
    provider's default model). Note that fallback calls may be billed by that provider.
    """
    out = []
    for name in [n.strip() for n in _env("RAG_LLM_FALLBACK").split(",") if n.strip()]:
        if name == primary or name not in PROVIDER_BASE_URLS or not _env(PROVIDER_KEYS[name]):
            continue
        chat_default, vision_default = LLM_DEFAULTS[name]
        model = _env("RAG_LLM_FALLBACK_MODEL", chat_default)
        out.append({"name": name, "base_url": PROVIDER_BASE_URLS[name], "api_key": _env(PROVIDER_KEYS[name]), "model": model, "vision_model": _env("RAG_VISION_FALLBACK_MODEL", vision_default)})
    return out


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    llm_provider = _pick_provider(_env("RAG_LLM_PROVIDER"))
    chat_default, vision_default = LLM_DEFAULTS[llm_provider]

    # Embeddings: the existing app embeds with Qwen3 through AI Gateway or OpenRouter (Groq has no
    # embedding endpoint). "local" runs a multilingual model in-process instead.
    embedding_provider = _env("RAG_EMBEDDING_PROVIDER", "api")
    embedding_api = _env("RAG_EMBEDDING_API", "gateway" if _env("AI_GATEWAY_API_KEY") else "openrouter")
    default_embedding_model = "BAAI/bge-m3" if embedding_provider == "local" else "qwen/qwen3-embedding-8b"

    return Settings(
        service_token=_env("RAG_SERVICE_TOKEN"),
        database_url=_env("SUPABASE_DB_URL") or _env("RAG_DATABASE_URL"),
        llm_provider=llm_provider,
        llm_base_url=_env("RAG_LLM_BASE_URL", PROVIDER_BASE_URLS[llm_provider]),
        llm_api_key=_env("RAG_LLM_API_KEY") or _env(PROVIDER_KEYS[llm_provider]),
        llm_model=_env("RAG_LLM_MODEL", chat_default),
        vision_model=_env("RAG_VISION_MODEL", vision_default),
        llm_timeout_s=_float("RAG_LLM_TIMEOUT_S", 60.0),
        embedding_provider=embedding_provider,
        embedding_model=_env("RAG_EMBEDDING_MODEL", default_embedding_model),
        embedding_dimensions=_int("RAG_EMBEDDING_DIMENSIONS", 1024),
        embedding_base_url=_env("RAG_EMBEDDING_BASE_URL", PROVIDER_BASE_URLS.get(embedding_api, PROVIDER_BASE_URLS["openrouter"])),
        embedding_api_key=_env("RAG_EMBEDDING_API_KEY") or _env(PROVIDER_KEYS.get(embedding_api, "OPENROUTER_API_KEY")),
        embedding_batch=_int("RAG_EMBEDDING_BATCH", 64),
        reranker=_env("RAG_RERANKER", "none"),
        reranker_model=_env("RAG_RERANKER_MODEL", "BAAI/bge-reranker-v2-m3"),
        top_k_vector=_int("RAG_TOP_K_VECTOR", 30),
        top_k_keyword=_int("RAG_TOP_K_KEYWORD", 30),
        top_k_final=_int("RAG_TOP_K_FINAL", 6),
        min_vector_similarity=_float("RAG_MIN_SIMILARITY", 0.45),
        min_evidence=_int("RAG_MIN_EVIDENCE", 1),
        max_generation_attempts=_int("RAG_MAX_ATTEMPTS", 2),
        strict=_bool("RAG_STRICT", True),
        cache_ttl_s=_int("RAG_CACHE_TTL_S", 3600),
        cache_size=_int("RAG_CACHE_SIZE", 512),
        log_level=_env("RAG_LOG_LEVEL", "INFO").upper(),
        log_json=_bool("RAG_LOG_JSON", False),
        ocr_language=_env("RAG_OCR_LANGUAGE", "eng"),
        tesseract_cmd=_env("TESSERACT_CMD"),
        extra={"llm_fallbacks": _fallbacks(llm_provider)},
    )
