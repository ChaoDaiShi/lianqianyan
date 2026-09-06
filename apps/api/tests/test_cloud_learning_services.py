import json
import asyncio

from httpx import MockTransport, Request, Response

from app.core.config import Settings
from app.network.anysearch import AnySearchProvider
from app.resources.minimax_image import MiniMaxImageService
from app.resources.models import ResourceImageRequest


def test_anysearch_maps_real_result_shape_and_keeps_source_domain() -> None:
    def handler(request: Request) -> Response:
        assert request.url == "https://api.anysearch.com/v1/search"
        assert request.headers["authorization"] == "Bearer search-key"
        assert json.loads(request.content)["tag"] == "general.general"
        return Response(200, json={"data": {"results": [{"title": "死锁", "url": "https://example.edu/deadlock", "snippet": "四个必要条件"}]}})

    provider = AnySearchProvider(Settings(anysearch_api_key="search-key"), transport=MockTransport(handler))
    results = asyncio.run(provider.search("死锁", 4, "zh"))
    assert [(item.title, item.source_domain) for item in results] == [("死锁", "example.edu")]


def test_minimax_image_uses_course_grounded_prompt_and_returns_only_https_urls() -> None:
    def handler(request: Request) -> Response:
        assert str(request.url) == "https://api.minimaxi.com/v1/image_generation?GroupId=uid"
        payload = json.loads(request.content)
        assert payload["model"] == "image-01"
        assert "死锁" in payload["prompt"]
        # 无文字插画提示词：受众、图标隐喻、品牌用途与排除项必须完整
        assert "中学生" in payload["prompt"]
        assert "不出现任何文字" in payload["prompt"]
        assert "隐喻" in payload["prompt"]
        assert "四个必要条件" in payload["prompt"]
        assert payload["prompt_optimizer"] is True
        return Response(200, json={"data": {"image_urls": ["https://cdn.example.edu/deadlock.png", "http://unsafe.test/x.png"]}})

    settings = Settings(minimax_api_key="image-key", minimax_group_id="uid", minimax_base_url="https://api.minimaxi.com")
    result = asyncio.run(MiniMaxImageService(settings, transport=MockTransport(handler)).generate(
        ResourceImageRequest(course_id="course-os", knowledge_point_id="kp-deadlock")
    ))
    assert result.image_urls == ["https://cdn.example.edu/deadlock.png"]
