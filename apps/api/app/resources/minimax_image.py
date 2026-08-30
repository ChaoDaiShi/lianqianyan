from __future__ import annotations

import httpx

from app.core.config import Settings
from app.knowledge import KnowledgeRepository
from app.resources.models import GeneratedResourceImage, ResourceImageRequest


class ResourceImageUnavailable(RuntimeError):
    pass


class MiniMaxImageService:
    endpoint = "https://api.minimax.io/v1/image_generation"

    def __init__(self, settings: Settings, *, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self._settings = settings
        self._transport = transport

    async def generate(self, request: ResourceImageRequest) -> GeneratedResourceImage:
        point = KnowledgeRepository().get_point_content(request.course_id, request.knowledge_point_id)
        if point is None:
            raise LookupError("course knowledge point not found")
        api_key = (self._settings.minimax_api_key or "").strip()
        if not api_key:
            raise ResourceImageUnavailable("MiniMax image generation is not configured")
        prompt = (
            f"教育信息图，主题：{point.title}；涵盖："
            + "、".join(section.title for section in point.sections[:6])
            + "。清晰的中文学习结构，紫蓝柔和配色，圆润卡片，无人物，无水印。"
        )[:1500]
        payload = {
            "model": self._settings.minimax_image_model,
            "prompt": prompt,
            "aspect_ratio": request.aspect_ratio,
            "response_format": "url",
            "n": 1,
            "prompt_optimizer": True,
        }
        try:
            async with httpx.AsyncClient(timeout=self._settings.minimax_timeout, transport=self._transport, follow_redirects=False) as client:
                response = await client.post(self.endpoint, headers={"Authorization": f"Bearer {api_key}"}, json=payload)
                response.raise_for_status()
                body = response.json()
        except (httpx.HTTPError, ValueError, TypeError) as exc:
            raise ResourceImageUnavailable("MiniMax image generation is temporarily unavailable") from exc
        urls = (body.get("data") or {}).get("image_urls", []) if isinstance(body, dict) else []
        safe_urls = [url for url in urls if isinstance(url, str) and url.startswith("https://")]
        if not safe_urls:
            raise ResourceImageUnavailable("MiniMax returned no image")
        return GeneratedResourceImage(model=self._settings.minimax_image_model, prompt=prompt, image_urls=safe_urls)
