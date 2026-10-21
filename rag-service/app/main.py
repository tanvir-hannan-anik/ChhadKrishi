"""
ChhadKrishi knowledge-base service (FastAPI). Called only by the Next.js server, with a shared
bearer token, exactly like ml-service. Browsers never call it directly.

  GET  /health               liveness + configuration summary (no secrets) + KB statistics
  POST /v1/retrieve          hybrid retrieval only (evidence passages with page references)
  POST /v1/answer            full LangGraph pipeline for a question (task: answer | care_plan | garden_plan)
  POST /v1/diagnose          photo (multipart) → vision observations → evidence-backed candidates or abstention

Every /v1 route needs "Authorization: Bearer $RAG_SERVICE_TOKEN".
"""

from __future__ import annotations

import hmac
import json
import logging
import time
import uuid
from typing import Literal

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .config import get_settings
from .db import Filters
from .envfile import load_env_files
from .graph.citations import page_reference
from .ingest.metadata import tag_query
from .logging_setup import configure_logging
from .service import get_service

load_env_files()
settings = get_settings()
configure_logging(settings.log_level, settings.log_json)
log = logging.getLogger("rag.api")

app = FastAPI(title="ChhadKrishi knowledge-base service", docs_url=None, redoc_url=None)

MAX_IMAGE_BYTES = 5 * 1024 * 1024
IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def require_token(authorization: str = Header(default="")) -> None:
    expected = settings.service_token
    given = authorization.removeprefix("Bearer ").strip()
    if not expected or not hmac.compare_digest(given.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="unauthorized")


@app.middleware("http")
async def access_log(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
    started = time.monotonic()
    try:
        response = await call_next(request)
    except Exception:
        log.exception("unhandled error", extra={"request_id": request_id, "route": request.url.path})
        response = JSONResponse({"error": "internal_error", "request_id": request_id}, status_code=500)
    duration = round((time.monotonic() - started) * 1000)
    log.info("%s %s %s %dms", request.method, request.url.path, response.status_code, duration, extra={"request_id": request_id, "route": request.url.path, "status": response.status_code, "duration_ms": duration})
    response.headers["x-request-id"] = request_id
    return response


# ---------------------------------------------------------------- models


class Turn(BaseModel):
    role: Literal["user", "assistant"]
    text: str = Field(max_length=4000)


class FilterIn(BaseModel):
    crops: list[str] | None = None
    diseases: list[str] | None = None
    chunk_types: list[Literal["text", "table", "figure", "ocr"]] | None = None


class AnswerIn(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    lang: Literal["bn", "en"] | None = None
    task: Literal["answer", "care_plan", "garden_plan"] = "answer"
    history: list[Turn] = Field(default_factory=list, max_length=12)
    context: str = Field(default="", max_length=3000, description="Gardener's saved setup, design requirements, etc.")
    observations: dict | None = Field(default=None, description="Optional photo observations made by the caller")
    filters: FilterIn | None = None


class RetrieveIn(BaseModel):
    query: str = Field(min_length=2, max_length=2000)
    keywords: list[str] = Field(default_factory=list, max_length=20)
    top_k: int = Field(default=6, ge=1, le=20)
    filters: FilterIn | None = None


async def _run(service, request: dict, *, use_cache: bool = True) -> dict:
    """Runs the graph; an unreachable database/embedding API is a 503 the app falls back from."""
    try:
        return await run_in_threadpool(service.answer, request, use_cache=use_cache)
    except Exception as error:
        log.error("knowledge pipeline unavailable: %s", type(error).__name__)
        raise HTTPException(status_code=503, detail="knowledge base temporarily unavailable") from error


def _service():
    service = get_service(settings)
    if not service.kb.configured:
        raise HTTPException(status_code=503, detail="knowledge base not configured (SUPABASE_DB_URL)")
    return service


# ---------------------------------------------------------------- routes


@app.get("/health")
def health() -> dict:
    out: dict = {"ok": True, "config": settings.redacted()}
    try:
        service = get_service(settings)
        out["kb"] = service.kb.stats() if service.kb.configured else None
        out["cache"] = service.answers.stats()
    except Exception as error:  # health must answer even when the database is down
        out["ok"] = False
        out["error"] = type(error).__name__
    return out


@app.post("/v1/retrieve", dependencies=[Depends(require_token)])
async def retrieve(body: RetrieveIn) -> dict:
    service = _service()
    filters = Filters(**body.filters.model_dump()) if body.filters else None
    entities = tag_query(body.query)
    keywords = body.keywords or [v for vs in entities.values() for v in vs]
    result = await run_in_threadpool(
        service.retriever.retrieve, question=body.query, queries=[], keywords=keywords, entities=entities, filters=filters, top_k=body.top_k
    )
    return {
        "passages": [
            {
                "chunk_id": p.id,
                "content": p.content,
                "article": p.article,
                "heading_path": p.heading_path,
                "page_ref": page_reference(p.page_label_start, p.page_label_end, p.page_start, p.page_end),
                "pdf_page_start": p.page_start,
                "pdf_page_end": p.page_end,
                "doi": p.doi,
                "score": round(p.score, 4),
                "similarity": p.similarity,
                "sources": p.sources,
            }
            for p in result.passages
        ],
        "candidates": result.candidates,
    }


@app.post("/v1/answer", dependencies=[Depends(require_token)])
async def answer(body: AnswerIn) -> dict:
    service = _service()
    request = {
        "task": body.task,
        "question": body.question,
        "history": [t.model_dump() for t in body.history],
        "context": body.context,
        "filters": body.filters.model_dump(exclude_none=True) if body.filters else {},
        "observations": body.observations,
    }
    if body.lang:
        request["lang"] = body.lang
    result = await _run(service, request)
    log.info("answer", extra={"intent": result.get("intent"), "status": result["status"], "evidence": len(result["citations"])})
    return result


@app.post("/v1/diagnose", dependencies=[Depends(require_token)])
async def diagnose(
    image: UploadFile = File(...),
    note: str = Form(default="", max_length=500),
    lang: Literal["bn", "en"] = Form(default="bn"),
    measurements: str = Form(default="", max_length=2000),
    context: str = Form(default="", max_length=3000),
) -> dict:
    service = _service()
    if image.content_type not in IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="unsupported image type")
    data = await image.read(MAX_IMAGE_BYTES + 1)
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="image too large")
    question = note.strip() or ("এই গাছের সমস্যা কী?" if lang == "bn" else "What is wrong with this plant?")
    request = {
        "task": "diagnose",
        "question": question,
        "lang": lang,
        "image": data,
        "image_media_type": image.content_type,
        "measurements": measurements,
        "context": context,
    }
    result = await _run(service, request, use_cache=False)
    log.info("diagnose", extra={"status": result["status"], "evidence": len(result["citations"])})
    return result


@app.exception_handler(json.JSONDecodeError)
async def bad_json(_: Request, __: json.JSONDecodeError):
    return JSONResponse({"error": "invalid_json"}, status_code=400)
