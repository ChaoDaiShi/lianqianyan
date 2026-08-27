"""考试系统 HTTP API。"""

from __future__ import annotations

from typing import NoReturn

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.auth.dependencies import authorize_learning_scope, optional_current_account
from app.auth.models import AuthAccount
from app.exams.ai_grading import AIAnswerGrader
from app.exams import (
    AnswerSaveOut,
    AnswerSaveRequest,
    AttemptActionRequest,
    AttemptOut,
    AttemptResultOut,
    AttemptStartRequest,
    AttemptSummaryOut,
    CatalogExamOut,
    ExamAnalyticsOut,
    ExamCreate,
    ExamGenerationRequest,
    ExamGenerationResult,
    ExamGenerationService,
    ExamNotFoundError,
    ExamOut,
    ExamService,
    ExamStateError,
    ExamUpdate,
    GenerationSourceNotFound,
    ManualGradeRequest,
    QuestionCreate,
    QuestionOut,
    QuestionTypeCreate,
    QuestionTypeOut,
    QuestionTypeUpdate,
    QuestionUpdate,
    ReviewQueueItemOut,
)

router = APIRouter(prefix="/exams", tags=["exams"])


def _service(db: Session = Depends(get_db)) -> ExamService:
    return ExamService(db)


def _raise_http(exc: Exception) -> NoReturn:
    if isinstance(exc, ExamNotFoundError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    if isinstance(exc, ExamStateError):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    if isinstance(exc, ValueError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)
        ) from exc
    raise exc


@router.post(
    "/generate",
    response_model=ExamGenerationResult,
    status_code=status.HTTP_201_CREATED,
)
async def generate_exam(
    payload: ExamGenerationRequest,
    db: Session = Depends(get_db),
) -> ExamGenerationResult:
    try:
        return await ExamGenerationService(db).generate(payload)
    except GenerationSourceNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except (ExamNotFoundError, ExamStateError, ValueError) as exc:
        _raise_http(exc)


@router.get("/question-types", response_model=list[QuestionTypeOut])
def list_question_types(
    include_archived: bool = False,
    service: ExamService = Depends(_service),
) -> list[QuestionTypeOut]:
    return service.list_question_types(include_archived=include_archived)


@router.post(
    "/question-types",
    response_model=QuestionTypeOut,
    status_code=status.HTTP_201_CREATED,
)
def create_question_type(
    payload: QuestionTypeCreate,
    service: ExamService = Depends(_service),
) -> QuestionTypeOut:
    try:
        return service.create_question_type(payload)
    except (ExamStateError, ValueError) as exc:
        _raise_http(exc)


@router.patch("/question-types/{question_type_id}", response_model=QuestionTypeOut)
def update_question_type(
    question_type_id: str,
    payload: QuestionTypeUpdate,
    service: ExamService = Depends(_service),
) -> QuestionTypeOut:
    try:
        return service.update_question_type(question_type_id, payload)
    except (ExamNotFoundError, ExamStateError, ValueError) as exc:
        _raise_http(exc)


@router.get("/questions", response_model=list[QuestionOut])
def list_questions(
    course_id: str = Query(min_length=1),
    include_archived: bool = False,
    service: ExamService = Depends(_service),
) -> list[QuestionOut]:
    try:
        return service.list_questions(
            course_id=course_id, include_archived=include_archived
        )
    except ExamNotFoundError as exc:
        _raise_http(exc)


@router.post(
    "/questions", response_model=QuestionOut, status_code=status.HTTP_201_CREATED
)
def create_question(
    payload: QuestionCreate,
    service: ExamService = Depends(_service),
) -> QuestionOut:
    try:
        return service.create_question(payload)
    except (ExamNotFoundError, ExamStateError, ValueError) as exc:
        _raise_http(exc)


@router.get("/questions/{question_id}", response_model=QuestionOut)
def get_question(
    question_id: str, service: ExamService = Depends(_service)
) -> QuestionOut:
    try:
        return service.get_question(question_id)
    except ExamNotFoundError as exc:
        _raise_http(exc)


@router.patch("/questions/{question_id}", response_model=QuestionOut)
def update_question(
    question_id: str,
    payload: QuestionUpdate,
    service: ExamService = Depends(_service),
) -> QuestionOut:
    try:
        return service.update_question(question_id, payload)
    except (ExamNotFoundError, ExamStateError, ValueError) as exc:
        _raise_http(exc)


