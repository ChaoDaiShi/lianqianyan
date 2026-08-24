"""EducationMind —— Python 领域模型（Education Domain）。

原则：
- 这是与 Web 侧（src/domain）对应的 Python 事实来源。
- LearningEvidence（学习证据）是核心数据，其余实体围绕它组织。
- SQLAlchemy 模型用于持久化；Pydantic 模型用于 API 出入参。
- 数据库层不写死 SQLite 特性，未来通过修改 DATABASE_URL 迁移到 PostgreSQL/MySQL。
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator

from sqlalchemy import JSON, DateTime, Float, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.time import utc_now


class Base(DeclarativeBase):
    """SQLAlchemy 声明式基类。"""


class EvidenceType(str, Enum):
    """学习证据的类型 —— 描述「学习行为是什么」。

    - learning_started：开始/继续一次学习活动（行为证据，不改掌握度）。
    - practice_answer_evaluated：完成一道练习并获得确定性评价（评价证据，可改掌握度）。
    """

    LEARNING_STARTED = "learning_started"
    PRACTICE_ANSWER_EVALUATED = "practice_answer_evaluated"


class EvidenceSource(str, Enum):
    """学习证据的来源 —— 描述「学习行为从哪里产生」。

    统一该概念，避免用一个字符串同时表达「行为是什么」和「来自哪里」。
    """

    CURRENT_STUDY_PLAN = "current_study_plan"
    RECOMMENDED_PATH = "recommended_path"
    LEARNING_SPACE = "learning_space"


class EvidenceClassification(str, Enum):
    """学习证据的领域分类 —— 决定其是否可影响掌握度。"""

    BEHAVIOR = "behavior"
    ASSESSMENT = "assessment"
    REFLECTION = "reflection"


class DiagnosisStatus(str, Enum):
    """知识点诊断状态。

    - unassessed：没有任何有效评估（未曾评估）。
    - insufficient_evidence：证据不足，暂不能可靠判断掌握状态。
    - weak / developing / proficient / mastered：有足够证据时的掌握等级。
    """

    UNASSESSED = "unassessed"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"
    WEAK = "weak"
    DEVELOPING = "developing"
    PROFICIENT = "proficient"
    MASTERED = "mastered"


class DiagnosisReasonCode(str, Enum):
    """机器可读诊断原因代码（前端可翻译为自然语言）。"""

    NO_EVIDENCE = "NO_EVIDENCE"
    LIMITED_EVIDENCE = "LIMITED_EVIDENCE"
    LOW_MASTERY = "LOW_MASTERY"
    ADEQUATE_MASTERY = "ADEQUATE_MASTERY"
    STRONG_MASTERY = "STRONG_MASTERY"


# ---------------------------------------------------------------------------
# SQLAlchemy 实体
# ---------------------------------------------------------------------------


class User(Base):
    """用户 —— 一名学习者。"""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    organization: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


class Course(Base):
    """课程 —— 学习的基本组织单元。"""

    __tablename__ = "courses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


class KnowledgePoint(Base):
    """知识点 —— 最小可被诊断与衡量的学习单元。"""

    __tablename__ = "knowledge_points"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    course_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    difficulty: Mapped[int] = mapped_column(Integer, default=1)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


class LearningEvidence(Base):
    """学习证据 —— EducationMind 的核心数据。

    代表学生在学习过程中产生的一次**可用于判断学习状态**的行为记录。

    语义约定：
    - `evidence_type`：本次证据「是什么」。
    - `source`：本次证据「从哪里产生」。
    二者独立，禁止用同一个字符串同时表达两种语义。
    - 只有 assessment 分类（如 practice_answer_evaluated）的 Evidence 可影响掌握度。
    """

    __tablename__ = "learning_evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    learner_id: Mapped[str] = mapped_column(String(36), index=True)
    evidence_type: Mapped[str] = mapped_column(String(40), index=True)
    source: Mapped[str] = mapped_column(String(40), index=True)
    knowledge_point_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    course_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    question_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    session_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    mastery_delta: Mapped[float | None] = mapped_column(Float, nullable=True)
    payload: Mapped[str] = mapped_column(Text, default="{}")
    occurred_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, index=True)


class LearnerProfile(Base):
    """学习画像 —— 由大量 LearningEvidence 汇聚而来。"""

    __tablename__ = "learner_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    overall_mastery: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


class StudyPlanStatus(str, Enum):
    """学习计划生命周期状态（持久化实体用，最小语义）。

    - active：当前生效计划（Phase 3-1 起保证单 learner/course 至多一个 ACTIVE：
      新计划持久化时旧 ACTIVE 在同一事务内被 supersede）。
    - superseded：已被后续计划取代（由 PersistenceService 在 persist 时自动标记）。
    - completed：计划已完成（未来语义，本轮不实现）。
    """

    ACTIVE = "active"
    SUPERSEDED = "superseded"
    COMPLETED = "completed"


class StudyPlan(Base):
    """学习计划（持久化实体）。

    由 StudyPlanPersistenceService 从 StudyPlanDraft 落库（status 首版恒为 ACTIVE）。
    `strategy` / `generated_at` / `source_diagnosis_generated_at` / `reason_codes`
    构成 **Planner Provenance Snapshot**：即使日后 Mastery / Diagnosis 已经变化，
    仍能解释「这份旧计划当时为什么这样生成」。

    约定：
    - `reason_codes` 以 JSON 保存 PlannerReasonCode 的稳定 enum value（string list），
      Enum ↔ DB 表示转换由 Repository 层负责，上层服务不做手工 json 序列化。
    - 不保存完整 Diagnosis JSON（避免数据重复 / schema 漂移 / 双重事实源）。
    """

    __tablename__ = "study_plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    learner_id: Mapped[str] = mapped_column(String(36), index=True)
    course_id: Mapped[str] = mapped_column(String(36), index=True)
    strategy: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(20), default=StudyPlanStatus.ACTIVE.value)
    generated_at: Mapped[datetime] = mapped_column(DateTime)
    source_diagnosis_generated_at: Mapped[datetime] = mapped_column(DateTime)
    reason_codes: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utc_now, onupdate=utc_now
    )


class StudyTask(Base):
    """计划任务（持久化实体）。

    由 StudyPlanPersistenceService 从 StudyTaskDraft 落库，与 StudyPlan 同一事务。
    字段构成 Planner Provenance：
    - `draft_key`（`{kp_id}:{action}`）是 Planner 内部稳定来源 key，用于跨调用追踪，
      **不是**正式 DB primary key（`id` 由服务端 UUID 生成）。
    - `priority`（Planner 排序结果，首个=1.0 递减）与 `source_priority_score`
      （Diagnosis 输入的原始 priority_score）是两个不同字段，禁止合并。
    - `action_type` / `reason_codes` / `source_status` 保存稳定 enum value，
      Repository 层负责还原为 Domain Enum。
    """

    __tablename__ = "study_tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    plan_id: Mapped[str] = mapped_column(String(36), index=True)
    knowledge_point_id: Mapped[str] = mapped_column(String(36), index=True)
    knowledge_point_name: Mapped[str] = mapped_column(String(160))
    action_type: Mapped[str] = mapped_column(String(20))
    priority: Mapped[float] = mapped_column(Float)
    estimated_minutes: Mapped[int] = mapped_column(Integer)
    reason_codes: Mapped[list[str]] = mapped_column(JSON, default=list)
    source_status: Mapped[str] = mapped_column(String(30))
    source_priority_score: Mapped[float] = mapped_column(Float)
    order: Mapped[int] = mapped_column(Integer)
    draft_key: Mapped[str] = mapped_column(String(160))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utc_now, onupdate=utc_now
    )


class MasteryRecord(Base):
    """掌握度记录 —— 学生某知识点的当前掌握状态。

    - `mastery_score`：0.0 ~ 1.0。
    - `confidence`：对当前掌握度的置信（基于 evidence_count 的简单策略），0.0 ~ 1.0。
    - `evidence_count`：参与本知识点掌握度投影的**有效评价证据**数量（不含纯行为证据）。
    - `learner_id + knowledge_point_id` 唯一 → 「当前掌握状态」有唯一语义。
    """

    __tablename__ = "mastery_records"
    __table_args__ = (
        UniqueConstraint("learner_id", "knowledge_point_id", name="uq_mastery_learner_kp"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    learner_id: Mapped[str] = mapped_column(String(36), index=True)
    knowledge_point_id: Mapped[str] = mapped_column(String(36), index=True)
    mastery_score: Mapped[float] = mapped_column(Float, default=0.0)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    evidence_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utc_now, onupdate=utc_now
    )


# ---------------------------------------------------------------------------
# Pydantic 出入参模型（API 层）
# ---------------------------------------------------------------------------


class HealthResponse(BaseModel):
    """GET /api/health 响应。"""

    status: str
    service: str


class LearningEvidenceIn(BaseModel):
    """上报一条学习证据。"""

    learner_id: str
    evidence_type: EvidenceType
    source: EvidenceSource
    knowledge_point_id: str | None = None
    course_id: str | None = None
    question_id: str | None = None
    session_id: str | None = None
    mastery_delta: float | None = Field(default=None, ge=0.0, le=1.0)
    payload: dict[str, Any] = Field(default_factory=dict)
    occurred_at: datetime | None = None


class LearningEvidenceOut(BaseModel):
    id: str = ""
    learner_id: str
    evidence_type: EvidenceType
    source: EvidenceSource
    knowledge_point_id: str | None = None
    course_id: str | None = None
    question_id: str | None = None
    session_id: str | None = None
    mastery_delta: float | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    occurred_at: datetime = Field(default_factory=utc_now)


class MessageResponse(BaseModel):
    """通用消息响应。"""

    message: str


class LearningStartResponse(BaseModel):
    """开始学习的响应 —— 返回学习证据 id 与会话 id。"""

    message: str
    evidence: LearningEvidenceOut
    session_id: str


class ProfileOut(BaseModel):
    """学习画像响应。"""

    id: str
    user_id: str
    overall_mastery: float
    weak_knowledge_point_ids: list[str] = Field(default_factory=list)
    updated_at: datetime


class PracticeEvaluateRequest(BaseModel):
    """练习评价请求 —— 客户端只提供真实学习行为 / 评价结果。"""

    learner_id: str
    course_id: str
    knowledge_point_id: str
    question_id: str
    is_correct: bool
    # score / difficulty 采用 0.0 ~ 1.0（Pydantic 校验边界）
    score: float = Field(ge=0.0, le=1.0)
    difficulty: float = Field(ge=0.0, le=1.0)


class StudyPlanGenerateRequest(BaseModel):
    """生成计划请求 —— 客户端只表达「给这个 learner/course 生成当前学习计划」。

    客户端**不得**提交 diagnosis / tasks / draft 等派生数据：
    Diagnosis → Planner → Tasks 全部由服务端确定性生成。
    """

    learner_id: str = Field(min_length=1, description="学习者 ID（不能为空）")
    course_id: str = Field(min_length=1, description="课程 ID（不能为空）")

    @field_validator("learner_id", "course_id")
    @classmethod
    def _strip_and_not_blank(cls, value: str) -> str:
        """去除首尾空白；空白串等价于空值 → 422 Validation Error。"""
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value


class MasteryStateOut(BaseModel):
    """某个知识点当前的掌握状态（只读）。"""

    knowledge_point_id: str
    mastery_score: float = Field(ge=0.0, le=1.0)
    confidence: float = Field(ge=0.0, le=1.0)
    evidence_count: int = Field(ge=0)
    updated_at: datetime


class KnowledgePointDiagnosis(BaseModel):
    """单个知识点的诊断结果。"""

    knowledge_point_id: str
    knowledge_point_name: str
    mastery_score: float
    confidence: float
    evidence_count: int
    status: DiagnosisStatus
    priority_score: float = Field(default=0.0, ge=0.0, le=1.0)
    reason_codes: list[DiagnosisReasonCode] = Field(default_factory=list)


class StatusCounts(BaseModel):
    """按诊断状态统计的计数。"""

    unassessed: int = 0
    insufficient_evidence: int = 0
    weak: int = 0
    developing: int = 0
    proficient: int = 0
    mastered: int = 0


class LearnerProfileOut(BaseModel):
    """LearnerProfile —— Derived Read Model（请求时动态计算）。

    Source of Truth 是 MasteryRecord；本模型是投影，不作为独立修改来源。
    """

    learner_id: str
    course_id: str
    course_name: str
    overall_mastery: float | None = None
    overall_confidence: float | None = None
    insufficient_data: bool = True
    coverage: float = 0.0
    total_knowledge_points: int = 0
    assessed_count: int = 0
    unassessed_count: int = 0
    status_counts: StatusCounts = Field(default_factory=StatusCounts)
    knowledge_points: list[KnowledgePointDiagnosis] = Field(default_factory=list)
    updated_at: datetime


class DiagnosisResultOut(BaseModel):
    """结构化 Diagnosis —— 偏向决策解释，不使用 LLM。"""

    learner_id: str
    course_id: str
    course_name: str
    primary_focus: KnowledgePointDiagnosis | None = None
    priority_interventions: list[KnowledgePointDiagnosis] = Field(default_factory=list)
    strengths: list[KnowledgePointDiagnosis] = Field(default_factory=list)
    weak_points: list[KnowledgePointDiagnosis] = Field(default_factory=list)
    developing_points: list[KnowledgePointDiagnosis] = Field(default_factory=list)
    unassessed_points: list[KnowledgePointDiagnosis] = Field(default_factory=list)
    summary_codes: list[DiagnosisReasonCode] = Field(default_factory=list)
    diagnosis_generated_at: datetime
