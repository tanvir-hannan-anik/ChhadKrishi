from fastapi.testclient import TestClient

from app.retrieval.hybrid import HybridRetriever
from app.retrieval.rerank import FusionReranker
from tests.conftest import FakeBackend, FakeEmbedder, make_row


def test_fusion_filters_weak_vector_only_matches_and_duplicates():
    rows = [
        make_row(1, "Late blight of tomato is caused by Phytophthora infestans in cool wet weather.", similarity=0.72),
        make_row(2, "Late blight of tomato is caused by Phytophthora infestans in cool wet weather!", similarity=0.71),  # near-duplicate
        make_row(3, "Unrelated text about dairy cattle breeding programmes.", similarity=0.30),  # weak, no keyword hit
    ]
    retriever = HybridRetriever(FakeBackend(rows), FakeEmbedder(), FusionReranker(), min_similarity=0.45)
    result = retriever.retrieve(question="tomato late blight", queries=["late blight cause"], keywords=["blight"], entities={"crops": ["tomato"]}, top_k=5)
    ids = [p.id for p in result.passages]
    assert ids == ["doc:1"]
    assert result.best_similarity == 0.72


def test_api_requires_token_and_answers(make_service):
    from app import main
    from app.service import set_service
    from tests.test_graph import GOOD, GRADES, REWRITE, ROUTE, ROWS

    service, _, _ = make_service(ROWS, {"IntentOut": ROUTE, "RewriteOut": REWRITE, "GradeOut": GRADES, "Draft": GOOD})
    set_service(service)
    try:
        client = TestClient(main.app)
        assert client.post("/v1/answer", json={"question": "late blight?"}).status_code == 401
        response = client.post("/v1/answer", json={"question": "late blight?", "lang": "en"}, headers={"Authorization": "Bearer test-token"})
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "answered" and body["citations"][0]["page_ref"].startswith("Vol. 3")
        assert response.headers["x-request-id"]
        bad = client.post("/v1/diagnose", files={"image": ("x.gif", b"GIF89a", "image/gif")}, headers={"Authorization": "Bearer test-token"})
        assert bad.status_code == 415
        assert client.get("/health").json()["config"]["strict"] is True
    finally:
        set_service(None)
