"""End-to-end graph behaviour with a scripted LLM and an in-memory knowledge base."""

from app.llm import LlmError
from tests.conftest import make_row

BLIGHT = "Late blight, caused by Phytophthora infestans, produces water-soaked lesions on tomato leaves that turn brown. Protectant fungicides are applied at 7-10 day intervals in wet weather."
APHID = "Aphids are small sap-sucking insects that transmit many plant viruses."
ROWS = [make_row(1, BLIGHT, crops=["tomato"], diseases=["blight"]), make_row(2, APHID, section="Aphids", page=140)]

ROUTE = {"intent": "disease_diagnosis", "language": "en", "standalone_question": "How is tomato late blight managed?", "needs_clarification": False}
REWRITE = {"queries": ["tomato late blight management"], "keywords": ["late blight", "tomato", "fungicide"], "crops": ["tomato"], "problems": ["late blight"]}
GRADES = {"grades": [{"passage": 1, "relevant": True, "supports": "management", "quote": "Protectant fungicides are applied at 7-10 day intervals in wet weather."}, {"passage": 2, "relevant": False}]}
GOOD = {"status": "answered", "answer": "Late blight is caused by Phytophthora infestans [1]. Protectant fungicides are applied at 7-10 day intervals in wet weather [1].", "uncertainty": "Doses for containers are not given."}
INVENTED = {"status": "answered", "answer": "Spray mancozeb at 2 g per litre every 5 days [1]."}


def ask(service, question="How do I manage late blight on my tomatoes?", **extra):
    return service.answer({"task": "answer", "question": question, "lang": "en", **extra}, use_cache=False)


def test_grounded_answer_with_page_citations(make_service):
    service, _, _ = make_service(ROWS, {"IntentOut": ROUTE, "RewriteOut": REWRITE, "GradeOut": GRADES, "ConflictOut": {"conflicts": []}, "Draft": GOOD})
    result = ask(service)
    assert result["status"] == "answered"
    assert result["intent"] == "disease_diagnosis"
    [citation] = result["citations"]
    assert citation["n"] == 1 and citation["pdf_page_start"] == 100
    assert citation["page_ref"] == "Vol. 3, p. 70 (PDF p. 100)"
    assert citation["quote"] in BLIGHT
    assert "[1]" in result["answer"]


def test_invented_dose_is_retried_then_removed_or_abstained(make_service):
    service, _, llm = make_service(ROWS, {"IntentOut": ROUTE, "RewriteOut": REWRITE, "GradeOut": GRADES, "Draft": [INVENTED, INVENTED]})
    result = ask(service)
    assert [n for n, _ in llm.calls].count("Draft") == 2  # one retry with the failures as feedback
    assert "do not appear in the cited evidence" in llm.calls[-1][1]
    assert result["status"] == "abstained"
    assert "2 g" not in result["answer"]


def test_retry_fixes_the_draft(make_service):
    service, _, _ = make_service(ROWS, {"IntentOut": ROUTE, "RewriteOut": REWRITE, "GradeOut": GRADES, "Draft": [INVENTED, GOOD]})
    assert ask(service)["status"] == "answered"


def test_no_relevant_evidence_broadens_once_then_abstains(make_service):
    none = {"grades": [{"passage": 1, "relevant": False}, {"passage": 2, "relevant": False}]}
    service, backend, llm = make_service(ROWS, {"IntentOut": ROUTE, "RewriteOut": REWRITE, "GradeOut": none})
    result = ask(service)
    assert result["status"] == "abstained" and result["citations"] == []
    assert [n for n, _ in llm.calls].count("RewriteOut") == 2
    assert result["related"] and result["related"][0]["page_ref"].startswith("Vol. 3")


def test_unverifiable_quote_is_not_evidence(make_service):
    fake_quote = {"grades": [{"passage": 1, "relevant": True, "quote": "Spray copper daily at noon for the best results always."}]}
    service, _, _ = make_service(ROWS, {"IntentOut": ROUTE, "RewriteOut": REWRITE, "GradeOut": fake_quote})
    assert ask(service)["status"] == "abstained"


def test_smalltalk_is_not_applicable(make_service):
    service, backend, _ = make_service(ROWS, {"IntentOut": {**ROUTE, "intent": "smalltalk", "standalone_question": "hi"}})
    result = ask(service, "hi there")
    assert result["status"] == "not_applicable" and backend.vector_calls == 0


def test_vague_question_asks_for_clarification(make_service):
    vague = {**ROUTE, "needs_clarification": True, "clarifying_questions": ["Which plant?"]}
    service, backend, _ = make_service(ROWS, {"IntentOut": vague})
    result = ask(service, "my plant is sick")
    assert result["status"] == "needs_clarification" and result["clarifying_questions"] == ["Which plant?"]
    assert backend.vector_calls == 0


def test_router_failure_falls_back_to_rules(make_service):
    service, _, _ = make_service(ROWS, {"IntentOut": LlmError("down"), "RewriteOut": REWRITE, "GradeOut": GRADES, "Draft": GOOD})
    result = ask(service, "tomato leaves have brown spots, what disease?")
    assert result["intent"] == "disease_diagnosis" and result["status"] == "answered"
    assert result["trace"]["router"] == "rules"


def test_generation_failure_abstains(make_service):
    service, _, _ = make_service(ROWS, {"IntentOut": ROUTE, "RewriteOut": REWRITE, "GradeOut": GRADES, "Draft": LlmError("down")})
    assert ask(service)["status"] == "abstained"


