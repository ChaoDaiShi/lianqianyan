from __future__ import annotations

import re

from app.knowledge import KnowledgePointContent, KnowledgeRepository
from app.resources.models import (
    GeneratedResource,
    PresentationSlide,
    ResourceGenerationRequest,
    ResourceType,
)

_TYPE_LABELS: dict[ResourceType, str] = {
    ResourceType.STUDY_SHEET: "学习单",
    ResourceType.FLASHCARDS: "复习闪卡",
    ResourceType.QUIZ: "章节自测",
    ResourceType.MIND_MAP: "思维导图",
    ResourceType.STUDY_PLAN: "章节学习计划",
    ResourceType.PRESENTATION: "课堂演示文稿",
}
_SOURCE_NOTICE = (
    "> 生成说明：本资源基于课程材料模板生成，只整理下列来源章节，不补充外部事实。"
)
_SAFE_FILENAME = re.compile(r"[^A-Za-z0-9_-]+")
_SENTENCE_BOUNDARY = re.compile(r"[。！？!?；;]+")
_WHITESPACE = re.compile(r"\s+")


class KnowledgeResourceNotFound(LookupError):
    pass


def _normalize(text: str) -> str:
    return _WHITESPACE.sub(" ", text).strip()


def _excerpt(text: str, limit: int = 240) -> str:
    normalized = _normalize(text)
    if len(normalized) <= limit:
        return normalized
    return normalized[:limit].rstrip() + "…"


def _filename(knowledge_point_id: str, resource_type: ResourceType) -> str:
    safe_id = _SAFE_FILENAME.sub("-", knowledge_point_id).strip("-") or "resource"
    extension = "pptx" if resource_type is ResourceType.PRESENTATION else "md"
    return f"{safe_id}-{resource_type.value}.{extension}"


