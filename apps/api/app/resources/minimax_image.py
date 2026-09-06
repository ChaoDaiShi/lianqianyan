from __future__ import annotations

import httpx

from app.core.config import Settings
from app.knowledge import KnowledgeRepository
from app.resources.models import GeneratedResourceImage, ImagePlanPayload, ResourceImageRequest


class ResourceImageUnavailable(RuntimeError):
    pass


class MiniMaxImageService:
    image_path = "/v1/image_generation"

    def __init__(self, settings: Settings, *, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self._settings = settings
        self._group_id = (settings.minimax_group_id or "").strip()
        self._endpoint = f"{settings.minimax_base_url.rstrip('/')}{self.image_path}"
        self._transport = transport

    @staticmethod
    def build_prompt(point_title: str, section_titles: list[str], plan: "ImagePlanPayload | None" = None) -> str:
        """无文字教育插画提示词（提示结构参考 OpenAI Cookbook 图像提示指南：
        场景/受众 → 画面构成 → 风格 → 排除 → 用途）。

        实测 MiniMax image-01 渲染中文会输出伪字乱码（连两字标题都不可靠），
        因此只让模型绘制图标隐喻，真实文字由前端预览与导出排版承载。
        有 AI 配图方案时使用方案中的隐喻描述，否则回退到章节标题做隐喻。
        """
        cards = plan.card_metaphors if plan and plan.card_metaphors else section_titles
        cards = cards[:6]
        central = (plan.central_metaphor if plan and plan.central_metaphor else f"「{point_title}」的主题").strip()
        return (
            f"为中学生课程「{point_title}」绘制一张扁平风教育插画，画面中不出现任何文字。"
            f"画面：中央一个发光圆形核心图标，视觉隐喻：{central}；"
            f"周围环绕 {len(cards)} 个白色圆角卡片模块，每张卡片只放一个扁平线性图标，"
            f"分别隐喻：{'；'.join(cards)}；"
            "卡片之间用带箭头的浅灰细线按学习顺序顺时针连接。"
            "风格：背景从浅紫 #EDE9FE 渐变到浅蓝 #E0F2FE，卡片轻投影、圆角一致，"
            "图标线条粗细统一，留白充足，构图居中平衡。"
            "排除：不出现任何文字、汉字、字母、数字、水印、二维码、人物、照片。"
            "用途：课程学习信息图（真实文字由上层排版叠加）。"
        )[:1500]

    @staticmethod
    def point_content(course_id: str, knowledge_point_id: str):
        return KnowledgeRepository().get_point_content(course_id, knowledge_point_id)

    async def generate(self, request: ResourceImageRequest) -> GeneratedResourceImage:
        point = KnowledgeRepository().get_point_content(request.course_id, request.knowledge_point_id)
        if point is None:
            raise LookupError("course knowledge point not found")
        plan = request.plan
        if plan is not None and not plan.should_generate:
            reason = plan.reason or "AI 判断该知识点更适合纯文字排版"
            return GeneratedResourceImage(model=self._settings.minimax_image_model, prompt="", image_urls=[], skipped=True, skip_reason=reason)
        api_key = (self._settings.minimax_api_key or "").strip()
        if not api_key:
            raise ResourceImageUnavailable("MiniMax image generation is not configured")
        prompt = self.build_prompt(point.title, [section.title for section in point.sections[:6]], plan)
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
                response = await client.post(
                    self._endpoint,
                    params={"GroupId": self._group_id} if self._group_id else None,
                    headers={"Authorization": f"Bearer {api_key}"},
                    json=payload,
                )
                response.raise_for_status()
                body = response.json()
        except (httpx.HTTPError, ValueError, TypeError) as exc:
            raise ResourceImageUnavailable("MiniMax image generation is temporarily unavailable") from exc
        urls = (body.get("data") or {}).get("image_urls", []) if isinstance(body, dict) else []
        safe_urls = [url for url in urls if isinstance(url, str) and url.startswith("https://")]
        if not safe_urls:
            raise ResourceImageUnavailable("MiniMax returned no image")
        return GeneratedResourceImage(model=self._settings.minimax_image_model, prompt=prompt, image_urls=safe_urls)
