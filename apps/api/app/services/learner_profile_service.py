"""LearnerProfileService —— 学习画像服务（Derived Read Model）。

职责：读取学生某课程的 MasteryRecord + KnowledgePoint → 诊断 → 聚合 LearnerProfile。

原则：
- MasteryRecord 是当前知识掌握状态的 Source of Truth。
- LearnerProfile 是请求时动态计算的投影（Computed Profile），不作为独立修改来源，
  避免与 MasteryRecord 状态漂移。
- overall_mastery 只聚合「有足够诊断资格」的知识点，绝不把 UNASSESSED 当作 0 参与平均。
- 不依赖 FastAPI。
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.time import utc_now
from app.domain import (
    DiagnosisStatus,
    LearnerProfileOut,
    MasteryStateOut,
    StatusCounts,
)
from app.domain.models import (
    KnowledgePoint,
    KnowledgePointDiagnosis,
    MasteryRecord,
)
from app.services.knowledge_diagnosis_policy import (
    KnowledgeDiagnosisPolicy,
    KnowledgePointDiagnosisResult,
)
from app.services.knowledge_point_repository import KnowledgePointRepository
from app.services.mastery_repository import MasteryRepository


class LearnerProfileService:
    """由真实学习状态动态聚合学习画像。"""

    def __init__(
        self,
        db: Session,
        mastery_repo: MasteryRepository | None = None,
        kp_repo: KnowledgePointRepository | None = None,
        policy: KnowledgeDiagnosisPolicy | None = None,
    ) -> None:
        self._db = db
        self._mastery_repo = mastery_repo or MasteryRepository(db)
        self._kp_repo = kp_repo or KnowledgePointRepository(db)
        self._policy = policy or KnowledgeDiagnosisPolicy()

    def diagnose_course(
        self, learner_id: str, course_id: str
    ) -> list[KnowledgePointDiagnosisResult]:
        """对某课程全部知识点执行诊断，返回按知识点顺序的结果列表。"""
        kps = self._kp_repo.list_by_course(course_id)
        results: list[KnowledgePointDiagnosisResult] = []
        for kp in kps:
            record = self._mastery_repo.get_by_learner_and_knowledge_point(
                learner_id, kp.id
            )
            results.append(self._policy.diagnose(record, kp.name, kp.id))
        return results

    def build_profile(
        self, learner_id: str, course_id: str, course_name: str
    ) -> LearnerProfileOut:
        """构建某课程的 LearnerProfile（Derived Read Model）。"""
        diagnoses = self.diagnose_course(learner_id, course_id)
        total = len(diagnoses)

        assessed = [d for d in diagnoses if self._policy.is_assessed(d.status)]
        unassessed = [d for d in diagnoses if d.status == DiagnosisStatus.UNASSESSED]
        insufficient = [
            d for d in diagnoses if d.status == DiagnosisStatus.INSUFFICIENT_EVIDENCE
        ]

        status_counts = StatusCounts(
            unassessed=len(unassessed),
            insufficient_evidence=len(insufficient),
            weak=sum(1 for d in diagnoses if d.status == DiagnosisStatus.WEAK),
            developing=sum(1 for d in diagnoses if d.status == DiagnosisStatus.DEVELOPING),
            proficient=sum(1 for d in diagnoses if d.status == DiagnosisStatus.PROFICIENT),
            mastered=sum(1 for d in diagnoses if d.status == DiagnosisStatus.MASTERED),
        )

        # overall_mastery：只聚合有足够证据的知识点（confidence-weighted）
        if assessed:
            sum_weighted = sum(d.mastery_score * d.confidence for d in assessed)
            sum_weight = sum(d.confidence for d in assessed)
            overall_mastery = (sum_weighted / sum_weight) if sum_weight > 0 else None
            insufficient_data = False
        else:
            overall_mastery = None
            insufficient_data = True

        # overall_confidence：coverage_ratio × 平均置信
        coverage = (len(assessed) / total) if total > 0 else 0.0
        if assessed:
            avg_confidence = sum(d.confidence for d in assessed) / len(assessed)
            overall_confidence = max(0.0, min(1.0, coverage * avg_confidence))
        else:
            overall_confidence = None

        kp_diagnoses: list[KnowledgePointDiagnosis] = [
            self._to_domain(d) for d in diagnoses
        ]

        return LearnerProfileOut(
            learner_id=learner_id,
            course_id=course_id,
            course_name=course_name,
            overall_mastery=overall_mastery,
            overall_confidence=overall_confidence,
            insufficient_data=insufficient_data,
            coverage=coverage,
            total_knowledge_points=total,
            assessed_count=len(assessed),
            unassessed_count=total - len(assessed),
            status_counts=status_counts,
            knowledge_points=kp_diagnoses,
            updated_at=utc_now(),
        )

    def get_kp_mastery_state(self, learner_id: str, kp_id: str) -> MasteryStateOut | None:
        """读取某知识点掌握状态（供既有 /api/profile/mastery 复用）。"""
        record = self._mastery_repo.get_by_learner_and_knowledge_point(learner_id, kp_id)
        if record is None:
            return None
        return MasteryStateOut(
            knowledge_point_id=record.knowledge_point_id,
            mastery_score=record.mastery_score,
            confidence=record.confidence,
            evidence_count=record.evidence_count,
            updated_at=record.updated_at,
        )

    @staticmethod
    def _to_domain(result: KnowledgePointDiagnosisResult) -> KnowledgePointDiagnosis:
        return KnowledgePointDiagnosis(
            knowledge_point_id=result.knowledge_point_id,
            knowledge_point_name=result.knowledge_point_name,
            mastery_score=result.mastery_score,
            confidence=result.confidence,
            evidence_count=result.evidence_count,
            status=result.status,
            priority_score=0.0,  # 由 DiagnosisService 计算
            reason_codes=result.reason_codes,
        )
