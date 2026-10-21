from dataclasses import replace

import httpx
import pytest
from pydantic import BaseModel

from app.llm import LlmError, OpenAICompatibleClient, parse_json_object


class Answer(BaseModel):
    value: int


def client_with(settings, handler, fallbacks=()):
    s = replace(settings, llm_api_key="primary-key", llm_base_url="https://primary.test/v1", llm_timeout_s=2.0, extra={"llm_fallbacks": list(fallbacks)})
    client = OpenAICompatibleClient(s)
    client._http = httpx.Client(transport=httpx.MockTransport(handler))
    return client


def ok(content: str) -> httpx.Response:
    return httpx.Response(200, json={"choices": [{"message": {"content": content}}]})


def test_rate_limited_primary_falls_back(settings, monkeypatch):
    monkeypatch.setattr("time.sleep", lambda s: None)
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request.url.host)
        return httpx.Response(429, headers={"retry-after": "0"}) if request.url.host == "primary.test" else ok('{"value": 7}')

    fallback = {"name": "openrouter", "base_url": "https://fallback.test/v1", "api_key": "k", "model": "m", "vision_model": "v"}
    assert client_with(settings, handler, [fallback]).complete_json("sys", "q", Answer).value == 7
    assert calls.count("primary.test") == 3 and calls[-1] == "fallback.test"


def test_client_errors_are_not_retried(settings):
    calls = []

    def handler(request):
        calls.append(1)
        return httpx.Response(400)

    with pytest.raises(LlmError):
        client_with(settings, handler).complete_json("sys", "q", Answer)
    assert len(calls) == 1


def test_invalid_json_is_repaired_once(settings):
    replies = iter(["not json at all", '```json\n{"value": 3}\n```'])

    def handler(request):
        return ok(next(replies))

    assert client_with(settings, handler).complete_json("sys", "q", Answer).value == 3


def test_parse_json_object_tolerates_prose():
    assert parse_json_object('Sure! {"value": 1} hope that helps') == {"value": 1}
