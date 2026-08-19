"""MasteryProjectionService —— 掌握度投影服务。

职责：
    接收 LearningEvidence
        → 解释 Evidence 类型（EvidenceClassifier）
        → 判断是否具有 Mastery 更新资格
        → 读取当前 MasteryRecord（MasteryRepository）
        → 执行 MasteryUpdatePolicy
        → 保存 MasteryRecord（MasteryRepository）
        → 返回投影结果（含 before / after / confidence / evidence_count）

不依赖 FastAPI；未来可被 HTTP Route / MCP Tool / Agent Runtime 复用。
事务纪律：本服务只做 add/flush，整体 commit 由上层 Application Service 控制。
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.domain import EvidenceType, LearningEvidenceOut
from app.domain.models import MasteryRecord
from app.services.evidence_classification import EvidenceClassifier
from app.services.mastery_repository import MasteryRepository
from app.services.mastery_update_policy import MasteryUpdatePolicy


@dataclass(frozen=True)
class ProjectionResult:
    """掌握度投影结果。"""

    knowledge_point_id: str
    mastery_before: float
    mastery_after: float
    confidence: float
    evidence_count: int
    mastery_changed: bool


class MasteryProjectionService:
    """把一条学习证据投影到掌握度。"""

    def __init__(
        self,
        db: Session,
        mastery_repo: MasteryRepository | None = None,
        policy: MasteryUpdatePolicy | None = None,
    ) -> None:
        self._db = db
        self._mastery_repo = mastery_repo or MasteryRepository(db)
        self._policy = policy or MasteryUpdatePolicy()

    def project(self, evidence: LearningEvidenceOut) -> ProjectionResult | None:
        """将一条 LearningEvidence 投影为掌握度更新。

        行为证据（learning_started）不改变掌握度，返回 None（表示无投影变化）。
        评价证据（practice_answer_evaluated）执行掌握度投影。
        """
        evidence_type = evidence.evidence_type
        kp_id = evidence.knowledge_point_id

        if not EvidenceClassifier.affects_mastery(evidence_type):
            return None

        # 评价证据必须有关联知识点与评价结果
        if not kp_id:
            return None

        record = self._mastery_repo.get_or_create(
            learner_id=evidence.learner_id,
            knowledge_point_id=kp_id,
        )

        mastery_before = record.mastery_score
        # 有效评估证据数 +1（project 只处理 assessment 证据）
        new_count = record.evidence_count + 1

        # 从证据中取出评价信息
        payload = evidence.payload or {}
        is_correct = bool(payload.get("is_correct", False))
        difficulty = float(payload.get("difficulty", 0.5))
        score = float(payload.get("score", 1.0 if is_correct else 0.0))
        # 校验边界，防止异常 payload 越界
        difficulty = max(0.0, min(1.0, difficulty))
        score = max(0.0, min(1.0, score))

        projection = self._policy.project(
            mastery_before,
            is_correct=is_correct,
            difficulty=difficulty,
            score=score,
        )

        mastery_after = projection.mastery_after
        confidence = self._policy.confidence_for(new_count)

        self._mastery_repo.update(
            record,
            mastery_score=mastery_after,
            confidence=confidence,
            evidence_count=new_count,
        )

        return ProjectionResult(
            knowledge_point_id=kp_id,
            mastery_before=mastery_before,
            mastery_after=mastery_after,
            confidence=confidence,
            evidence_count=new_count,
            mastery_changed=mastery_after != mastery_before,
        )

    def get_mastery_state(self, learner_id: str, knowledge_point_id: str) -> MasteryRecord | None:
        """读取某知识点当前掌握记录（无则返回 None）。"""
        return self._mastery_repo.get_by_learner_and_knowledge_point(
            learner_id, knowledge_point_id
        )
