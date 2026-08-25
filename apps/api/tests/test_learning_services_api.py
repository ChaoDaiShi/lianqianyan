from __future__ import annotations

from fastapi.testclient import TestClient

from app.api.routes.network import get_network_search_service
from app.main import create_app
from app.network import (
    NetworkSearchResponse,
    NetworkSearchResult,
    NetworkSearchUnavailable,
)


class FakeNetworkSearchService:
    async def search(self, request):
        return NetworkSearchResponse(
            query=request.query,
            results=[
                NetworkSearchResult(
                    title="银行家算法",
                    summary="用于说明死锁避免思路的经典算法。",
                    url="https://zh.wikipedia.org/wiki/%E9%93%B6%E8%A1%8C%E5%AE%B6%E7%AE%97%E6%B3%95",
                    source_domain="zh.wikipedia.org",
                )
            ],
        )


class FailingNetworkSearchService:
    async def search(self, request):
        raise NetworkSearchUnavailable(
            "Wikipedia learning search is temporarily unavailable"
        )


def client_with_search_service(service) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_network_search_service] = lambda: service
    return TestClient(app)


def test_network_search_endpoint_returns_typed_source_results() -> None:
    response = client_with_search_service(FakeNetworkSearchService()).post(
        "/api/network/search",
        json={"query": "  银行家算法  ", "limit": 3, "language": "zh"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "provider": "wikipedia",
        "query": "银行家算法",
        "results": [
            {
                "title": "银行家算法",
                "summary": "用于说明死锁避免思路的经典算法。",
                "url": "https://zh.wikipedia.org/wiki/%E9%93%B6%E8%A1%8C%E5%AE%B6%E7%AE%97%E6%B3%95",
                "source_domain": "zh.wikipedia.org",
            }
        ],
    }


def test_network_search_endpoint_maps_sanitized_unavailability_to_503() -> None:
    response = client_with_search_service(FailingNetworkSearchService()).post(
        "/api/network/search",
        json={"query": "死锁", "language": "zh"},
    )

    assert response.status_code == 503
    assert response.json() == {
        "detail": "Wikipedia learning search is temporarily unavailable"
    }


def test_network_search_endpoint_enforces_query_limit_and_language_bounds() -> None:
    client = client_with_search_service(FakeNetworkSearchService())

    assert client.post("/api/network/search", json={"query": "x"}).status_code == 422
    assert (
        client.post(
            "/api/network/search", json={"query": "deadlock", "limit": 7}
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/network/search",
            json={"query": "deadlock", "language": "fr"},
        ).status_code
        == 422
    )


def test_compile_simulation_endpoint_returns_stages_and_output() -> None:
    response = TestClient(create_app()).post(
        "/api/lab/compile-simulate",
        json={
            "language": "c-edu",
            "code": (
                "int main() {\n"
                "  int x = 2;\n"
                "  printf(\"%d\\n\", x + 3);\n"
                "  return 0;\n"
                "}"
            ),
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["mode"] == "simulation"
    assert body["stdout"] == "5\n"
    assert [stage["status"] for stage in body["stages"]] == ["passed"] * 5
    assert "不执行本机程序" in body["safety_notice"]


def test_compile_simulation_endpoint_enforces_language_and_source_bounds() -> None:
    client = TestClient(create_app())
    invalid_language = client.post(
        "/api/lab/compile-simulate",
        json={"language": "python", "code": "print(1)"},
    )
    oversized = client.post(
        "/api/lab/compile-simulate",
        json={"language": "c-edu", "code": "x" * 4_001},
    )

    assert invalid_language.status_code == 422
    assert oversized.status_code == 422


def test_resource_generation_endpoint_returns_grounded_markdown() -> None:
    response = TestClient(create_app()).post(
        "/api/resources/generate",
        json={
            "course_id": "course-os",
            "knowledge_point_id": "kp-deadlock",
            "resource_type": "flashcards",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["resource_type"] == "flashcards"
    assert body["format"] == "markdown"
    assert body["generation_mode"] == "course_template"
    assert body["filename"] == "kp-deadlock-flashcards.md"
    assert body["source_sections"]
    assert "基于课程材料" in body["content"]


def test_resource_generation_endpoint_returns_404_without_fabricated_content() -> None:
    response = TestClient(create_app()).post(
        "/api/resources/generate",
        json={
            "course_id": "other-course",
            "knowledge_point_id": "kp-deadlock",
            "resource_type": "study_sheet",
        },
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "course knowledge point not found"}


def test_resource_generation_endpoint_rejects_unknown_resource_type() -> None:
    response = TestClient(create_app()).post(
        "/api/resources/generate",
        json={
            "course_id": "course-os",
            "knowledge_point_id": "kp-deadlock",
            "resource_type": "presentation",
        },
    )

    assert response.status_code == 422