@router.get("/catalog", response_model=list[CatalogExamOut])
def list_catalog(
    course_id: str = Query(min_length=1),
    learner_id: str = Query(min_length=1),
    service: ExamService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> list[CatalogExamOut]:
    authorize_learning_scope(account, learner_id, course_id)
    try:
        return service.list_catalog(course_id=course_id, learner_id=learner_id)
    except ExamNotFoundError as exc:
        _raise_http(exc)


@router.get("/results", response_model=list[AttemptSummaryOut])
def list_results(
    course_id: str = Query(min_length=1),
    learner_id: str = Query(min_length=1),
    service: ExamService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> list[AttemptSummaryOut]:
    authorize_learning_scope(account, learner_id, course_id)
    return service.list_results(course_id=course_id, learner_id=learner_id)


@router.get("/analytics", response_model=ExamAnalyticsOut)
def get_analytics(
    course_id: str = Query(min_length=1),
    learner_id: str = Query(min_length=1),
    service: ExamService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> ExamAnalyticsOut:
    authorize_learning_scope(account, learner_id, course_id)
    try:
        return service.build_analytics(course_id=course_id, learner_id=learner_id)
    except ExamNotFoundError as exc:
        _raise_http(exc)


@router.get("/review-queue", response_model=list[ReviewQueueItemOut])
def list_review_queue(
    course_id: str | None = None,
    service: ExamService = Depends(_service),
) -> list[ReviewQueueItemOut]:
    return service.list_review_queue(course_id=course_id)


@router.patch("/answers/{answer_id}/grade", response_model=AttemptSummaryOut)
def grade_manual_answer(
    answer_id: str,
    payload: ManualGradeRequest,
    service: ExamService = Depends(_service),
) -> AttemptSummaryOut:
    try:
        return service.grade_manual_answer(answer_id, payload)
    except (ExamNotFoundError, ExamStateError, ValueError) as exc:
        _raise_http(exc)


@router.get("/attempts/{attempt_id}", response_model=AttemptOut)
def get_attempt(
    attempt_id: str,
    learner_id: str = Query(min_length=1),
    service: ExamService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> AttemptOut:
    authorize_learning_scope(account, learner_id)
    try:
        return service.get_attempt(attempt_id, learner_id)
    except (ExamNotFoundError, ExamStateError) as exc:
        _raise_http(exc)


@router.put(
    "/attempts/{attempt_id}/answers/{question_id}", response_model=AnswerSaveOut
)
def save_answer(
    attempt_id: str,
    question_id: str,
    payload: AnswerSaveRequest,
    service: ExamService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> AnswerSaveOut:
    authorize_learning_scope(account, payload.learner_id)
    try:
        return service.save_answer(
            attempt_id, payload.learner_id, question_id, payload.answer
        )
    except (ExamNotFoundError, ExamStateError, ValueError) as exc:
        _raise_http(exc)


@router.post("/attempts/{attempt_id}/submit", response_model=AttemptSummaryOut)
async def submit_attempt(
    attempt_id: str,
    payload: AttemptActionRequest,
    service: ExamService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> AttemptSummaryOut:
    authorize_learning_scope(account, payload.learner_id)
    try:
        summary = service.submit_attempt(attempt_id, payload.learner_id)
        grader = AIAnswerGrader()
        for item in service.list_ai_review_items(attempt_id):
            grade = await grader.grade(
                prompt=item.prompt,
                reference_answer=item.reference_answer,
                keywords=item.keywords,
                student_answer=item.student_answer,
            )
            summary = service.grade_ai_answer(item.answer_id, grade)
        return summary
    except (ExamNotFoundError, ExamStateError) as exc:
        _raise_http(exc)


@router.get("/attempts/{attempt_id}/result", response_model=AttemptResultOut)
def get_result(
    attempt_id: str,
    learner_id: str = Query(min_length=1),
    service: ExamService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> AttemptResultOut:
    authorize_learning_scope(account, learner_id)
    try:
        return service.get_result(attempt_id, learner_id)
    except (ExamNotFoundError, ExamStateError) as exc:
        _raise_http(exc)


@router.get("", response_model=list[ExamOut])
def list_exams(
    course_id: str = Query(min_length=1),
    service: ExamService = Depends(_service),
) -> list[ExamOut]:
    try:
        return service.list_exams(course_id=course_id)
    except ExamNotFoundError as exc:
        _raise_http(exc)


@router.post("", response_model=ExamOut, status_code=status.HTTP_201_CREATED)
def create_exam(
    payload: ExamCreate,
    service: ExamService = Depends(_service),
) -> ExamOut:
    try:
        return service.create_exam(payload)
    except (ExamNotFoundError, ExamStateError, ValueError) as exc:
        _raise_http(exc)


@router.get("/{exam_id}", response_model=ExamOut)
def get_exam(exam_id: str, service: ExamService = Depends(_service)) -> ExamOut:
    try:
        return service.get_exam(exam_id)
    except ExamNotFoundError as exc:
        _raise_http(exc)


@router.patch("/{exam_id}", response_model=ExamOut)
def update_exam(
    exam_id: str,
    payload: ExamUpdate,
    service: ExamService = Depends(_service),
) -> ExamOut:
    try:
        return service.update_exam(exam_id, payload)
    except (ExamNotFoundError, ExamStateError, ValueError) as exc:
        _raise_http(exc)


@router.post("/{exam_id}/publish", response_model=ExamOut)
def publish_exam(
    exam_id: str, service: ExamService = Depends(_service)
) -> ExamOut:
    try:
        return service.publish_exam(exam_id)
    except (ExamNotFoundError, ExamStateError, ValueError) as exc:
        _raise_http(exc)


@router.post(
    "/{exam_id}/attempts",
    response_model=AttemptOut,
    status_code=status.HTTP_201_CREATED,
)
def start_attempt(
    exam_id: str,
    payload: AttemptStartRequest,
    service: ExamService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> AttemptOut:
    authorize_learning_scope(account, payload.learner_id)
    try:
        return service.start_attempt(exam_id, payload.learner_id)
    except (ExamNotFoundError, ExamStateError, ValueError) as exc:
        _raise_http(exc)