class ResourceGenerationService:
    def __init__(self, repository: KnowledgeRepository | None = None) -> None:
        self._repository = repository or KnowledgeRepository()

    def generate(self, request: ResourceGenerationRequest) -> GeneratedResource:
        point = self._repository.get_point_content(
            request.course_id,
            request.knowledge_point_id,
        )
        if point is None or not point.sections:
            raise KnowledgeResourceNotFound("course knowledge point not found")

        renderers = {
            ResourceType.STUDY_SHEET: self._study_sheet,
            ResourceType.FLASHCARDS: self._flashcards,
            ResourceType.QUIZ: self._quiz,
            ResourceType.MIND_MAP: self._mind_map,
            ResourceType.STUDY_PLAN: self._study_plan,
            ResourceType.PRESENTATION: self._presentation_preview,
        }
        label = _TYPE_LABELS[request.resource_type]
        slides = (
            self._presentation_slides(point)
            if request.resource_type is ResourceType.PRESENTATION
            else []
        )
        return GeneratedResource(
            title=f"{point.title} · {label}",
            resource_type=request.resource_type,
            content=renderers[request.resource_type](point, label),
            format=(
                "presentation"
                if request.resource_type is ResourceType.PRESENTATION
                else "markdown"
            ),
            source_sections=[section.title for section in point.sections],
            filename=_filename(request.knowledge_point_id, request.resource_type),
            slides=slides,
        )

    @staticmethod
    def _header(point: KnowledgePointContent, label: str) -> list[str]:
        return [f"# {point.title} · {label}", "", _SOURCE_NOTICE, ""]

    def _study_sheet(self, point: KnowledgePointContent, label: str) -> str:
        lines = self._header(point, label)
        for section in point.sections:
            lines.extend([f"## {section.title}", "", _normalize(section.content), ""])
        lines.extend(["## 自检清单", ""])
        lines.extend(
            f"- [ ] 我能解释「{section.title}」" for section in point.sections
        )
        return "\n".join(lines).rstrip() + "\n"

    def _flashcards(self, point: KnowledgePointContent, label: str) -> str:
        lines = self._header(point, label)
        for index, section in enumerate(point.sections, start=1):
            lines.extend(
                [
                    f"## 卡片 {index}",
                    "",
                    f"**正面：** {section.title}",
                    "",
                    f"**背面：** {_excerpt(section.content)}",
                    "",
                ]
            )
        return "\n".join(lines).rstrip() + "\n"

    def _quiz(self, point: KnowledgePointContent, label: str) -> str:
        lines = self._header(point, label)
        for index, section in enumerate(point.sections, start=1):
            lines.extend(
                [
                    f"## 第 {index} 题",
                    "",
                    f"请用自己的话解释「{section.title}」，并写出一个判断要点。",
                    "",
                    f"> 参考要点：{_excerpt(section.content)}",
                    "",
                ]
            )
        return "\n".join(lines).rstrip() + "\n"

    def _mind_map(self, point: KnowledgePointContent, label: str) -> str:
        lines = self._header(point, label)
        lines.append(f"- {point.title}")
        for section in point.sections:
            lines.append(f"  - {section.title}")
            sentences = [
                _normalize(sentence)
                for sentence in _SENTENCE_BOUNDARY.split(section.content)
                if _normalize(sentence)
            ][:3]
            lines.extend(f"    - {sentence}" for sentence in sentences)
        return "\n".join(lines).rstrip() + "\n"

    def _study_plan(self, point: KnowledgePointContent, label: str) -> str:
        lines = self._header(point, label)
        lines.extend(["## 建议顺序", ""])
        for index, section in enumerate(point.sections, start=1):
            lines.extend(
                [
                    f"{index}. [ ] {section.title}（约 10 分钟）",
                    f"   - 阅读目标：能复述「{section.title}」的主要内容。",
                    f"   - 完成标准：根据课程材料写出一句总结：{_excerpt(section.content, 120)}",
                ]
            )
        return "\n".join(lines).rstrip() + "\n"

    def _presentation_preview(self, point: KnowledgePointContent, label: str) -> str:
        lines = self._header(point, label)
        for index, slide in enumerate(self._presentation_slides(point), start=1):
            lines.extend([f"## 幻灯片 {index} · {slide.title}", ""])
            if slide.subtitle:
                lines.extend([slide.subtitle, ""])
            lines.extend(f"- {bullet}" for bullet in slide.bullets)
            lines.append("")
        return "\n".join(lines).rstrip() + "\n"

    def _presentation_slides(self, point: KnowledgePointContent) -> list[PresentationSlide]:
        slides = [
            PresentationSlide(
                layout="title",
                title=point.title,
                subtitle="昔涟教官 · 课程材料驱动课堂演示",
                speaker_notes="本演示仅重组已加载的课程材料。",
            ),
            PresentationSlide(
                layout="content",
                title="学习目标",
                bullets=[f"理解「{section.title}」" for section in point.sections],
                speaker_notes="先说明本节课完成标准。",
            ),
        ]
        for section in point.sections:
            sentences = [
                _normalize(sentence)
                for sentence in _SENTENCE_BOUNDARY.split(section.content)
                if _normalize(sentence)
            ][:5]
            slides.append(
                PresentationSlide(
                    layout="content",
                    title=section.title,
                    bullets=sentences or [_excerpt(section.content)],
                    speaker_notes=f"来源章节：{section.title}",
                )
            )
        slides.extend(
            [
                PresentationSlide(
                    layout="question",
                    title="课堂检查",
                    bullets=[f"请用自己的话解释「{section.title}」。" for section in point.sections[:3]],
                    speaker_notes="让学生先回答，再展示课程材料要点。",
                ),
                PresentationSlide(
                    layout="summary",
                    title="总结与下一步",
                    bullets=[f"复述：{section.title}" for section in point.sections],
                    speaker_notes="根据回答结果安排练习或考试。",
                ),
                PresentationSlide(
                    layout="sources",
                    title="课程来源",
                    bullets=[section.title for section in point.sections],
                    speaker_notes="所有内容均来自这些课程章节。",
                ),
            ]
        )
        return slides
