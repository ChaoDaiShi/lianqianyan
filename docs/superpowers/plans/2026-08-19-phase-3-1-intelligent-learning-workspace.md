# Phase 3-1 Intelligent Learning Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete and verify the authentic EducationMind competition demo from Dashboard through learning, Tutor assistance, practice-driven mastery updates, and the learning report.

**Architecture:** Preserve the tested FastAPI current-plan lifecycle and accepted learning algorithms. Close frontend product gaps through the existing API client, lightweight hooks, Zustand workspace context, and centralized demo education content, then validate the real state loop in a browser against a temporary SQLite database.

**Tech Stack:** React 18, TypeScript, Vite 5, React Router hash routing, Zustand, Tailwind CSS, Axios, FastAPI, Pydantic, SQLAlchemy, SQLite, pytest, pnpm, uv.

## Global Constraints

- Use `pnpm` only for frontend commands.
- Run `pnpm check`, `pnpm build`, and `uv run pytest` before completion.
- Do not modify MasteryUpdatePolicy, KnowledgeDiagnosisPolicy, PriorityPolicy, LearnerProfileService, DiagnosisService, StudyPlannerPolicy, StudyPlannerService, StudyPlanPersistenceService, or TutorContextBuilder.
- Do not change the database schema.
- Preserve `GET /api/plans/current` and unique ACTIVE-plan behavior; remove only competition-irrelevant plan-history UI.
- Profile, Diagnosis, StudyPlan, Tutor answers, Practice results, and learning-state changes must come from the API without mock fallback.
- Static frontend data is limited to teaching content, fixed questions, shortcut questions, and deterministic presentation copy.
- Practice success refetches Profile and Diagnosis but never generates a plan automatically.
- Do not add Multi-Agent runtime, MCP runtime/tools, RAG, Dynamic Replanning, payment, membership, orders, or unrelated administration features.
- Optimize the UI for 1440×900 and 1920×1080 and keep 1024px+ intact.

---

## File Structure

- `src/components/learning/useStartPlanTask.ts`: one task-entry action that stores workspace context, records `learning_started`, and navigates with refresh-safe query parameters.
- `src/components/home/TodayPlanCard.tsx`: top-three current-plan tasks and explicit generation using the shared entry action.
- `src/pages/MyLearningPage.tsx`: current-plan-only timeline and explicit generation/replanning.
- `src/pages/LearningSpacePage.tsx`: honest no-selection state, selected task resolution, learning content, Tutor, practice, and refetch loop.
- `src/components/learning/ModulePractice.tsx`: true API evaluation result and visible Profile/Diagnosis refresh status.
- `src/lib/hooks.ts`: safe async request lifecycle and reusable Tutor/current-plan reads.
- `README.md`: current competition capabilities, real/mock boundary, and non-automatic replanning wording.
- `.project.md`: Phase 3-1 product record and verified current behavior.
- `docs/superpowers/specs/2026-08-19-phase-3-1-intelligent-learning-workspace-design.md`: approved design source.

### Task 1: Establish a clean frontend baseline

**Files:**
- Test: existing TypeScript and ESLint project
- Test: existing FastAPI test suite

**Interfaces:**
- Consumes: existing source tree at baseline commit `ca8132d`
- Produces: recorded baseline failures or a confirmed clean starting point

- [ ] **Step 1: Run frontend quality gate**

Run: `pnpm check`

Expected: TypeScript and ESLint pass. If a failure exists, record the exact file and fix only the blocking defect in the task that owns that file.

- [ ] **Step 2: Run frontend production build**

Run: `pnpm build`

Expected: `tsc` and Vite production build pass.

- [ ] **Step 3: Run backend tests**

Run from `apps/api`: `uv run pytest`

Expected: all current tests pass; the actual count becomes the report baseline.

### Task 2: Make plan-task entry authentic and reusable

**Files:**
- Create: `src/components/learning/useStartPlanTask.ts`
- Modify: `src/components/home/TodayPlanCard.tsx`
- Modify: `src/pages/MyLearningPage.tsx`
- Modify: `src/pages/LearningSpacePage.tsx`

