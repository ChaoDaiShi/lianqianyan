"""AI 配图规划与文字质量检查。

图片生成前先由账号 LLM 评判"是否值得配图、如何构图"；资源生成完成后由 LLM
做一次文字质量检查（乱码 / 截断 / 占位符 / 空章节）。LLM 不可用或输出无法
解析时诚实降级：配图方案回退到启发式默认，文字检查标记为不可用。
"""

from __future__ import annotations

import json
import re

from pydantic import BaseModel, Field, ValidationError

from app.llm import BaseLLMProvider, LLMMessage

_JSON_FENCE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)


class ImagePlan(BaseModel):
    """一次配图规划结果。"""

    should_generate: bool = True
    reason: str = ""
    central_metaphor: str = ""
    card_metaphors: list[str] = Field(default_factory=list, max_length=8)
    planned_by: str = "llm"


class TextCheck(BaseModel):
    """一次文字质量检查结果。"""

    passed: bool = True
    summary: str = ""
    issues: list[str] = Field(default_factory=list, max_length=10)


def _extract_json(text: str) -> dict | None:
    fenced = _JSON_FENCE.search(text)
    candidate = fenced.group(1) if fenced else text[text.find("{"): text.rfind("}") + 1]
    if not candidate:
        return None
    try:
        value = json.loads(candidate)
    except ValueError:
        return None
    return value if isinstance(value, dict) else None


async def plan_image(
    provider: BaseLLMProvider,
    point_title: str,
    section_titles: list[str],
) -> ImagePlan | None:
    """请 LLM 评判是否配图并给出图标隐喻方案；失败返回 None（调用方降级）。"""
    sections = "、".join(section_titles)
    system = (
        "你是课程配图编辑，为中学生学习资源决定是否配图以及如何构图。"
        "配图采用无文字图标隐喻插画：中心一个主题图标，周围环绕每章一个概念图标卡片，"
        "图中不渲染任何文字（图片模型渲染中文会乱码）。"
        "只输出一个 JSON 对象，不要输出其他内容："
        '{"should_generate": true/false, "reason": "一句话理由", '
        '"central_metaphor": "中心图标的视觉隐喻描述", '
        '"card_metaphors": ["每个章节的图标隐喻描述，与章节顺序一致"]}'
    )
    user = f"知识点：{point_title}\n章节：{sections}\n请评判并给出构图方案。"
    try:
        result = await provider.chat([
            LLMMessage(role="system", content=system),
            LLMMessage(role="user", content=user),
        ])
    except Exception:
        return None
    payload = _extract_json(result.content)
    if payload is None:
        return None
    try:
        plan = ImagePlan(
            should_generate=bool(payload.get("should_generate", True)),
            reason=str(payload.get("reason", ""))[:200],
            central_metaphor=str(payload.get("central_metaphor", ""))[:160],
            card_metaphors=[str(item)[:120] for item in (payload.get("card_metaphors") or [])][: len(section_titles) or 1],
        )
    except ValidationError:
        return None
    if not plan.should_generate and not plan.reason:
        plan.reason = "该知识点用文字排版表达更清晰"
    return plan


async def verify_text(provider: BaseLLMProvider, content: str) -> TextCheck | None:
    """请 LLM 检查资源正文质量；失败返回 None（调用方标记不可用）。"""
    system = (
        "你是中文文字质量校对。检查学习资源正文是否存在：乱码或伪字、句子截断、"
        "占位符（TODO/xxx/lorem/[insert）、空章节、明显重复。"
        "文字是最重要的资产，宁可严格。只输出一个 JSON 对象："
        '{"passed": true/false, "summary": "一句话结论", "issues": ["具体问题，最多5条"]}'
    )
    user = f"请检查以下正文：\n\n{content[:6000]}"
    try:
        result = await provider.chat([
            LLMMessage(role="system", content=system),
            LLMMessage(role="user", content=user),
        ])
    except Exception:
        return None
    payload = _extract_json(result.content)
    if payload is None:
        return None
    try:
        return TextCheck(
            passed=bool(payload.get("passed", False)),
            summary=str(payload.get("summary", ""))[:200],
            issues=[str(item)[:160] for item in (payload.get("issues") or [])][:5],
        )
    except ValidationError:
        return None
