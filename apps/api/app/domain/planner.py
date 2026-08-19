"""EducationMind —— Study Planner 领域模型（Value Objects，非持久化）。

原则：
- StudyPlanDraft / StudyTaskDraft 是「尚未持久化的计划建议」，属于纯 Pydantic Value Object。
- PersistedStudyPlan / PersistedStudyTask 是「已持久化计划的只读输出模型」，
  供 Domain / Application 层消费，避免把 SQLAlchemy ORM 泄漏到上层
  （未来 HTTP / MCP / Agent Runtime 都可消费）。
- 本轮（Phase 2D-0）只建立 Planner 领域基础：不写 study_plans / study_tasks 表，
  不创建 Repository，不暴露 API。持久化留给 Phase 2D 后续步骤。
- 输入必须是 DiagnosisResult（`DiagnosisResultOut`），Planner 绝不自行查询 Mastery 再重新诊断。
- 确定性：相同 Diagnosis 输入必须产生相同 Draft（禁止随机排序）。

Draft 语义：
- `StudyPlanDraft.strategy`：当前计划完全由结构化 Diagnosis 驱动（diagnosis_driven）。
- `StudyTaskDraft.priority`：**Planner 排序结果**（首个任务 = 1.0，依次递减），
  由 Service 计算注入，前端/调用方不得提交。
- `StudyTaskDraft.draft_key`：稳定 key（`{knowledge_point_id}:{action_type}`），
  供跨调用引用同一任务，不依赖数据库自增 id。
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

from app.domain.models import DiagnosisStatus, StudyPlanStatus


class PlannerActionType(str, Enum):
    """Planner 学习动作类型 —— 不同 Diagnosis 状态需要不同的学习动作。

    - assess：需要先获取学习证据（UNASSESSED / INSUFFICIENT_EVIDENCE）。
    - remediate：已确认薄弱，需要补弱（WEAK）。
    - strengthen：已有一定基础，需要继续巩固（DEVELOPING）。
    - review：已较熟练，可进行轻量复习（PROFICIENT）。
    """

    ASSESS = "assess"
    REMEDIATE = "remediate"
    STRENGTHEN = "strengthen"
    REVIEW = "review"


class PlannerReasonCode(str, Enum):
    """机器可读 Planner 原因代码（前端可翻译为自然语言，领域层不存自然语言）。"""

    PRIMARY_FOCUS = "PRIMARY_FOCUS"
    CONFIRMED_WEAKNESS = "CONFIRMED_WEAKNESS"
    NEEDS_ASSESSMENT = "NEEDS_ASSESSMENT"
    NEEDS_MORE_EVIDENCE = "NEEDS_MORE_EVIDENCE"
    NEEDS_STRENGTHENING = "NEEDS_STRENGTHENING"
    MAINTENANCE_REVIEW = "MAINTENANCE_REVIEW"
    NO_IMMEDIATE_INTERVENTION = "NO_IMMEDIATE_INTERVENTION"


class PlanStrategy(str, Enum):
    """计划生成策略。

    第一版仅支持 diagnosis_driven：当前计划完全由结构化 Diagnosis 驱动。
    未来才可能有 exam_driven / goal_driven / deadline_driven（本轮不实现）。
    """

    DIAGNOSIS_DRIVEN = "diagnosis_driven"


class StudyTaskDraft(BaseModel):
    """一条规划任务（Draft / Value Object，不落库）。

    - `priority`：Planner 排序结果（首个任务 = 1.0，依次递减），由 Service 注入。
    - `source_status` / `source_priority_score`：来自 DiagnosisResult 的原始状态，
      用于解释「为什么安排这个任务」。
    """

    draft_key: str
    knowledge_point_id: str
    knowledge_point_name: str
    action_type: PlannerActionType
    priority: float = Field(ge=0.0, le=1.0)
    estimated_minutes: int = Field(ge=0)
    reason_codes: list[PlannerReasonCode] = Field(default_factory=list)
    source_status: DiagnosisStatus
    source_priority_score: float = Field(ge=0.0, le=1.0)
    order: int = Field(ge=1)


class StudyPlanDraft(BaseModel):
    """尚未持久化的计划建议（Study Planner 的输出）。

    - 空计划：`tasks = []`，`reason_codes = [NO_IMMEDIATE_INTERVENTION]`
      （当前没有需要立即补强的知识点，不强行选一个 MASTERED 知识点）。
    - 非空计划：`reason_codes` 为各任务 reason_codes 的去重汇总。
    """

    learner_id: str
    course_id: str
    generated_at: datetime
    strategy: PlanStrategy = PlanStrategy.DIAGNOSIS_DRIVEN
    tasks: list[StudyTaskDraft] = Field(default_factory=list)
    reason_codes: list[PlannerReasonCode] = Field(default_factory=list)
    source_diagnosis_generated_at: datetime


class PersistedStudyTask(BaseModel):
    """已持久化的计划任务（只读输出模型，非 ORM）。

    由 Repository 从 StudyTask 还原：enum 字段恢复为 Domain Enum。
    """

    id: str
    plan_id: str
    draft_key: str
    knowledge_point_id: str
    knowledge_point_name: str
    action_type: PlannerActionType
    priority: float = Field(ge=0.0, le=1.0)
    estimated_minutes: int = Field(ge=0)
    reason_codes: list[PlannerReasonCode] = Field(default_factory=list)
    source_status: DiagnosisStatus
    source_priority_score: float = Field(ge=0.0, le=1.0)
    order: int = Field(ge=1)
    created_at: datetime


class PersistedStudyPlan(BaseModel):
    """已持久化的完整学习计划（plan + tasks 聚合，只读输出模型，非 ORM）。"""

    id: str
    learner_id: str
    course_id: str
    status: StudyPlanStatus
    strategy: PlanStrategy
    generated_at: datetime
    source_diagnosis_generated_at: datetime
    reason_codes: list[PlannerReasonCode] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    tasks: list[PersistedStudyTask] = Field(default_factory=list)


class PersistedStudyPlanSummary(BaseModel):
    """已持久化计划的**摘要**（Plan History 列表项，不展开 Tasks）。

    供 History API / 未来 MCP list 使用：只携带概要 + task_count，
    避免一次性展开多份计划全部任务；完整 Tasks 由 Detail 接口单独读取。
    """

    id: str
    learner_id: str
    course_id: str
    strategy: PlanStrategy
    status: StudyPlanStatus
    generated_at: datetime
    created_at: datetime
    task_count: int = Field(ge=0)
    reason_codes: list[PlannerReasonCode] = Field(default_factory=list)
