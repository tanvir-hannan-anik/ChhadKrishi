"""
Minimal OpenAI-compatible chat client (Groq, OpenRouter and AI Gateway all speak this protocol).
JSON output is requested with response_format and then *validated* by the caller with pydantic;
a malformed reply is retried once with the validation error, then surfaced as LlmError.

Resilience: each call has a total time budget; 429/5xx/network errors are retried (honouring
Retry-After) and then handed to the next configured endpoint (RAG_LLM_FALLBACK), e.g. Groq's free
tier → OpenRouter. Non-retryable 4xx errors fail immediately.
"""

from __future__ import annotations

import base64
import json
import logging
import re
import time
from dataclasses import dataclass
from typing import Any, Protocol, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from .config import Settings

log = logging.getLogger("rag.llm")
T = TypeVar("T", bound=BaseModel)
RETRYABLE = {408, 429, 500, 502, 503, 504}


class LlmError(RuntimeError):
    pass


class LlmClient(Protocol):
    def complete_json(self, system: str, user: str | list[dict], schema: type[T], *, vision: bool = False, temperature: float = 0.0) -> T: ...


def image_part(image: bytes, media_type: str) -> dict:
    return {"type": "image_url", "image_url": {"url": f"data:{media_type};base64,{base64.b64encode(image).decode()}"}}


_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


def parse_json_object(text: str) -> Any:
    """Tolerates code fences and leading prose: models occasionally wrap JSON despite instructions."""
    cleaned = _FENCE.sub("", text.strip())
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start, end = cleaned.find("{"), cleaned.rfind("}")
        if start >= 0 and end > start:
            return json.loads(cleaned[start : end + 1])
        raise


@dataclass(frozen=True)
class Endpoint:
    name: str
    base_url: str
    api_key: str
    model: str
    vision_model: str


class OpenAICompatibleClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.endpoints = [Endpoint(settings.llm_provider, settings.llm_base_url, settings.llm_api_key, settings.llm_model, settings.vision_model)]
        self.endpoints += [Endpoint(**fallback) for fallback in settings.extra.get("llm_fallbacks", [])]
        self._http = httpx.Client(timeout=httpx.Timeout(settings.llm_timeout_s, connect=10.0))

    def _post_once(self, endpoint: Endpoint, payload: dict, deadline: float) -> str:
        headers = {"Authorization": f"Bearer {endpoint.api_key}", "Content-Type": "application/json", "X-Title": "ChhadKrishi"}
        last = "no attempt"
        for attempt in range(3):
            if time.monotonic() >= deadline:
                break
            try:
                response = self._http.post(f"{endpoint.base_url}/chat/completions", headers=headers, json=payload)
            except httpx.HTTPError as error:
                last = type(error).__name__
            else:
                if response.status_code < 400:
                    return response.json()["choices"][0]["message"].get("content") or ""
                last = f"HTTP {response.status_code}"
                # The body may echo the prompt, so it is never logged.
                if response.status_code not in RETRYABLE:
                    raise LlmError(f"{endpoint.name}: provider {last}")
                retry_after = response.headers.get("retry-after")
                if retry_after and retry_after.replace(".", "", 1).isdigit():
                    wait = float(retry_after)
                    if time.monotonic() + wait >= deadline:
                        break
                    time.sleep(min(wait, 30.0))
                    continue
            time.sleep(min(2.0 * (attempt + 1), max(0.0, deadline - time.monotonic())))
        raise LlmError(f"{endpoint.name}: provider {last}")

    def _post(self, payload: dict, vision: bool) -> str:
        usable = [e for e in self.endpoints if e.api_key]
        if not usable:
            raise LlmError("LLM is not configured (set GROQ_API_KEY, OPENROUTER_API_KEY or RAG_LLM_API_KEY)")
        errors = []
        for endpoint in usable:
            # Each endpoint gets its own budget so a rate-limited primary still leaves time for the fallback.
            deadline = time.monotonic() + self.settings.llm_timeout_s * 1.5
            try:
                return self._post_once(endpoint, payload | {"model": endpoint.vision_model if vision else endpoint.model}, deadline)
            except LlmError as error:
                errors.append(str(error))
                log.warning("LLM endpoint failed (%s)%s", error, "; trying fallback" if endpoint is not usable[-1] else "")
        raise LlmError("; ".join(errors))

    def complete_json(self, system: str, user: str | list[dict], schema: type[T], *, vision: bool = False, temperature: float = 0.0) -> T:
        schema_hint = json.dumps(schema.model_json_schema(), ensure_ascii=False)
        messages: list[dict] = [
            {"role": "system", "content": f"{system}\n\nReturn ONLY a JSON object that validates against this JSON Schema:\n{schema_hint}"},
            {"role": "user", "content": user},
        ]
        payload: dict[str, Any] = {"messages": messages, "temperature": temperature, "response_format": {"type": "json_object"}}
        model = self.settings.vision_model if vision else self.settings.llm_model
        if model.startswith("openai/gpt-oss"):
            payload["reasoning_effort"] = "low"

        for attempt in range(2):
            text = self._post(payload, vision)
            try:
                return schema.model_validate(parse_json_object(text))
            except (ValidationError, json.JSONDecodeError) as error:
                log.warning("LLM returned invalid JSON for %s (attempt %d)", schema.__name__, attempt + 1)
                payload["messages"] = messages + [
                    {"role": "assistant", "content": text[:4000]},
                    {"role": "user", "content": f"That was not valid for the schema: {str(error)[:600]}. Reply again with only the corrected JSON object."},
                ]
        raise LlmError(f"invalid structured output for {schema.__name__}")
