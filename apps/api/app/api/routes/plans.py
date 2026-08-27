"""学习计划路由 —— 诊断驱动计划生成 / 当前计划 / 详情 / 历史（Phase 2D-2 + 3-1）。

API 语义（保持干净、单一职责）：
    GET  /api/plans                     → Plan History（learner_id + course_id 查询，摘要列表，最新在前）
    GET  /api/plans/current             → 当前 ACTIVE 计划（完整 Plan + Tasks；无 → 404）
    POST /api/plans/generate            → 生成并持久化诊断驱动 StudyPlan（201；旧 ACTIVE 自动 supersede）
    GET  /api/plans/{plan_id}           → 完整 Plan + Tasks（按 order 排序；不存在 → 404）

约定：
- 生成接口的客户端只表达「给这个 learner/course 生成当前学习计划」，
  不得提交 diagnosis / tasks / draft —— 全部由服务端确定性生成。
- 读取接口无副作用（不自动生成 / 不 refresh Diagnosis / 不 supersede / 不写 DB）。
- Route 不做任何 SQL 查询：生成走 StudyPlanApplicationService（复用
  DiagnosisService → StudyPlannerService → StudyPlanPersistenceService），
  读取走 Repository 重建，ORM 不泄漏到响应。
- Active 唯一性（Phase 3-1）：generate 时旧 ACTIVE 在同一事务内被 supersede，
  任意时刻至多一个 ACTIVE 计划；`/current` 即该计划。
- ⚠️ 路由顺序：`/current` 必须注册在 `/{plan_id}` 之前，否则会被当作 plan_id。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.auth.dependencies import authorize_learning_scope, optional_current_account
from app.auth.models import AuthAccount
from app.domain import PersistedStudyPlan, PersistedStudyPlanSummary, ReplanningResult
from app.domain.models import StudyPlanGenerateRequest
from app.services import DynamicReplanningService, StudyPlanApplicationService

router = APIRouter(prefix="/plans", tags=["plans"])


def _service(db: Session = Depends(get_db)) -> StudyPlanApplicationService:
    return StudyPlanApplicationService(db)


def _replanning_service(db: Session = Depends(get_db)) -> DynamicReplanningService:
    return DynamicReplanningService(db)


@router.get("", response_model=list[PersistedStudyPlanSummary])
def list_plans(
    learner_id: str,
    course_id: str = "course-os",
    service: StudyPlanApplicationService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> list[PersistedStudyPlanSummary]:
    """某学习者某课程的 Plan History（generated_at DESC，最新在前；不含 Tasks）。

    纯读取：不自动生成计划、不修改任何数据。
    """
    authorize_learning_scope(account, learner_id, course_id)
    return service.list_history(learner_id, course_id)


@router.get("/current", response_model=PersistedStudyPlan)
def get_current_plan(
    learner_id: str,
    course_id: str = "course-os",
    service: StudyPlanApplicationService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> PersistedStudyPlan:
    """读取当前 ACTIVE 计划（完整 Plan + Tasks）。

    - 存在 → 200 完整计划；不存在（从未生成 / 被 Empty Plan 取代）→ 404。
    - 纯读取：不自动生成、不 refresh Diagnosis、不写 DB。
    """
    authorize_learning_scope(account, learner_id, course_id)
    plan = service.get_current(learner_id, course_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="no current study plan")
    return plan


@router.post(
    "/generate",
    response_model=PersistedStudyPlan,
    status_code=201,
)
def generate_plan(
    payload: StudyPlanGenerateRequest,
    service: StudyPlanApplicationService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> PersistedStudyPlan:
    """显式生成一份诊断驱动 StudyPlan（Diagnosis → Planner → Persistence 同一事务）。

    客户端只提交 learner_id / course_id；Diagnosis 与 Tasks 全部由服务端确定性生成。
    旧 ACTIVE 计划在同一事务内被 supersede —— 生成后该计划即为唯一当前计划。
    """
    authorize_learning_scope(account, payload.learner_id, payload.course_id)
    return service.generate_plan(payload.learner_id, payload.course_id)


@router.post("/replan", response_model=ReplanningResult)
def replan_current(
    payload: StudyPlanGenerateRequest,
    service: DynamicReplanningService = Depends(_replanning_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> ReplanningResult:
    """Compare against the current plan and replace it only for material change."""
    authorize_learning_scope(account, payload.learner_id, payload.course_id)
    return service.replan(payload.learner_id, payload.course_id)


@router.get("/{plan_id}", response_model=PersistedStudyPlan)
def get_plan(
    plan_id: str,
    service: StudyPlanApplicationService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> PersistedStudyPlan:
    """读取完整 Plan + Tasks（按 order 排序）。Plan 不存在 → 404。"""
    plan = service.get_plan(plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="study plan not found")
    authorize_learning_scope(account, plan.learner_id, plan.course_id)
    return plan
