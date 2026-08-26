"""TutorPromptBuilder —— 小涟 Prompt 集中设计（Phase 3-0）。

职责：将 `TutorContext`（结构化学习上下文）转换为 LLM prompt。
- 所有 Prompt 字符串集中在本模块，禁止散落在 Service / Route。
- Prompt 只消费 `TutorContext` 快照，不直接读库。
- 渲染确定性：相同上下文 → 相同文本。

结构：
    System  → 角色与原则（集中常量 `SYSTEM_PROMPT`）
    User    → 「学生上下文」块 + 「学生的问题」
"""

from __future__ import annotations

from typing import Any

from app.domain.tutor import TutorContext
from app.knowledge import RetrievedKnowledge
from app.llm.provider import LLMMessage

# 集中 System Prompt（角色 + 回答原则）。原则与 README / .project.md 保持一致。
SYSTEM_PROMPT = """你是忆涟千言—教的昔涟教官，一名负责讲解、训练、考核与复盘的 AI 教官。

回答原则：
1. 基于学生真实学习数据回答，不编造不存在的学习记录。
2. 上下文里没有的数据，不要假装知道；可以说“我还没有你的相关学习记录”。
3. 优先帮助学生理解问题本身，再结合数据给出针对性解释。
4. 每次回答末尾给出下一步学习建议。
5. 课程事实只能依据 COURSE KNOWLEDGE；材料未提供时明确说明，不得编造。
6. Diagnosis 与 Plan 只依据 LEARNER CONTEXT，不得用课程材料改变诊断或任务排序。
7. 使用简体中文，语气亲切、专业、简洁，但必须保持教官的目标感与行动指导。
8. 教学回答优先按“本次目标 → 核心讲解 → 检查理解 → 下一步行动”组织；信息不足时可以缩短，但不得编造。
9. 不用默认课程进度替代学生的真实学习证据；没有计划时先让学生选择目标或完成诊断。"""

# User 消息引导语：明确这是「请求级」上下文，不是长期记忆。
CONTEXT_INTRO = "以下是你掌握的学生学习上下文（仅用于本次回答，非持久记忆）："


