"""StudyPlannerService —— 学习规划服务（确定性、可解释、可测试）。

职责（输入必须是 DiagnosisResult）：
    DiagnosisResultOut
        → StudyPlannerPolicy（状态 → 动作 / 分层 / 原因 / 时长）
        → 候选任务
        → 稳定排序（Action Tier → primary_focus → priority_score → 稳定序）
        → 限制 MAX_TASKS
        → StudyPlanDraft（Value Object，不持久化）

边界（严格遵守 Phase 2D-0）：
- 绝不自行查询 MasteryRecord 再重新诊断 —— 必须相信 DiagnosisResult。
- 不复制 mastery threshold / confidence threshold / priority formula（属于 Phase 2C）。
- 不负责：数据库 commit、HTTP、React、LLM。
- 确定性：相同输入必须产生相同 Draft（禁止随机排序）。

排序规则（第一版确定性分层）：
1. Action Tier（REMEDIATE < ASSESS < STRENGTHEN < REVIEW）。
2. primary_focus：同一 Tier 内优先（primary_focus 必须是最高合法补强任务）。
3. 同 Tier 内按 priority_score 降序（两个 WEAK：高 priority 在前）。
4. 仍相同（如 UNASSESSED 的 priority_score 均为 0）→ 使用 Diagnosis 中稳定顺序
   （即知识点课程顺序），保证相同输入 → 相同 Plan。

候选集来源：DiagnosisResult 的四类列表（weak_points / developing_points /
strengths / unassessed_points）互斥且完整覆盖全部知识点，按固定顺序拼接后去重。
不依赖 FastAPI；可供 HTTP Route / MCP Tool / Agent Runtime 复用。
"""

from __future__ import annotations

from app.core.time import utc_now
from app.domain import (
    DiagnosisResultOut,
    PlannerReasonCode,
    PlanStrategy,
    StudyPlanDraft,
    StudyTaskDraft,
)
from app.domain.models import KnowledgePointDiagnosis
from app.services.study_planner_policy import StudyPlannerPolicy


class StudyPlannerService:
    """基于结构化 Diagnosis 生成 StudyPlanDraft。"""

    def __init__(self, policy: StudyPlannerPolicy | None = None) -> None:
        self._policy = policy or StudyPlannerPolicy()

    @property
    def policy(self) -> StudyPlannerPolicy:
        return self._policy

    def generate_from_diagnosis(
        self,
        learner_id: str,
        course_id: str,
        diagnosis_result: DiagnosisResultOut,
    ) -> StudyPlanDraft:
        """根据 DiagnosisResult 生成确定性计划草稿。"""
        candidates = self._build_candidates(diagnosis_result)
        candidates.sort(key=self._sort_key)
        candidates = candidates[: self._policy.config.MAX_TASKS]

        tasks = [
            self._to_task(candidate, order=index + 1, total=len(candidates))
            for index, candidate in enumerate(candidates)
        ]

        plan_reason_codes: list[PlannerReasonCode]
        if tasks:
            # 非空计划：reason_codes 为各任务原因的去重汇总（保持首次出现顺序）
            plan_reason_codes = list(
                dict.fromkeys(code for task in tasks for code in task.reason_codes)
            )
        else:
            # 空计划：当前没有需要立即补强的知识点，不强行选一个 MASTERED
            plan_reason_codes = [PlannerReasonCode.NO_IMMEDIATE_INTERVENTION]

        return StudyPlanDraft(
            learner_id=learner_id,
            course_id=course_id,
            generated_at=utc_now(),
            strategy=PlanStrategy.DIAGNOSIS_DRIVEN,
            tasks=tasks,
            reason_codes=plan_reason_codes,
            source_diagnosis_generated_at=diagnosis_result.diagnosis_generated_at,
        )

    # -- 候选收集 ---------------------------------------------------------------

    def _build_candidates(self, diagnosis_result: DiagnosisResultOut) -> list[tuple]:
        """从 DiagnosisResult 收集候选任务。

        四类列表互斥且完整覆盖全部知识点；拼接顺序固定（weak → developing →
        strengths → unassessed），保证相同输入得到相同的稳定序。
        """
        points: list[KnowledgePointDiagnosis] = []
        points.extend(diagnosis_result.weak_points)
        points.extend(diagnosis_result.developing_points)
        points.extend(diagnosis_result.strengths)
        points.extend(diagnosis_result.unassessed_points)

        primary_focus_id = (
            diagnosis_result.primary_focus.knowledge_point_id
            if diagnosis_result.primary_focus is not None
            else None
        )

        candidates: list[tuple] = []
        seen: set[str] = set()
        for index, point in enumerate(points):
            if point.knowledge_point_id in seen:
                continue
            seen.add(point.knowledge_point_id)
            action = self._policy.action_for(point.status)
            if action is None:
                # MASTERED → 默认不进入短期补强计划
                continue
            is_primary = point.knowledge_point_id == primary_focus_id
            candidates.append((point, action, is_primary, index))
        return candidates

    # -- 稳定排序 ---------------------------------------------------------------

    def _sort_key(self, candidate: tuple) -> tuple:
        """排序键：(Action Tier, primary_focus 优先, priority_score 降序, 稳定序)。"""
        point, action, is_primary, index = candidate
        return (
            self._policy.tier_for(action),
            0 if is_primary else 1,
            -point.priority_score,
            index,
        )

    # -- 任务构建 ---------------------------------------------------------------

    def _to_task(self, candidate: tuple, *, order: int, total: int) -> StudyTaskDraft:
        point, action, is_primary, _index = candidate
        return StudyTaskDraft(
            draft_key=f"{point.knowledge_point_id}:{action.value}",
            knowledge_point_id=point.knowledge_point_id,
            knowledge_point_name=point.knowledge_point_name,
            action_type=action,
            priority=(total - order + 1) / total,  # 首个任务 = 1.0，依次递减
            estimated_minutes=self._policy.minutes_for(action),
            reason_codes=self._policy.reason_codes_for(point.status, is_primary),
            source_status=point.status,
            source_priority_score=point.priority_score,
            order=order,
        )
