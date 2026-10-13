from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.time import utc_now
from app.domain.models import Base


class AdaptiveSessionRecord(Base):
    __tablename__ = "adaptive_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    learner_id: Mapped[str] = mapped_column(String(36), index=True)
    course_id: Mapped[str] = mapped_column(String(36), index=True)
    topic_id: Mapped[str] = mapped_column(String(60), index=True)
    policy: Mapped[str] = mapped_column(String(20))
    experiment_group: Mapped[str] = mapped_column(String(1), index=True)
    ablation: Mapped[str] = mapped_column(String(30), default="none")
    phase: Mapped[str] = mapped_column(String(20), index=True)
    snapshot: Mapped[dict] = mapped_column(JSON)
    pre_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    post_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    retest_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    retest_due_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)


class AdaptiveKnowledgeState(Base):
    __tablename__ = "adaptive_knowledge_states"
    __table_args__ = (
        UniqueConstraint(
            "learner_id", "knowledge_point_id", name="uq_adaptive_learner_kp"
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    learner_id: Mapped[str] = mapped_column(String(36), index=True)
    knowledge_point_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(160))
    mastery: Mapped[float | None] = mapped_column(Float, nullable=True)
    uncertainty: Mapped[float] = mapped_column(Float, default=1.0)
    evidence_count: Mapped[int] = mapped_column(Integer, default=0)
    misconceptions: Mapped[list[dict]] = mapped_column(JSON, default=list)
    model_version: Mapped[str] = mapped_column(String(60))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)