def test_conflicts_are_reported_with_citations(make_service):
    rows = ROWS + [make_row(3, "Fungicide sprays at 14 day intervals are sufficient for late blight in dry seasons.", page=105)]
    def grades(listing: str) -> dict:
        # Passage numbers follow the fused ranking, so find them by content.
        blocks = listing.split("PASSAGE ")[1:]
        number = {text: int(b.split(":", 1)[0]) for b in blocks for text in ("7-10 day", "14 day") if text in b}
        return {"grades": [
            {"passage": number["7-10 day"], "relevant": True, "quote": "Protectant fungicides are applied at 7-10 day intervals in wet weather."},
            {"passage": number["14 day"], "relevant": True, "quote": "Fungicide sprays at 14 day intervals are sufficient for late blight in dry seasons."},
        ]}

    conflicts = {"conflicts": [{"description": "Spray interval differs (7-10 vs 14 days)", "evidence": [1, 2]}]}
    draft = {"status": "answered", "answer": "One source gives 7-10 day intervals in wet weather [1]. Another says 14 day intervals suffice in dry seasons [2]."}
    service, _, _ = make_service(rows, {"IntentOut": ROUTE, "RewriteOut": REWRITE, "GradeOut": grades, "ConflictOut": conflicts, "Draft": draft})
    result = ask(service)
    assert result["status"] == "answered"
    assert result["conflicts"] and sorted(result["conflicts"][0]["citations"]) == [1, 2]


def test_diagnosis_rejects_disease_names_not_in_evidence(make_service):
    observations = {"is_plant": True, "photo_usable": True, "plant_guess": "tomato", "symptoms": [{"description": "brown water-soaked lesions", "location": "leaves"}]}
    draft = {
        "status": "answered",
        "answer": "The lesions match late blight as described [1].",
        "items": [
            {"name": "Late blight", "source_term": "Late blight", "detail": "Water-soaked lesions that turn brown", "citations": [1], "likelihood": "medium"},
            {"name": "Septoria leaf spot", "source_term": "Septoria leaf spot", "detail": "", "citations": [1], "likelihood": "low"},
        ],
    }
    script = {"VisionObservations": observations, "RewriteOut": REWRITE, "GradeOut": GRADES, "Draft": [draft, draft]}
    service, _, _ = make_service(ROWS, script)
    result = service.answer({"task": "diagnose", "question": "what is wrong?", "lang": "en", "image": b"\xff\xd8fake", "image_media_type": "image/jpeg"}, use_cache=False)
    assert result["status"] == "answered"
    assert [i["name"] for i in result["items"]] == ["Late blight"]  # the invented candidate was removed
    assert result["observations"]["plant_guess"] == "tomato"


def test_unusable_photo_abstains_without_retrieval(make_service):
    service, backend, _ = make_service(ROWS, {"VisionObservations": {"is_plant": True, "photo_usable": False, "photo_problems": ["blurry"]}})
    result = service.answer({"task": "diagnose", "question": "?", "lang": "bn", "image": b"x", "image_media_type": "image/jpeg"}, use_cache=False)
    assert result["status"] == "abstained" and result["abstain_reason"] == "photo_unusable"
    assert backend.vector_calls == 0
    assert "ছবি" in result["answer"]


def test_answers_are_cached(make_service):
    service, backend, _ = make_service(ROWS, {"IntentOut": ROUTE, "RewriteOut": REWRITE, "GradeOut": GRADES, "Draft": GOOD})
    first = service.answer({"task": "answer", "question": "late blight?", "lang": "en"})
    second = service.answer({"task": "answer", "question": "late blight?", "lang": "en"})
    assert not first["cached"] and second["cached"]


FAITHFUL = {"checks": [{"sentence": 1, "supported": True}, {"sentence": 2, "supported": True}]}


def test_mistranslation_is_caught_and_regenerated(make_service):
    bad = {"status": "answered", "answer": "লেট ব্লাইট গমের রোগ [1]।"}  # "late blight is a disease of wheat" — not in the source
    unfaithful = {"checks": [{"sentence": 1, "supported": False, "problem": "source says tomato, not wheat"}]}
    script = {"IntentOut": ROUTE, "RewriteOut": REWRITE, "GradeOut": GRADES, "Draft": [bad, GOOD], "FaithfulnessOut": [unfaithful, FAITHFUL]}
    service, _, llm = make_service(ROWS, script)
    result = ask(service)
    assert result["status"] == "answered" and "গম" not in result["answer"]
    assert "source says tomato, not wheat" in [u for n, u in llm.calls if n == "Draft"][-1]


def test_persistent_unfaithful_sentence_is_removed_or_abstains(make_service):
    unfaithful = {"checks": [{"sentence": 1, "supported": False, "problem": "overstated"}, {"sentence": 2, "supported": True}]}
    script = {"IntentOut": ROUTE, "RewriteOut": REWRITE, "GradeOut": GRADES, "Draft": GOOD, "FaithfulnessOut": unfaithful}
    service, _, _ = make_service(ROWS, script)
    result = ask(service)
    assert result["status"] == "answered"
    assert "Phytophthora" not in result["answer"] and "7-10 day" in result["answer"]


def test_backend_failure_is_a_503(make_service):
    from fastapi.testclient import TestClient

    from app import main
    from app.service import set_service

    service, backend, _ = make_service(ROWS, {"IntentOut": ROUTE, "RewriteOut": REWRITE})
    backend.vector_search = lambda *a, **k: (_ for _ in ()).throw(ConnectionError("db down"))
    set_service(service)
    try:
        response = TestClient(main.app).post("/v1/answer", json={"question": "late blight?", "lang": "en"}, headers={"Authorization": "Bearer test-token"})
        assert response.status_code == 503
    finally:
        set_service(None)
