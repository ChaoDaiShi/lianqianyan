"""Evidence Classification —— 集中管理学习证据的领域解释。

职责：给定 EvidenceType，返回其领域分类（behavior / assessment / reflection）。
所有「该证据类型是否可影响掌握度」的规则集中在此，禁止在多个
Route / Service 中散落 `if evidence_type == ...`。
"""

from __future__ import annotations

from app.domain import EvidenceClassification, EvidenceType

# 当前支持的 Evidence Type → 领域分类 的集中映射表
_CLASSIFICATION: dict[EvidenceType, EvidenceClassification] = {
    EvidenceType.LEARNING_STARTED: EvidenceClassification.BEHAVIOR,
    EvidenceType.PRACTICE_ANSWER_EVALUATED: EvidenceClassification.ASSESSMENT,
    EvidenceType.EXAM_ANSWER_EVALUATED: EvidenceClassification.ASSESSMENT,
}

# 允许影响掌握度的分类
_MASTERY_AFFECTING: frozenset[EvidenceClassification] = frozenset(
    {EvidenceClassification.ASSESSMENT}
)


class EvidenceClassifier:
    """学习证据的领域分类器。"""

    @staticmethod
    def classify(evidence_type: EvidenceType) -> EvidenceClassification:
        """返回证据类型对应的领域分类。

        若类型未知则抛出 KeyError，确保规则演进时集中更新。
        """
        try:
            return _CLASSIFICATION[evidence_type]
        except KeyError:
            raise ValueError(f"Unsupported evidence_type: {evidence_type.value}") from None

    @staticmethod
    def affects_mastery(evidence_type: EvidenceType) -> bool:
        """该证据类型是否允许影响掌握度。"""
        return EvidenceClassifier.classify(evidence_type) in _MASTERY_AFFECTING
