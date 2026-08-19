"""MockTutorProvider —— 演示用确定性 LLM Provider（实现真实抽象接口）。

背景：
- 比赛演示当前没有真实 LLM API Key，但 **接口必须真实**：本 Provider
  实现 `BaseLLMProvider.chat`，接入方式与未来真实 Provider 完全一致
  （由 `TutorService` 统一调用，**不在页面 / 路由层 mock**）。
- 回答是**确定性**的（相同上下文 + 相同问题 → 相同回答），并基于
  `TutorContext`（随 `chat(messages, context=...)` 传入）引用真实学习数据：
  不编造不存在的学习记录。
- 未来接入真实模型（OpenAI-compatible / DeepSeek / Qwen）时，只需
  替换 `get_llm_provider()` 返回的 Provider，无需改动 TutorService。

设计：
- `chat(messages, **kwargs)`：`kwargs["context"]` 携带 TutorContext 快照。
- 依据学生问题关键词 + 上下文选择回答模板（死锁 / 今天学什么 / PV / 通用）。
- 若没有上下文或上下文为空，给出诚实引导（不假装有数据）。
"""

from __future__ import annotations

from datetime import datetime

from app.llm.provider import BaseLLMProvider, LLMMessage, LLMResult


def _pct(value: float | None) -> str:
    """0.46 -> "46%"。"""
    return f"{round(value * 100)}%" if value is not None else "暂无"


_STATUS_LABEL = {
    "unassessed": "未评估",
    "insufficient_evidence": "证据不足",
    "weak": "薄弱",
    "developing": "发展中",
    "proficient": "较熟练",
    "mastered": "已掌握",
}


def _status(status: str) -> str:
    return _STATUS_LABEL.get(status, status)


def _fmt_time(value: datetime | None) -> str:
    return value.strftime("%m-%d %H:%M") if value else "—"


class MockTutorProvider(BaseLLMProvider):
    """确定性 Mock Tutor Provider（演示默认；无真实 API Key 时使用）。"""

    name = "mock"

    async def chat(self, messages: list[LLMMessage], **kwargs) -> LLMResult:
        context = kwargs.get("context")
        user_message = next(
            (m.content for m in messages if m.role == "user"), ""
        )
        # 只提取「学生的问题」部分做关键词路由，
        # 避免把上下文块里的知识点名称（如“死锁”）误判为提问主题。
        question = user_message.split("学生的问题：", 1)[-1].strip()
        return LLMResult(
            content=self._compose(question, context),
            usage={"provider": self.name, "mock": True},
        )

    # -- 确定性回答模板（全部数据来自 TutorContext，不编造） -------------------

    @staticmethod
    def _compose(user_message: str, context) -> str:
        diagnosis = getattr(context, "diagnosis", None)
        plan = getattr(context, "plan", None)
        profile = getattr(context, "profile", None)

        # 死锁问题 → 引用 Diagnosis
        if "死锁" in user_message and diagnosis is not None:
            return _answer_deadlock(diagnosis, plan)

        # 「今天学什么 / 计划」→ 引用 StudyPlan
        if any(k in user_message for k in ("今天", "学什么", "计划", "任务")) and plan is not None:
            if plan.has_plan and plan.tasks:
                return _answer_plan(plan)
            return "你当前还没有生成学习计划。建议先在「学习诊断」页生成一份诊断驱动计划，我就能告诉你今天优先学什么。"

        # 「PV / 信号量」→ 引用 LearnerProfile
        if any(k in user_message for k in ("PV", "pv", "信号量")) and profile is not None:
            pv = next(
                (p for p in profile.points if "PV" in p.knowledge_point_name),
                None,
            )
            return _answer_pv(profile, pv)

        # 通用 → 引用整体画像 + 主要问题
        return _answer_general(context)

    @staticmethod
    def _no_context_message() -> str:
        return (
            "我查看了你的学习上下文，目前还没有关于你的学习记录。"
            "建议先完成一次练习评估（学习空间）或生成学习计划，我就能结合真实数据为你分析。"
        )


