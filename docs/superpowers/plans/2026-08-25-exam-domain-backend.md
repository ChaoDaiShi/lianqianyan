# Exam Domain Backend Implementation Plan

> Execute inline under the existing user authorization. Use strict red-green-refactor; all database tests use temporary SQLite and never touch runtime `education.db`.

**Goal:** Deliver a persistent, resumable, safely graded exam domain with custom question types/questions and learning-evidence integration.

**Architecture:** SQLAlchemy entities and Pydantic contracts live in `app/exams`; a pure grading module handles deterministic scoring; `ExamService` owns state transitions and transaction boundaries; a thin FastAPI router maps domain errors to HTTP responses.

**Tech Stack:** Python 3.11+, FastAPI, Pydantic 2, SQLAlchemy 2, pytest.

## Task 1: Pure custom-type and grading policies

**Files:**
- Create `apps/api/app/exams/models.py`
- Create `apps/api/app/exams/grading.py`
- Create `apps/api/app/exams/__init__.py`
- Test `apps/api/tests/test_exam_grading.py`

- [ ] Write failing tests for the response/grading compatibility matrix, option validation, exact text normalization, unordered multi-choice equality, boolean grading, keyword partial credit, and manual pending state.
- [ ] Implement bounded Pydantic requests and a pure `grade_answer` function; never execute user content.
- [ ] Run `uv run --project apps/api pytest apps/api/tests/test_exam_grading.py -q` and commit the passing slice.

## Task 2: Persistence and service state machine

**Files:**
- Create `apps/api/app/exams/entities.py`
- Create `apps/api/app/exams/repository.py`
- Create `apps/api/app/exams/service.py`
- Modify `apps/api/app/domain/models.py`
- Modify `apps/api/app/services/evidence_classification.py`
- Test `apps/api/tests/test_exam_service.py`

- [ ] Write failing temporary-database tests for custom types/questions, draft edits, publish validation, published immutability, start/resume, sanitized attempt questions, autosave, expiry, idempotent submit, manual review, manual grading, and exactly-once evidence projection.
- [ ] Add exam entities and constraints; ensure importing `app.exams` registers tables before `Base.metadata.create_all`.
- [ ] Implement repository queries without commits; implement `ExamService` with one commit per business action and rollback on failure.
- [ ] Add `exam_answer_evaluated` / `exam_system` to the centralized evidence classification and project only graded answers with a knowledge point.
- [ ] Run focused service tests and existing evidence/projection tests, then commit.

## Task 3: API contracts and analytics

**Files:**
- Create `apps/api/app/api/routes/exams.py`
- Modify `apps/api/app/api/__init__.py`
- Test `apps/api/tests/test_exam_api.py`

- [ ] Write failing contract tests for every authoring, catalog, attempt, result, review and analytics endpoint.
- [ ] Assert student endpoints contain no `correct_answer`, `keywords` or `explanation` before submission.
- [ ] Implement thin routes with explicit response models and stable 404/409 mapping.
- [ ] Add real attempt analytics by learner/course and knowledge point; empty analytics must use null metrics rather than fabricated zero performance.
- [ ] Run focused tests, then full backend pytest, and commit.

