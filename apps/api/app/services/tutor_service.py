"""TutorService —— 小涟教育导师应用服务（Phase 3-0）。

职责：编排「用户提问 → 读取学生学习上下文 → 生成个性化教育回答」。

链路（保持 Application Layer，Route 不直接调 LLM）：
    TutorConversationRequest
        → TutorContextBuilder.build(learner_id, course_id)   # 真实学习上下文
        → TutorPromptBuilder.build_messages(context, message)  # 集中 Prompt
        → llm_provider.chat(messages, context=context)         # Provider 抽象
        → TutorResponse

约定：
- **Provider 抽象**：只依赖 `BaseLLMProvider`（app/llm），不绑定 OpenAI / 任何具体厂商；
  未配置外部模型时使用明确的 Unavailable Provider，不生成伪造模型回答。
- **Fallback**：未配置或调用失败时，根据真实课程材料与学习状态生成确定性基础辅导，
  且 `source="fallback"` 诚实标记，绝不伪装成 LLM 输出。
- **suggested_actions**：由 TutorContext 确定性生成（不是 LLM 自由发挥），
  保持结果可解释。
- **context_used**：来自 TutorContext（解释能力：本次用了哪些学习上下文）。
- 不保存聊天历史（请求级 Context）。
- 不依赖 FastAPI；可供 HTTP Route / 未来 MCP Tool / Agent Runtime 复用。
"""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.domain.tutor import (
    TutorContext,
    TutorConversationRequest,
    TutorResponse,
)
from app.llm import BaseLLMProvider, get_llm_provider, get_llm_status
from app.knowledge import KnowledgeContextBuilder, RetrievedKnowledge
from app.services.tutor_context_builder import TutorContextBuilder
from app.services.tutor_prompt import TutorPromptBuilder

logger = logging.getLogger(__name__)

# 动作类型 → 中文标签（suggested_actions / fallback 文案统一使用）
_ACTION_LABEL = {
    "assess": "评估",
    "remediate": "补弱",
    "strengthen": "巩固",
    "review": "复习",
}


def _pct(value: float | None) -> str:
    return f"{round(value * 100)}%" if value is not None else "暂无"


class TutorService:
    """小涟教育导师应用服务。"""

    def __init__(
        self,
        db: Session,
        llm_provider: BaseLLMProvider | None = None,
        context_builder: TutorContextBuilder | None = None,
        prompt_builder: TutorPromptBuilder | None = None,
    ) -> None:
        self._db = db
        self._llm = llm_provider or get_llm_provider()
        self._context_builder = context_builder or TutorContextBuilder(db)
        self._prompt_builder = prompt_builder or TutorPromptBuilder()

    async def chat(
        self,
        request: TutorConversationRequest,
        knowledge: list[RetrievedKnowledge] | None = None,
        assessment: dict[str, Any] | None = None,
    ) -> TutorResponse:
        """Build grounded context, call one provider, and preserve exact sources."""
        context = self._context_builder.build(request.learner_id, request.course_id)
        retrieved = knowledge or []
        sources = KnowledgeContextBuilder.sources(retrieved)
        messages = self._prompt_builder.build_messages(
            context,
            request.message,
            knowledge=retrieved,
            assessment=assessment,
        )
        suggested_actions = self._suggest_actions(context)
        context_used = list(context.context_used)
        if retrieved:
            context_used.append("course_knowledge")
        if assessment is not None:
            context_used.append("assessment_evidence")
        model = get_llm_status().model

        try:
            result = await self._llm.chat(
                messages,
                context=context,
                knowledge=retrieved,
                assessment=assessment,
            )
            return TutorResponse(
                answer=result.content,
                context_used=context_used,
                suggested_actions=suggested_actions,
                source="llm",
                provider=result.usage.get("provider", self._llm.name),
                model=model,
                response_mode="provider",
                sources=sources,
            )
        except Exception as exc:  # LLM 失败 → 确定性兜底（诚实标记，不伪装 LLM）
            logger.warning("tutor llm failed, using fallback: %s", exc)
            return TutorResponse(
                answer=self._fallback_answer(context, request.message, retrieved),
                context_used=context_used,
                suggested_actions=suggested_actions,
                source="fallback",
                provider=self._llm.name,
                model=model,
                response_mode="fallback",
                sources=sources,
            )

    # -- 确定性建议（非 LLM 自由发挥） -------------------------------------------

    def _suggest_actions(self, context: TutorContext) -> list[str]:
        actions: list[str] = []

        if context.diagnosis is not None and context.diagnosis.primary_focus is not None:
            focus = context.diagnosis.primary_focus
            actions.append(
                f"优先补强「{focus.knowledge_point_name}」（当前掌握度 {_pct(focus.mastery_score)}）"
            )

        if context.plan.has_plan and context.plan.tasks:
            first = context.plan.tasks[0]
            actions.append(
                f"完成「{first.knowledge_point_name} · {_ACTION_LABEL.get(first.action_type, first.action_type)}」约 {first.estimated_minutes} 分钟"
            )
            if len(context.plan.tasks) > 1:
                second = context.plan.tasks[1]
                actions.append(
                    f"按计划继续「{second.knowledge_point_name} · {_ACTION_LABEL.get(second.action_type, second.action_type)}」"
                )
        else:
            actions.append("先完成一次练习评估，补充你的学习证据")

        return actions[:3]

    # -- 确定性兜底回答（LLM 失败时使用，明确标记 fallback） ----------------------

    def _fallback_answer(
        self,
        context: TutorContext,
        message: str,
        knowledge: list[RetrievedKnowledge] | None = None,
    ) -> str:
        focus = context.diagnosis.primary_focus if context.diagnosis else None
        plan_tasks = context.plan.tasks if context.plan.has_plan else []

        if focus is not None:
            core = (
                f"根据你当前学习情况，你可以先完成「{focus.knowledge_point_name}」专项学习任务"
                f"（当前掌握度 {_pct(focus.mastery_score)}）。"
            )
        elif plan_tasks:
            first = plan_tasks[0]
            core = (
                f"根据你当前学习情况，你可以先完成「{first.knowledge_point_name}」"
                f"{_ACTION_LABEL.get(first.action_type, first.action_type)}学习任务"
                f"（约 {first.estimated_minutes} 分钟）。"
            )
        else:
            core = (
                "根据你当前学习情况，建议先从一次练习评估开始，补充你的学习证据，"
                "我再为你制定更有针对性的建议。"
            )

        knowledge_note = ""
        if knowledge:
            first = knowledge[0]
            excerpt = " ".join(first.content.split())[:220]
            knowledge_note = (
                f"\n课程知识提示（{first.title} · {first.section}）：{excerpt}"
            )
        return (
            "（基础辅导 · 外部模型未配置或暂时不可用，以下内容基于课程材料与真实学习记录生成）\n"
            + core
            + knowledge_note
        )
