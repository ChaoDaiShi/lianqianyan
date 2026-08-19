"""KnowledgeDiagnosisPolicy —— 知识点诊断策略（集中管理阈值与判定）。

职责：MasteryRecord → DiagnosisStatus + reason_codes。

状态判定优先级（不能只看 mastery_score）：
1. 先看 evidence_count
2. 再看 confidence
3. 只有证据达到最小要求时才判断 mastery
4. 根据 mastery_score 确定掌握等级

所有阈值集中定义，禁止 Magic Number 散落各处。
不依赖 FastAPI；可供 HTTP Route / MCP Tool / Diagnosis Agent 复用。
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.domain import DiagnosisReasonCode, DiagnosisStatus
from app.domain.models import MasteryRecord


@dataclass(frozen=True)
class DiagnosisThresholds:
    """诊断阈值（集中定义）。"""

    MIN_EVIDENCE: int = 1
    MIN_CONFIDENCE: float = 0.2
    WEAK_THRESHOLD: float = 0.50
    DEVELOPING_THRESHOLD: float = 0.70
    PROFICIENT_THRESHOLD: float = 0.85
    MASTERED_THRESHOLD: float = 0.92


@dataclass(frozen=True)
class KnowledgePointDiagnosisResult:
    """诊断结果。"""

    knowledge_point_id: str
    knowledge_point_name: str
    mastery_score: float
    confidence: float
    evidence_count: int
    status: DiagnosisStatus
    reason_codes: list[DiagnosisReasonCode] = field(default_factory=list)


class KnowledgeDiagnosisPolicy:
    """根据掌握记录与最小证据要求判断知识点诊断状态。"""

    def __init__(self, thresholds: DiagnosisThresholds | None = None) -> None:
        self._t = thresholds or DiagnosisThresholds()

    @property
    def thresholds(self) -> DiagnosisThresholds:
        return self._t

    def diagnose(
        self,
        record: MasteryRecord | None,
        knowledge_point_name: str = "",
        knowledge_point_id: str | None = None,
    ) -> KnowledgePointDiagnosisResult:
        """对单个知识点执行诊断。

        无记录 / 无评估 → UNASSESSED（绝不得仅因 mastery=0 判为 WEAK）。
        """
        kp_id = knowledge_point_id or (record.knowledge_point_id if record else "unknown")
        if record is None or record.evidence_count == 0:
            return KnowledgePointDiagnosisResult(
                knowledge_point_id=kp_id,
                knowledge_point_name=knowledge_point_name,
                mastery_score=record.mastery_score if record else 0.0,
                confidence=record.confidence if record else 0.0,
                evidence_count=record.evidence_count if record else 0,
                status=DiagnosisStatus.UNASSESSED,
                reason_codes=[DiagnosisReasonCode.NO_EVIDENCE],
            )

        # 证据不足
        if (
            record.evidence_count < self._t.MIN_EVIDENCE
            or record.confidence < self._t.MIN_CONFIDENCE
        ):
            return KnowledgePointDiagnosisResult(
                knowledge_point_id=record.knowledge_point_id,
                knowledge_point_name=knowledge_point_name,
                mastery_score=record.mastery_score,
                confidence=record.confidence,
                evidence_count=record.evidence_count,
                status=DiagnosisStatus.INSUFFICIENT_EVIDENCE,
                reason_codes=[DiagnosisReasonCode.LIMITED_EVIDENCE],
            )

        mastery = record.mastery_score
        # 有足够证据 → 按 mastery 判定等级
        if mastery < self._t.WEAK_THRESHOLD:
            status, reason = DiagnosisStatus.WEAK, [DiagnosisReasonCode.LOW_MASTERY]
        elif mastery < self._t.DEVELOPING_THRESHOLD:
            status, reason = DiagnosisStatus.DEVELOPING, [DiagnosisReasonCode.LOW_MASTERY]
        elif mastery < self._t.PROFICIENT_THRESHOLD:
            status, reason = DiagnosisStatus.PROFICIENT, [DiagnosisReasonCode.ADEQUATE_MASTERY]
        else:
            status, reason = DiagnosisStatus.MASTERED, [DiagnosisReasonCode.STRONG_MASTERY]

        return KnowledgePointDiagnosisResult(
            knowledge_point_id=record.knowledge_point_id,
            knowledge_point_name=knowledge_point_name,
            mastery_score=mastery,
            confidence=record.confidence,
            evidence_count=record.evidence_count,
            status=status,
            reason_codes=reason,
        )

    def is_assessed(self, status: DiagnosisStatus) -> bool:
        """状态是否属于「有足够证据、可判定掌握等级」。"""
        return status in {
            DiagnosisStatus.WEAK,
            DiagnosisStatus.DEVELOPING,
            DiagnosisStatus.PROFICIENT,
            DiagnosisStatus.MASTERED,
        }