**Interfaces:**
- Consumes: `useLearningStore.start({ source, knowledgePointId, courseId, topic })`, `useWorkspaceStore.setContext`, `PersistedStudyPlan`, `PersistedStudyTask`
- Produces: `useStartPlanTask(): { startTask(plan, task): Promise<void>; startingTaskId: string | null; error: string | null }`

- [ ] **Step 1: Implement the shared task-entry hook**

The hook must set `{ planId, taskId, knowledgePointId }`, call `POST /api/learning/start` with `source: 'current_study_plan'`, and navigate only after success:

```ts
export function useStartPlanTask() {
  const navigate = useNavigate();
  const startLearning = useLearningStore((state) => state.start);
  const setContext = useWorkspaceStore((state) => state.setContext);
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startTask = useCallback(async (plan: PersistedStudyPlan, task: PersistedStudyTask) => {
    setStartingTaskId(task.id);
    setError(null);
    const result = await startLearning({
      source: 'current_study_plan',
      courseId: plan.courseId,
      knowledgePointId: task.knowledgePointId,
      topic: task.knowledgePointName,
    });
    if (!result) {
      setError('暂时无法开始学习，请稍后重试。');
      setStartingTaskId(null);
      return;
    }
    setContext({ planId: plan.id, taskId: task.id, knowledgePointId: task.knowledgePointId });
    navigate(`/space?plan_id=${encodeURIComponent(plan.id)}&task_id=${encodeURIComponent(task.id)}&knowledge_point_id=${encodeURIComponent(task.knowledgePointId)}`);
    setStartingTaskId(null);
  }, [navigate, setContext, startLearning]);

  return { startTask, startingTaskId, error };
}
```

- [ ] **Step 2: Replace duplicated task navigation**

Use the shared hook in Dashboard and My Learning. Disable only the active task button while `startingTaskId === task.id`; show an inline retryable error if starting evidence cannot be recorded.

- [ ] **Step 3: Standardize workspace query names**

Read `plan_id`, `task_id`, and `knowledge_point_id` in `LearningSpacePage`. Keep the Zustand context as an in-session fallback.

- [ ] **Step 4: Verify frontend types and lint**

Run: `pnpm check`

Expected: PASS.

- [ ] **Step 5: Commit task entry changes**

```bash
git add src/components/learning/useStartPlanTask.ts src/components/home/TodayPlanCard.tsx src/pages/MyLearningPage.tsx src/pages/LearningSpacePage.tsx
git commit -m "Complete authentic study task entry"
```

### Task 3: Correct current-plan competition semantics

**Files:**
- Modify: `src/pages/MyLearningPage.tsx`
- Modify: `src/pages/LearningSpacePage.tsx`
- Modify: `src/components/home/TodayPlanCard.tsx`

**Interfaces:**
- Consumes: `useCurrentPlan(learnerId, courseId)` returning `{ summary, plan, loading, error, refetch, generate, generating }`
- Produces: current-plan-only My Learning UI and an honest workspace empty-selection state

- [ ] **Step 1: Remove plan-history presentation**

Delete `usePlanHistory`, history icons/state, and the history list from My Learning. Retain the explicit “重新规划” action and label it as replacing the existing current plan, not dynamic replanning.

- [ ] **Step 2: Stop silently selecting the first task**

Resolve a workspace task only when `task_id` or `knowledge_point_id` is present in URL/store. Direct `/#/space` must render “请选择一个学习任务开始” and list current-plan tasks. It must not render the first task as active before the learner chooses it.

- [ ] **Step 3: Keep explicit plan generation only**

Dashboard and My Learning may call `generate()` only from button handlers. No mount effect may call `POST /api/plans/generate`.

- [ ] **Step 4: Tighten competition copy**

Use “当前学习计划” or “最新学习计划” consistently; avoid claims of automatic dynamic replanning. Preserve empty-plan messaging for a valid current plan with zero tasks.

