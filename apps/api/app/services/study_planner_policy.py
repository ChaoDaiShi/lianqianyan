"""StudyPlannerPolicy —— Study Planner 策略（确定性、集中管理）。

职责（KnowledgePointDiagnosis → PlannerActionType → Action Tier → Planner Reason → Duration）：
1. `action_for(status)`：DiagnosisStatus → PlannerActionType。
2. `tier_for(action)`：Action Tier（分层排序依据）。
3. `reason_codes_for(status, is_primary_focus)`：机器可读 Planner Reason。
4. `minutes_for(action)`：estimated_minutes（集中 Duration Policy）。

核心规则（继承 Phase 2C）：
- UNASSESSED ≠ WEAK：没有证据的知识点先评估（ASSESS），绝不补弱（REMEDIATE）。
- MASTERED 默认不进入短期补强计划（并非永远不学，只是不排在薄弱内容前面；
  间隔复习调度是后续步骤，本轮不实现）。

Action Tier（第一版确定性分层，数值越小越优先）：
- Tier 1：WEAK → REMEDIATE（已确认薄弱，最高优先补弱）
- Tier 2：UNASSESSED / INSUFFICIENT_EVIDENCE → ASSESS（信息缺口本身是有效动作，
  先获取学习证据；这正是「未知 ≠ 薄弱」在 Planner 层的体现）
- Tier 3：DEVELOPING → STRENGTHEN（已有基础，继续巩固）
- Tier 4：PROFICIENT → REVIEW（已较熟练，轻量复习）
- MASTERED：不安排

理由：Tier 2（ASSESS）高于 Tier 3（STRENGTHEN）——
「不了解学生状态」比「巩固已有基础」更紧迫：没有证据时，任何后续学习动作都缺乏依据；
先完成一次快速诊断（15 min），再决定是否补弱/巩固，避免把未评估误当薄弱去花 35 分钟补习。
（若未来业务语义认为 DEVELOPING 应优先于 UNASSESSED，只需修改本文件集中定义。）

不依赖 FastAPI，可供 HTTP Route / MCP Tool / Agent Runtime 复用。
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.domain import (
    DiagnosisStatus,
    PlannerActionType,
    PlannerReasonCode,
)


@dataclass(frozen=True)
class PlannerConfig:
    """Planner 集中配置（MAX_TASKS + Duration Policy）。

    禁止在 Service 中散落 Magic Number（如 `[:3]` / 35 / 25）。
    """

    MAX_TASKS: int = 3
    ASSESS_MINUTES: int = 15
    REMEDIATE_MINUTES: int = 35
    STRENGTHEN_MINUTES: int = 25
    REVIEW_MINUTES: int = 15


class StudyPlannerPolicy:
    """Diagnosis 状态 → Planner 动作 / 分层 / 原因 / 时长的集中映射。"""

    def __init__(self, config: PlannerConfig | None = None) -> None:
        self._cfg = config or PlannerConfig()

    @property
    def config(self) -> PlannerConfig:
        return self._cfg

    # -- DiagnosisStatus → PlannerActionType ---------------------------------

    def action_for(self, status: DiagnosisStatus) -> PlannerActionType | None:
        """状态 → 学习动作；MASTERED → None（默认不进入短期补强计划）。"""
        mapping = {
            DiagnosisStatus.UNASSESSED: PlannerActionType.ASSESS,
            DiagnosisStatus.INSUFFICIENT_EVIDENCE: PlannerActionType.ASSESS,
            DiagnosisStatus.WEAK: PlannerActionType.REMEDIATE,
            DiagnosisStatus.DEVELOPING: PlannerActionType.STRENGTHEN,
            DiagnosisStatus.PROFICIENT: PlannerActionType.REVIEW,
        }
        return mapping.get(status)

    def is_planning_eligible(self, status: DiagnosisStatus) -> bool:
        """状态是否会产生规划任务（MASTERED 除外）。"""
        return self.action_for(status) is not None

    # -- Action Tier ----------------------------------------------------------

    def tier_for(self, action: PlannerActionType) -> int:
        """动作分层（数值越小越优先）：REMEDIATE=1 < ASSESS=2 < STRENGTHEN=3 < REVIEW=4。"""
        tiers = {
            PlannerActionType.REMEDIATE: 1,
            PlannerActionType.ASSESS: 2,
            PlannerActionType.STRENGTHEN: 3,
            PlannerActionType.REVIEW: 4,
        }
        return tiers[action]

    # -- Planner Reason -------------------------------------------------------

    def reason_codes_for(
        self, status: DiagnosisStatus, is_primary_focus: bool = False
    ) -> list[PlannerReasonCode]:
        """状态 → 机器可读 Planner Reason。

        `is_primary_focus` 为 True 时前置追加 PRIMARY_FOCUS
        （primary_focus 必须成为最高合法补强任务的依据）。
        """
        base = {
            DiagnosisStatus.WEAK: [PlannerReasonCode.CONFIRMED_WEAKNESS],
            DiagnosisStatus.UNASSESSED: [PlannerReasonCode.NEEDS_ASSESSMENT],
            DiagnosisStatus.INSUFFICIENT_EVIDENCE: [PlannerReasonCode.NEEDS_MORE_EVIDENCE],
            DiagnosisStatus.DEVELOPING: [PlannerReasonCode.NEEDS_STRENGTHENING],
            DiagnosisStatus.PROFICIENT: [PlannerReasonCode.MAINTENANCE_REVIEW],
        }
        codes: list[PlannerReasonCode] = []
        if is_primary_focus:
            codes.append(PlannerReasonCode.PRIMARY_FOCUS)
        codes.extend(base.get(status, []))
        return codes

    # -- Duration --------------------------------------------------------------

    def minutes_for(self, action: PlannerActionType) -> int:
        """动作 → estimated_minutes（确定性，不使用 AI）。"""
        durations = {
            PlannerActionType.ASSESS: self._cfg.ASSESS_MINUTES,
            PlannerActionType.REMEDIATE: self._cfg.REMEDIATE_MINUTES,
            PlannerActionType.STRENGTHEN: self._cfg.STRENGTHEN_MINUTES,
            PlannerActionType.REVIEW: self._cfg.REVIEW_MINUTES,
        }
        return durations[action]