def _answer_deadlock(diagnosis, plan) -> str:
    focus = diagnosis.primary_focus
    weak = next(
        (p for p in diagnosis.weak_points if "死锁" in p.knowledge_point_name),
        None,
    )
    point = focus or weak
    if point is None:
        return (
            "关于死锁，我目前没有足够的学习记录支撑分析。"
            "建议先在「学习空间」完成死锁相关练习，我就能根据你的掌握情况给出针对性解释。"
        )
    lines = [
        f"我查看了你的学习记录：死锁目前掌握度为 {_pct(point.mastery_score)}，"
        f"处于「{_status(point.status)}」状态，是当前诊断中需要重点关注的问题。",
        "学不会死锁，常见原因是前置基础（进程同步、PV 操作）还不够稳：这两个知识点目前分别约 60% 与 58%，建议先回到「进程同步 · PV 操作」把信号量语义理清。",
        "理解死锁建议抓住四条必要条件（互斥、持有并等待、不可剥夺、循环等待），再通过银行家算法例题验证是否真正掌握。",
    ]
    if plan is not None and plan.has_plan and plan.tasks:
        first = plan.tasks[0]
        lines.append(
            f"下一步：先完成「{first.knowledge_point_name} · 补弱」约 {first.estimated_minutes} 分钟的强化任务，完成后再做一次练习，我会跟进你的掌握度变化。"
        )
    return "\n".join(lines)


def _answer_plan(plan) -> str:
    lines = [
        f"根据你当前的学习计划（生成于 {_fmt_time(plan.generated_at)}），今天建议按顺序完成："
    ]
    for task in plan.tasks[:3]:
        label = {
            "assess": "评估",
            "remediate": "补弱",
            "strengthen": "巩固",
            "review": "复习",
        }.get(task.action_type, task.action_type)
        lines.append(f"{task.order}. {task.knowledge_point_name} · {label}，约 {task.estimated_minutes} 分钟")
    lines.append("先从最优先的任务开始，完成后做一次练习评价，我会据此更新你的学习画像。")
    return "\n".join(lines)


def _answer_pv(profile, pv) -> str:
    if pv is None:
        return (
            f"我查看了你的学习画像（整体掌握度 {_pct(profile.overall_mastery)}），"
            "但暂时没有 PV 操作的掌握记录。建议先完成一道 PV 操作练习，我就能告诉你是否掌握。"
        )
    return (
        f"我查了你的学习画像：PV 操作目前掌握度 {_pct(pv.mastery_score)}，"
        f"置信度 {_pct(profile.overall_confidence)}，属于「{_status(pv.status)}」状态——"
        "你有一定基础，但掌握证据还不够多、状态还不够稳定。\n"
        "建议先完成一道 PV 操作练习（生产者-消费者 / 信号量应用），重点把 signal / wait 原语的语义与使用场景理清。"
    )


def _answer_general(context) -> str:
    profile = getattr(context, "profile", None)
    diagnosis = getattr(context, "diagnosis", None)
    plan = getattr(context, "plan", None)

    if profile is None and diagnosis is None:
        return (
            "我查看了你的学习上下文，目前还没有关于你的学习记录。"
            "建议先完成一次练习评估（学习空间）或生成学习计划，我就能结合真实数据为你分析。"
        )

    parts = []
    if profile is not None:
        parts.append(
            f"我结合你的学习画像为你分析：整体掌握度 {_pct(profile.overall_mastery)}，"
            f"整体置信 {_pct(profile.overall_confidence)}，覆盖率 {_pct(profile.coverage)}。"
        )
    if diagnosis is not None and diagnosis.primary_focus is not None:
        focus = diagnosis.primary_focus
        parts.append(
            f"当前最需要优先处理的是「{focus.knowledge_point_name}」（掌握度 {_pct(focus.mastery_score)}，{_status(focus.status)}）。"
        )
    elif profile is not None:
        parts.append("当前暂无明确的重点补强项，继续保持稳定学习即可。")
    if plan is not None and plan.has_plan and plan.tasks:
        first = plan.tasks[0]
        label = {
            "assess": "评估",
            "remediate": "补弱",
            "strengthen": "巩固",
            "review": "复习",
        }.get(first.action_type, first.action_type)
        parts.append(
            f"建议按计划先完成「{first.knowledge_point_name} · {label}」约 {first.estimated_minutes} 分钟的任务。"
        )
    else:
        parts.append("建议先完成一次练习评估，补充学习证据，让后续建议更精准。")
    return "\n".join(parts)
