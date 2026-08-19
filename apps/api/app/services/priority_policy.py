"""PriorityPolicy —— 干预优先级策略（确定性、集中管理）。

计算 principle：
    weakness = 1 - mastery_score（仅对「有足够证据」的知识点有意义）
    evidence_reliability = confidence
    priority_score = weakness × evidence_reliability

规则：
- UNASSESSED / INSUFFICIENT_EVIDENCE 不计入高优先级薄弱点：
  - 尚未评估 ≠ 薄弱；不得因 mastery=0 而获得高 priority。
- 真实低 mastery + 高 confidence → 更可信的高优先级。
- priority_score 限制在 [0.0, 1.0]。

不依赖 FastAPI，可供 HTTP Route / MCP Tool / Planner 复用。
"""

from __future__ import annotations

from app.domain import DiagnosisStatus


class PriorityPolicy:
    """知识点干预优先级计算。"""

    @staticmethod
    def compute(mastery_score: float, confidence: float) -> float:
        """给定掌握度与置信度返回优先级（0.0 ~ 1.0）。"""
        weakness = 1.0 - mastery_score
        priority = weakness * confidence
        return max(0.0, min(1.0, priority))

    @staticmethod
    def is_priority_eligible(status: DiagnosisStatus) -> bool:
        """仅「有足够证据」的知识点可成为高优先级干预对象。"""
        return status in {
            DiagnosisStatus.WEAK,
            DiagnosisStatus.DEVELOPING,
            DiagnosisStatus.PROFICIENT,
        }