class TutorPromptBuilder:
    """将 TutorContext 渲染为 LLM messages。"""

    def build_messages(
        self,
        context: TutorContext,
        user_message: str,
        knowledge: list[RetrievedKnowledge] | None = None,
        assessment: dict[str, Any] | None = None,
    ) -> list[LLMMessage]:
        """Build grounded messages from learner, course, evidence, and question blocks."""
        blocks = [
            f"LEARNER CONTEXT\n{CONTEXT_INTRO}\n{self.render_context(context)}",
            f"COURSE KNOWLEDGE\n{self.render_knowledge(knowledge or [])}",
        ]
        if assessment is not None:
            blocks.append(f"ASSESSMENT EVIDENCE\n{self.render_assessment(assessment)}")
        blocks.append(f"USER QUESTION\n{user_message}")
        return [
            LLMMessage(role="system", content=SYSTEM_PROMPT),
            LLMMessage(role="user", content="\n\n".join(blocks)),
        ]

    @staticmethod
    def render_knowledge(knowledge: list[RetrievedKnowledge]) -> str:
        if not knowledge:
            return "（本次未检索到可用课程材料）"
        return "\n\n".join(
            f"[{index}] {item.title} · {item.section}\n{item.content}"
            for index, item in enumerate(knowledge, start=1)
        )

    @staticmethod
    def render_assessment(assessment: dict[str, Any]) -> str:
        fields = (
            ("knowledge_point_id", "知识点"),
            ("is_correct", "是否答对"),
            ("score", "得分"),
            ("difficulty", "难度"),
            ("mastery_before", "练习前掌握度"),
            ("mastery_after", "练习后掌握度"),
            ("confidence", "置信度"),
            ("evidence_count", "评价证据数"),
        )
        lines = [
            f"- {label}: {assessment.get(key)}"
            for key, label in fields
            if assessment.get(key) is not None
        ]
        return "\n".join(lines) if lines else "（没有可解释的练习证据）"

    # -- 上下文渲染（确定性） ----------------------------------------------------

    @staticmethod
    def render_context(context: TutorContext) -> str:
        """渲染学生学习上下文为人类可读文本块（无数据时诚实说明）。"""
        sections: list[str] = []

        if context.profile is not None:
            sections.append(TutorPromptBuilder._render_profile(context.profile))
        if context.diagnosis is not None:
            sections.append(TutorPromptBuilder._render_diagnosis(context.diagnosis))
        if context.plan is not None and context.plan.has_plan:
            sections.append(TutorPromptBuilder._render_plan(context.plan))
        if context.recent_evidence:
            sections.append(TutorPromptBuilder._render_evidence(context.recent_evidence))

        return "\n\n".join(sections) if sections else "（该学生暂无学习上下文）"

    @staticmethod
    def _render_profile(profile) -> str:
        lines = ["学生画像："]
        if profile.overall_mastery is not None:
            lines.append(
                f"- 整体掌握度 {round(profile.overall_mastery * 100)}% | "
                f"整体置信 {round(profile.overall_confidence * 100) if profile.overall_confidence is not None else '—'}% | "
                f"覆盖率 {round(profile.coverage * 100)}%（已评估 {profile.assessed_count}/{profile.total_knowledge_points}）"
            )
        else:
            lines.append("- 暂无足够数据（overall_mastery 不可计算）")
        if profile.points:
            summary = "；".join(
                f"{p.knowledge_point_name}（{p.status}，{round(p.mastery_score * 100)}%）"
                for p in profile.points
            )
            lines.append(f"- 知识点：{summary}")
        return "\n".join(lines)

    @staticmethod
    def _render_diagnosis(diagnosis) -> str:
        lines = ["诊断（最近）："]
        if diagnosis.primary_focus is not None:
            pf = diagnosis.primary_focus
            lines.append(
                f"- 主要问题：{pf.knowledge_point_name}（掌握度 {round(pf.mastery_score * 100)}%，{pf.status}）"
            )
        if diagnosis.weak_points:
            lines.append(
                "- 薄弱点：" + "；".join(f"{p.knowledge_point_name}（{round(p.mastery_score * 100)}%）" for p in diagnosis.weak_points)
            )
        if diagnosis.developing_points:
            lines.append(
                "- 发展中：" + "；".join(f"{p.knowledge_point_name}（{round(p.mastery_score * 100)}%）" for p in diagnosis.developing_points)
            )
        if diagnosis.strengths:
            lines.append(
                "- 掌握良好：" + "；".join(f"{p.knowledge_point_name}（{round(p.mastery_score * 100)}%）" for p in diagnosis.strengths)
            )
        if diagnosis.unassessed_points:
            lines.append(
                "- 尚未评估：" + "；".join(p.knowledge_point_name for p in diagnosis.unassessed_points)
            )
        if not diagnosis.weak_points and not diagnosis.primary_focus:
            lines.append("- 当前无明确的重点补强项")
        return "\n".join(lines)

    @staticmethod
    def _render_plan(plan) -> str:
        label = {
            "assess": "评估",
            "remediate": "补弱",
            "strengthen": "巩固",
            "review": "复习",
        }
        lines = [f"当前学习计划（生成于 {plan.generated_at.strftime('%Y-%m-%d %H:%M')}）："]
        if plan.tasks:
            for task in plan.tasks:
                lines.append(
                    f"- {task.order}. {task.knowledge_point_name} · {label.get(task.action_type, task.action_type)}，约 {task.estimated_minutes} 分钟"
                )
        else:
            lines.append("- 空计划（暂无需要立即干预的任务）")
        return "\n".join(lines)

    @staticmethod
    def _render_evidence(evidence_list) -> str:
        lines = ["最近学习记录："]
        for item in evidence_list:
            kind = "评价" if item.is_assessment else "行为"
            kp = item.knowledge_point_id or "—"
            lines.append(
                f"- [{kind}] {item.evidence_type}（{kp}，{item.occurred_at.strftime('%m-%d %H:%M')}）"
            )
        return "\n".join(lines)