- [ ] **Step 5: Verify frontend gate**

Run: `pnpm check`

Expected: PASS.

### Task 4: Harden practice-to-state feedback

**Files:**
- Modify: `src/components/learning/ModulePractice.tsx`
- Modify: `src/pages/LearningSpacePage.tsx`

**Interfaces:**
- Consumes: `evaluatePractice(request): Promise<PracticeEvaluationResponse>` and refetch callbacks for Profile and Diagnosis
- Produces: `onPracticeComplete: () => Promise<void>` and a visible state-refresh lifecycle

- [ ] **Step 1: Make the completion callback asynchronous**

Change the prop to:

```ts
interface ModulePracticeProps {
  knowledgePointName: string;
  questions: DemoQuestion[];
  onPracticeComplete?: () => Promise<void> | void;
}
```

Await it after the server evaluation succeeds so the UI does not claim the Profile is updated before reads complete.

- [ ] **Step 2: Expose Promise-returning refetch methods**

Update `AsyncState<T>.refetch` and the internal `useAsync` implementation to return `Promise<void>`. Preserve loading/error handling and ignore stale completion after unmount.

- [ ] **Step 3: Refetch Profile and Diagnosis together**

Pass:

```ts
onPracticeComplete={() => Promise.all([profile.refetch(), diagnosis.refetch()]).then(() => undefined)}
```

- [ ] **Step 4: Render truthful update feedback**

Keep server-returned `masteryBefore`, `masteryAfter`, and `confidence`. While refetching, display “正在刷新学习画像与诊断…”. After success, display “小涟已经记录这次学习结果，你的学习画像与诊断已更新。” If refetch fails, retain the valid practice result and offer a page-data retry instead of retracting the evaluation.

- [ ] **Step 5: Verify frontend gate**

Run: `pnpm check`

Expected: PASS.

### Task 5: Align documentation with the delivered product

**Files:**
- Modify: `README.md`
- Modify: `.project.md`

**Interfaces:**
- Consumes: verified current implementation and API semantics
- Produces: accurate public capability and project-phase documentation

- [ ] **Step 1: Rewrite the README capability summary**

State that the system supports learning profiles, structured diagnosis, diagnosis-driven current plans, intelligent learning workspace, contextual Tutor, practice-driven mastery updates, and a first learning report. State that MockTutorProvider remains the default fallback unless a real provider is configured.

- [ ] **Step 2: Correct the learning-loop wording**

Use:

```text
学习目标 → 学习诊断 → 个性化规划 → 学习执行 → AI 辅导
→ 练习反馈 → 学习状态更新 → 为后续重规划提供最新学习状态
```

Do not claim automatic dynamic plan adjustment.

- [ ] **Step 3: Remove stale feature claims**

Remove statements that the workspace is incomplete, that learning state is primarily frontend Mock data, or that My Learning exposes plan history. Preserve explicit non-implementation statements for Multi-Agent, MCP, RAG, Dynamic Replanning, real LLM configuration, and Digital Human.

- [ ] **Step 4: Add Phase 3-1 to `.project.md`**

Record Dashboard, Current Plan, Learning Workspace, Embedded Tutor, Practice Feedback, Learning Report, and E2E. Preserve historical notes but make the top-level current-state section authoritative.

- [ ] **Step 5: Run pollution search**

Search source and active product documentation for `payment|nuwax|datatable|checkout|billing|subscription|order_id|is_paid`.

Expected: no active product implementation or generated integration. Any matches in explicit historical “not implemented” statements must be reported separately rather than silently described as clean.

### Task 6: Run the full automated verification gate

**Files:**
- Test: frontend workspace
- Test: `apps/api/tests`

**Interfaces:**
- Consumes: all implementation tasks
- Produces: captured command evidence for the final report

- [ ] **Step 1: Run frontend check**

Run: `pnpm check`

Expected: PASS.

- [ ] **Step 2: Run frontend production build**

