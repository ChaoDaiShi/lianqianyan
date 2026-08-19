"""EducationMind —— Tutor Agent 领域模型（Phase 3-0）。

本轮只建立「请求级上下文」的最小领域模型，不设计复杂 Agent Framework：

- `TutorConversationRequest`：客户端提问（learner_id + course_id + message）。
- `TutorResponse`：小涟的回答（answer / context_used / suggested_actions / source）。
- `TutorContext` 及子模型：为回答一次提问而构建的**学生学习上下文快照**
  （profile / diagnosis / plan / evidence），由 `TutorContextBuilder` 组装。
  Prompt 与 LLM 只消费该快照，不直接读库、不重复计算。

约定：
- TutorContext 是「请求级」快照：**不保存聊天历史、不建 Conversation 表**
  （比赛演示优先；未来 Memory System 另行设计）。
- `context_used` 是解释能力：表示本次回答实际使用了哪些学习上下文
  （例如 `["profile", "diagnosis", "study_plan"]`），**不是**返回全部数据。
- `source` 区分真实 LLM 回答与确定性兜底回答（fallback 必须诚实标记，
  绝不伪装成 LLM 输出）。
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class TutorConversationRequest(BaseModel):
    """POST /api/tutor/chat 请求 —— 客户端只表达「学生问了什么」。

    客户端**不得**提交任何学习上下文（profile / diagnosis / plan / evidence）：
    全部由服务端 `TutorContextBuilder` 依据真实数据确定性构建。
    """

    learner_id: str = Field(min_length=1, description="学习者 ID（不能为空）")
    course_id: str = Field(min_length=1, description="课程 ID（不能为空）")
    message: str = Field(min_length=1, description="学生的问题（不能为空）")

    @field_validator("learner_id", "course_id", "message")
    @classmethod
    def _strip_and_not_blank(cls, value: str) -> str:
        """去除首尾空白；空白串等价于空值 → 422 Validation Error。"""
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value


class TutorResponse(BaseModel):
    """小涟的回答。

    - `answer`：回答文本（LLM 或确定性兜底）。
    - `context_used`：本次回答实际使用了哪些学习上下文（解释能力，非全量数据）。
    - `suggested_actions`：确定性生成的下一步学习建议。
    - `source`：`llm`（真实 LLM 回答）或 `fallback`（LLM 失败后的兜底回答）。
    """

    answer: str
    context_used: list[str] = Field(default_factory=list)
    suggested_actions: list[str] = Field(default_factory=list)
    source: Literal["llm", "fallback"] = "llm"


# ---------------------------------------------------------------------------
# TutorContext —— 学生学习上下文快照（请求级）
# ---------------------------------------------------------------------------


class TutorProfilePointContext(BaseModel):
    """学习画像中单个知识点的掌握摘要（来自 LearnerProfileService）。"""

    knowledge_point_id: str
    knowledge_point_name: str
    mastery_score: float
    status: str


class TutorProfileContext(BaseModel):
    """学习画像摘要 —— 来自 LearnerProfileService（Derived Read Model），不重复计算。"""

    overall_mastery: float | None = None
    overall_confidence: float | None = None
    coverage: float = 0.0
    assessed_count: int = 0
    total_knowledge_points: int = 0
    insufficient_data: bool = True
    points: list[TutorProfilePointContext] = Field(default_factory=list)


class TutorDiagnosisPointContext(BaseModel):
    """诊断中单个知识点的摘要（来自 DiagnosisService）。"""

    knowledge_point_id: str
    knowledge_point_name: str
    mastery_score: float
    status: str
    priority_score: float = 0.0


class TutorDiagnosisContext(BaseModel):
    """结构化诊断摘要 —— 来自 DiagnosisService，不自行判断 weak / priority。"""

    primary_focus: TutorDiagnosisPointContext | None = None
    weak_points: list[TutorDiagnosisPointContext] = Field(default_factory=list)
    developing_points: list[TutorDiagnosisPointContext] = Field(default_factory=list)
    strengths: list[TutorDiagnosisPointContext] = Field(default_factory=list)
    unassessed_points: list[TutorDiagnosisPointContext] = Field(default_factory=list)


class TutorPlanTaskContext(BaseModel):
    """当前学习计划中的一条任务摘要（来自 StudyPlan / StudyTask）。"""

    order: int
    knowledge_point_id: str
    knowledge_point_name: str
    action_type: str
    estimated_minutes: int


class TutorPlanContext(BaseModel):
    """当前学习计划摘要 —— 读取最新 generated_at 的 Plan（无 Active 唯一语义）。"""

    has_plan: bool = False
    plan_id: str | None = None
    generated_at: datetime | None = None
    tasks: list[TutorPlanTaskContext] = Field(default_factory=list)


class TutorEvidenceContext(BaseModel):
    """一条最近学习证据的摘要（来自 LearningEvidence）。"""

    evidence_type: str
    knowledge_point_id: str | None = None
    is_assessment: bool = False
    occurred_at: datetime


class TutorContext(BaseModel):
    """为一次提问构建的学生学习上下文快照（请求级，非持久记忆）。"""

    learner_id: str
    course_id: str
    course_name: str
    profile: TutorProfileContext | None = None
    diagnosis: TutorDiagnosisContext | None = None
    plan: TutorPlanContext = Field(default_factory=TutorPlanContext)
    recent_evidence: list[TutorEvidenceContext] = Field(default_factory=list)
    context_used: list[str] = Field(default_factory=list)
