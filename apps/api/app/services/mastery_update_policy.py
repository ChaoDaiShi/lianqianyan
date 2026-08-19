"""MasteryUpdatePolicy —— 掌握度更新策略（集中管理，确定性、可解释、可测试）。

规则：
- 正确答案 → 正向 delta；
- 错误答案 → 负向 delta；
- difficulty 影响幅度：难题答对正向信号稍强、简单题答错负向信号稍强；
- 最终结果 Clamp 到 [0.0, 1.0]（禁止越界）。
- confidence 采用基于 evidence_count 的简单饱和策略（不引入复杂统计模型）。

本策略不依赖 FastAPI，可供 HTTP Route / MCP Tool / Agent Runtime 复用。
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class MasteryProjection:
    """一次掌握度投影的结果。"""

    mastery_after: float
    # 参与本次投影后，该证据应被认可为一条评估证据（决定 evidence_count 是否 +1）
    counted_as_assessment: bool


class MasteryUpdatePolicy:
    """第一版确定性掌握度更新策略。"""

    # 基础步长（每次有效评估改变掌握度的基准幅度）
    STEP: float = 0.05

    @staticmethod
    def _clamp(value: float) -> float:
        return max(0.0, min(1.0, value))

    @staticmethod
    def confidence_for(evidence_count: int) -> float:
        """基于评估证据数量的简单置信策略（0.0 ~ 1.0）。

        count=1 → 0.25，随后随 count 增长而趋于 1（饱和、单调不减）。
        """
        if evidence_count <= 0:
            return 0.0
        return MasteryUpdatePolicy._clamp(0.25 * (evidence_count ** 0.5))

    def project(
        self,
        old_mastery: float,
        *,
        is_correct: bool,
        difficulty: float,
        score: float,
    ) -> MasteryProjection:
        """根据一次评价结果计算新的掌握度。

        difficulty / score 均要求 0.0 ~ 1.0（应已由 Pydantic 校验）。
        """
        difficulty = max(0.0, min(1.0, difficulty))
        score = max(0.0, min(1.0, score))

        if is_correct:
            # 越难答对，正向信号越强；满分（score=1）信号最强
            magnitude = self.STEP * (0.5 + difficulty) * (0.25 + 0.75 * score)
            new_mastery = self._clamp(old_mastery + magnitude)
        else:
            # 越简单答错，负向信号越强；得分越低（越错）负向越强
            magnitude = self.STEP * (1.5 - difficulty) * (1.25 - 0.75 * score)
            new_mastery = self._clamp(old_mastery - magnitude)

        return MasteryProjection(
            mastery_after=new_mastery,
            counted_as_assessment=True,
        )