Run: `pnpm build`

Expected: PASS with Vite output generated in `dist/`.

- [ ] **Step 3: Run backend tests**

Run from `apps/api`: `uv run pytest`

Expected: all tests pass; record exact count.

- [ ] **Step 4: Inspect the final diff**

Run: `git diff --check` and `git status --short`.

Expected: no whitespace errors and only intended Phase 3-1 files changed.

### Task 7: Execute the real browser competition demo

**Files:**
- Runtime only: temporary SQLite database outside tracked source
- Runtime only: Vite and FastAPI processes

**Interfaces:**
- Consumes: FastAPI routes through Vite `/api` proxy and seeded `demo-user-001` / `course-os`
- Produces: observed network requests and UI state for all eight scenarios

- [ ] **Step 1: Start FastAPI with a temporary database**

Use the configured database environment variable and `uv run uvicorn app.main:app --port 8000` from `apps/api`. The temporary database must be disposable and must not replace the stable ignored demo database.

- [ ] **Step 2: Start Vite**

Run: `pnpm dev --host 127.0.0.1`

Expected: browser-reachable local Vite URL and working `/api` proxy.

- [ ] **Step 3: Verify Dashboard at 1440×900**

Confirm real Profile, Diagnosis, and current plan states; no `0%`/`NaN%` for null aggregate mastery; no mock fallback when API is unavailable.

- [ ] **Step 4: Verify explicit plan generation when needed**

If no current plan exists, click “生成学习计划” and confirm `POST /api/plans/generate` followed by real tasks. If the seeded environment already has a plan, verify generation through My Learning’s explicit “重新规划” only if a resettable database is in use.

- [ ] **Step 5: Verify task start and learning evidence**

Click the deadlock task. Confirm `POST /api/learning/start`, URL task context, and workspace header showing deadlock, remediate label, 35 minutes, real mastery, and real status.

- [ ] **Step 6: Verify contextual Tutor**

Ask “为什么我总学不会死锁？”. Confirm `POST /api/tutor/chat`, a returned answer, and context badges reflecting backend `context_used`. Do not require a real provider; record Mock or fallback truthfully.

- [ ] **Step 7: Verify practice and state refresh**

Answer the fixed deadlock question, confirm `POST /api/practice/evaluate`, record server-returned `mastery_before` and `mastery_after`, and observe refreshed Profile/Diagnosis state in the workspace.

- [ ] **Step 8: Verify Dashboard and Report read the mutation**

Return to `/#/` and then `/#/archive`. Confirm fresh Profile/Diagnosis values and current plan/report content reflect the same backend state.

- [ ] **Step 9: Verify responsive integrity**

Repeat layout inspection at 1024px width. Confirm no overlapping primary controls, horizontal body overflow, or inaccessible task/Tutor/practice regions.

- [ ] **Step 10: Stop development servers**

Stop only the Vite and FastAPI processes started for this task. Leave unrelated processes untouched.

### Task 8: Review, commit, and report

**Files:**
- Review: all files changed since `a44df54`

**Interfaces:**
- Consumes: verified implementation and command/browser evidence
- Produces: final Sprint commit and the required Chinese Phase 3-1 report

- [ ] **Step 1: Run focused code review**

Review for correctness, duplicated task-entry logic, misleading mock/real copy, accidental automatic plan generation, and unrequested scope.

- [ ] **Step 2: Apply only verified findings**

Make minimal corrections and rerun the affected gate plus `pnpm check`.

- [ ] **Step 3: Stage intended files and inspect status**

Run `git status --short`, stage explicit paths, and inspect `git diff --cached --stat`.

- [ ] **Step 4: Commit the sprint**

```bash
git commit -m "Complete Phase 3-1 learning workspace sprint

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Produce the exact requested report**

Use the user-provided heading and sections. Report start commit `ca8132d`, ending commit, exact test counts, real browser observations, actual mastery before/after, provider source, changed-file count, clean/qualified pollution result, and recommend exactly one of A–E without implementing it.
