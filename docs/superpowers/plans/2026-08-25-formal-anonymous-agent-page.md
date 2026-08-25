# Formal Anonymous Agent Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. The user explicitly prohibited subagents, so all steps run inline in the current workspace. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the competition demo runtime and deliver a real, no-login, anonymous EducationMind experience with a host-embeddable agent page.

**Architecture:** Resolve one immutable learner context at application bootstrap from validated host configuration or a persisted browser UUID, and route every frontend workflow through it. Seed only catalog data on the API, treat an absent external model as unavailable with an honestly labelled grounded fallback, and expose a dedicated `/agent` UI plus explicit CORS configuration for host platforms.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, Vitest, Axios, FastAPI, Pydantic Settings, SQLAlchemy, pytest, SQLite.

## Global Constraints

- Use `pnpm` only for frontend commands.
- Do not implement login, registration, password recovery, or RBAC.
- An anonymous learner ID is a data partition key, not an authentication credential.
- Do not create learner mastery, evidence, plans, attempts, or chat state during application startup.
- Do not fabricate profile, search, resource, exam, or LLM results when a service is unavailable.
- Never edit, stage, or package `docs/创新赛道——开发日志参考模板.docx`.
- Never commit local Live2D assets, secrets, or runtime SQLite files.
- Backend tests must use the temporary database configured by `apps/api/tests/conftest.py`.
- Use test-first red/green/refactor cycles for every behavior change.

---

### Task 1: Runtime configuration and persistent anonymous learner context

**Files:**
- Create: `src/config/runtime.ts`
- Create: `src/config/runtime.test.ts`
- Create: `src/config/learnerContext.ts`
- Create: `src/config/learnerContext.test.ts`
- Modify: `src/vite-env.d.ts`
- Modify: `src/lib/api.ts`
- Test: `src/lib/educationApi.test.ts`

**Interfaces:**
- Produces: `RuntimeConfig`, `HostRuntimeConfig`, `resolveRuntimeConfig()`, `getRuntimeConfig()`.
- Produces: `LearnerContext`, `resolveLearnerContext()`, `ACTIVE_LEARNER_ID`, `ACTIVE_COURSE_ID`.
- Consumes: `window.__EDUCATIONMIND_CONFIG__`, `import.meta.env.VITE_EDUCATION_API_URL`, `Storage`, and `crypto.randomUUID()`.

- [ ] **Step 1: Write failing runtime and learner-context tests**

```ts
it('prefers a valid host learner and API URL', () => {
  expect(resolveRuntimeConfig({
    host: { learnerId: 'platform:user-42', courseId: 'course-os', apiBaseUrl: 'https://api.example.com/' },
    envApiBaseUrl: '',
  })).toMatchObject({
    hostLearnerId: 'platform:user-42',
    courseId: 'course-os',
    apiBaseUrl: 'https://api.example.com',
  });
});

it('creates and reuses a browser anonymous id', () => {
  const storage = new MemoryStorage();
  const first = resolveLearnerContext({ runtime: DEFAULT_RUNTIME, storage, randomUUID: () => UUID });
  const second = resolveLearnerContext({ runtime: DEFAULT_RUNTIME, storage, randomUUID: () => 'unused' });
  expect(first.learnerId).toBe(`anon:${UUID}`);
  expect(second).toEqual(first);
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `pnpm test --run src/config/runtime.test.ts src/config/learnerContext.test.ts`

Expected: FAIL because both modules and exported functions do not exist.

- [ ] **Step 3: Implement validation and stable context resolution**

```ts
export interface HostRuntimeConfig {
  learnerId?: string;
  courseId?: string;
  apiBaseUrl?: string;
}

export interface RuntimeConfig {
  hostLearnerId: string | null;
  courseId: string;
  apiBaseUrl: string;
}

export interface LearnerContext {
  learnerId: string;
  courseId: string;
  source: 'host' | 'browser';
}
```

Use `educationmind.anonymous-learner-id.v1` as the only localStorage key. Accept IDs matching `^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$`; trim one trailing slash from API URLs; reject non-HTTP absolute protocols.

- [ ] **Step 4: Make the API client consume runtime `apiBaseUrl`**

```ts
export const apiClient = new ApiClient(getRuntimeConfig().apiBaseUrl);
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `pnpm test --run src/config/runtime.test.ts src/config/learnerContext.test.ts src/lib/educationApi.test.ts`

Expected: all selected tests pass.

- [ ] **Step 6: Commit Task 1**

```powershell
git add -- src/config/runtime.ts src/config/runtime.test.ts src/config/learnerContext.ts src/config/learnerContext.test.ts src/vite-env.d.ts src/lib/api.ts src/lib/educationApi.test.ts
git commit -m "feat: add formal anonymous runtime context"
```

### Task 2: Route all learning workflows through the active context

**Files:**
- Modify: `src/store/useLearningStore.ts`
- Modify: `src/store/useWorkspaceStore.ts`
- Modify: `src/pages/Home.tsx`
- Modify: `src/pages/MyLearningPage.tsx`
- Modify: `src/pages/DiagnosisPage.tsx`
- Modify: `src/pages/KnowledgePage.tsx`
- Modify: `src/pages/LearningSpacePage.tsx`
- Modify: `src/pages/ReflectionPage.tsx`
- Modify: `src/pages/ArchivePage.tsx`
- Modify: `src/pages/XiaolianPage.tsx`
- Modify: `src/components/exam/ExamBuilder.tsx`
- Modify: `src/components/exam/ExamCatalog.tsx`
- Modify: `src/components/exam/ExamHistory.tsx`
- Modify: `src/components/exam/QuestionBank.tsx`
- Modify: `src/components/learning/ModulePractice.tsx`
- Modify: `src/components/learning/PracticeCard.tsx`
- Modify: `src/components/learning/SpaceTutor.tsx`
- Modify: `src/components/learning/useMasteryState.ts`
- Modify: `src/components/workshop/ResourceGenerator.tsx`
- Modify relevant `*.test.ts` and `*.test.tsx` files that mock the old store constants.

**Interfaces:**
- Consumes: `ACTIVE_LEARNER_ID`, `ACTIVE_COURSE_ID` from `@/config/learnerContext`.
- Removes: frontend production exports `DEMO_LEARNER_ID`, `DEMO_COURSE_ID`.

- [ ] **Step 1: Change one existing store test to expect active-context identity and verify RED**

```ts
expect(startLearning).toHaveBeenCalledWith(expect.objectContaining({
  learnerId: ACTIVE_LEARNER_ID,
}));
```

Run: `pnpm test --run src/store/useLearningStore.test.ts`

Expected: FAIL while the store still sends the fixed demo ID.

- [ ] **Step 2: Replace production fixed IDs with active-context imports**

Every request, filter and child prop must use the same pair:

```ts
import { ACTIVE_COURSE_ID, ACTIVE_LEARNER_ID } from '@/config/learnerContext';
```

Do not add page-local learner constants or query-string IDs.

- [ ] **Step 3: Update tests to mock the context module rather than production store exports**

```ts
vi.mock('@/config/learnerContext', () => ({
  ACTIVE_LEARNER_ID: 'anon:test-learner',
  ACTIVE_COURSE_ID: 'course-os',
}));
```

- [ ] **Step 4: Prove fixed demo identity is gone from frontend production code**

Run: `git grep -n -I -E "DEMO_LEARNER_ID|DEMO_COURSE_ID|demo-user-001" -- src ':!src/**/*.test.ts' ':!src/**/*.test.tsx'`

Expected: no output and exit code 1.

- [ ] **Step 5: Run the affected frontend suite and verify GREEN**

Run: `pnpm test --run src/store src/pages src/components`

Expected: all selected tests pass.

- [ ] **Step 6: Commit Task 2**

```powershell
git add -- src
git commit -m "refactor: isolate learning data by anonymous context"
```

### Task 3: Remove competition pages and add the embeddable agent page

**Files:**
- Modify: `src/router/routeManifest.test.ts`
- Modify: `src/router/routeManifest.ts`
- Create: `src/pages/AgentPage.tsx`
- Create: `src/pages/AgentPage.test.tsx`
- Modify: `src/pages/XiaolianPage.tsx`
- Modify: `src/pages/XiaolianSpeech.test.tsx`
- Modify: `src/pages/PlaceholderPages.tsx`
- Modify: `src/pages/ExamPage.tsx`
- Modify: `src/pages/ExamPage.test.tsx`
- Delete: `src/pages/DemoPage.tsx`
- Delete: `src/pages/ShowcasePage.tsx`
- Delete: `src/components/showcase/DemoStoryStep.tsx`
- Delete: `src/components/showcase/AgentCapabilityMap.tsx`
- Modify: `src/components/index.ts`

**Interfaces:**
- Produces: `XiaolianWorkspace` reusable conversation component.
- Produces: route `/#/agent` rendering without `AppShell`, `LearningRail` or the full top bar.
- Keeps: `/#/xiaolian` rendering `XiaolianWorkspace` inside `AppShell`.

- [ ] **Step 1: Update route and agent-page tests and verify RED**

```ts
expect(currentPaths()).toContain('/agent');
expect(currentPaths()).not.toContain('/demo');
expect(currentPaths()).not.toContain('/showcase');
```

Agent page assertion:

```tsx
const html = renderToStaticMarkup(<MemoryRouter><AgentPage /></MemoryRouter>);
expect(html).toContain('独立智能体');
expect(html).not.toContain('学习星轨');
```

Run: `pnpm test --run src/router/routeManifest.test.ts src/pages/AgentPage.test.tsx`

Expected: route test fails and AgentPage import is missing.

- [ ] **Step 2: Extract `XiaolianWorkspace` and add `AgentPage`**

```tsx
export function XiaolianWorkspace({ embedded = false }: { embedded?: boolean }) {
  // shared chat state and UI
}

export function XiaolianPage() {
  return <AppShell><XiaolianWorkspace /></AppShell>;
}

export function AgentPage() {
  return <main data-agent-embed="true"><XiaolianWorkspace embedded /></main>;
}
```

The embedded page must remain responsive from 320px upward and must expose the same speech, tool-trace and source UI.

- [ ] **Step 3: Remove demo/showcase routes, files and public copy**

Keep the real capability center, but remove links to deleted routes and rename copy from competition/demo language to integration/data-boundary language.

- [ ] **Step 4: Replace the exam warning with the real anonymous boundary**

Required meaning: the current browser/platform opaque ID partitions data; there is no account permission or invigilation guarantee; do not enter sensitive personal information.

- [ ] **Step 5: Run routes and page tests and verify GREEN**

Run: `pnpm test --run src/router/routeManifest.test.ts src/pages/AgentPage.test.tsx src/pages/XiaolianSpeech.test.tsx src/pages/ExamPage.test.tsx`

Expected: all selected tests pass.

- [ ] **Step 6: Commit Task 3**

```powershell
git add -A -- src
git commit -m "feat: replace competition demo with embeddable agent page"
```

### Task 4: Replace production demo seed with catalog-only seed

**Files:**
- Modify: `apps/api/app/core/seed.py`
- Modify: `apps/api/app/main.py`
- Create: `apps/api/tests/fixtures.py`
- Modify: `apps/api/tests/test_health.py`
- Modify all API tests importing `DEMO_LEARNER_ID` or `seed_demo_data`.

**Interfaces:**
- Produces: `DEFAULT_COURSE_ID`, `CATALOG_COURSES`, `CATALOG_KNOWLEDGE_POINTS`, `seed_catalog_data(db: Session) -> None`.
- Test-only produces: `TEST_LEARNER_ID`, `seed_test_data(db: Session) -> None`.
- Removes production: `DEMO_LEARNER_ID`, `DEMO_MASTERY_BASELINE`, `seed_demo_data()`.

- [ ] **Step 1: Write failing startup seed test**

```py
def test_catalog_seed_creates_no_learner_state(db: Session) -> None:
    seed_catalog_data(db)
    assert db.query(Course).count() == 1
    assert db.query(KnowledgePoint).count() == 5
    assert db.query(MasteryRecord).count() == 0
    assert db.query(LearningEvidence).count() == 0
```

Run: `apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests/test_health.py::test_catalog_seed_creates_no_learner_state -q`

Expected: FAIL because `seed_catalog_data` does not exist and the old seed creates mastery rows.

- [ ] **Step 2: Implement catalog-only production seed**

```py
DEFAULT_COURSE_ID = "course-os"

def seed_catalog_data(db: Session) -> None:
    _seed_course_and_knowledge_points(db)
    db.commit()
```

Update lifespan to call `seed_catalog_data` and `seed_exam_data`. Neither may create a learner record or attempt.

- [ ] **Step 3: Move deterministic learner baselines into a test-only fixture**

`seed_test_data` first calls `seed_catalog_data`, then inserts the exact mastery rows legacy behavioral tests require under `TEST_LEARNER_ID = "test-learner-001"`.

- [ ] **Step 4: Mechanically rename test imports, identifiers and test descriptions**

Production tests may use mocks in the normal testing sense, but no test may import removed production demo learner symbols.

- [ ] **Step 5: Run seed and domain tests and verify GREEN**

Run: `apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests/test_health.py apps/api/tests/test_diagnosis.py apps/api/tests/test_study_planner.py -q`

Expected: selected tests pass and the catalog-only assertion remains zero-state.

- [ ] **Step 6: Prove demo learner symbols are absent from production**

Run: `git grep -n -I -E "DEMO_LEARNER_ID|DEMO_MASTERY_BASELINE|seed_demo_data|demo-user-001" -- apps/api/app`

Expected: no output and exit code 1.

- [ ] **Step 7: Commit Task 4**

```powershell
git add -- apps/api/app/core/seed.py apps/api/app/main.py apps/api/tests
git commit -m "refactor: seed catalog without fabricated learner state"
```

### Task 5: Honest LLM availability and explicit host CORS

**Files:**
- Create: `apps/api/app/llm/unavailable_provider.py`
- Delete: `apps/api/app/llm/mock_provider.py`
- Modify: `apps/api/app/llm/__init__.py`
- Modify: `apps/api/app/llm/status.py`
- Modify: `apps/api/app/domain/tutor.py`
- Modify: `apps/api/app/services/tutor_service.py`
- Modify: `apps/api/app/core/config.py`
- Modify: `apps/api/app/main.py`
- Modify: `apps/api/tests/test_openai_compatible_provider.py`
- Modify: `apps/api/tests/test_system_knowledge_api.py`
- Modify: `apps/api/tests/test_tutor.py`
- Create: `apps/api/tests/test_cors.py`
- Modify: `src/pages/XiaolianPage.tsx`

**Interfaces:**
- Produces: `UnavailableLLMProvider.name == "unavailable"`; `chat()` raises `LLMNotConfiguredError`.
- Produces: `Settings.cors_origins: str`; `Settings.allowed_cors_origins() -> list[str]`.
- Changes: unconfigured `GET /api/system/llm` response to `{ provider: "unavailable", model: null, configured: false }`.

- [ ] **Step 1: Write failing provider and CORS tests**

```py
def test_provider_selection_is_unavailable_without_complete_config(monkeypatch):
    clear_llm_environment(monkeypatch)
    get_settings.cache_clear()
    assert get_llm_provider().name == "unavailable"

def test_configured_origin_receives_cors_header(client):
    response = client.options(
        "/api/health",
        headers={"Origin": "https://host.example", "Access-Control-Request-Method": "GET"},
    )
    assert response.headers["access-control-allow-origin"] == "https://host.example"
```

Run: `apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests/test_openai_compatible_provider.py apps/api/tests/test_cors.py -q`

Expected: provider assertion fails with `mock`; CORS test fails without middleware/config.

- [ ] **Step 2: Add unavailable provider and preserve grounded fallback**

The existing deterministic fallback remains allowed only because it is computed from real `TutorContext` and retrieved course sources. It must return `source="fallback"`, `response_mode="fallback"`, `provider="unavailable"` and never call itself an LLM result.

- [ ] **Step 3: Parse CORS allowlist and register middleware**

Default origins: `http://localhost:5173`, `http://127.0.0.1:5173`. Trim whitespace, remove empty values and duplicates, reject wildcard when credentials are enabled.

- [ ] **Step 4: Update frontend status language**

Configured state shows provider/model. Unconfigured state shows “外部模型未配置，当前回答由课程材料与学习记录生成” and response cards retain the `基础辅导模式` badge.

- [ ] **Step 5: Run provider, tutor, system and CORS tests and verify GREEN**

Run: `apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests/test_openai_compatible_provider.py apps/api/tests/test_system_knowledge_api.py apps/api/tests/test_tutor.py apps/api/tests/test_agents.py apps/api/tests/test_cors.py -q`

Expected: all selected tests pass.

- [ ] **Step 6: Commit Task 5**

```powershell
git add -A -- apps/api/app apps/api/tests src/pages/XiaolianPage.tsx src/pages/XiaolianSpeech.test.tsx
git commit -m "feat: expose honest model status and embed CORS"
```

### Task 6: Safe legacy demo-data migration and deployment documentation

**Files:**
- Create: `apps/api/scripts/remove_legacy_demo_learner.py`
- Create: `apps/api/tests/test_remove_legacy_demo_learner.py`
- Replace: `README.md`
- Modify: `src/pages/PlaceholderPages.tsx`

**Interfaces:**
- Produces CLI: `python scripts/remove_legacy_demo_learner.py --database <absolute.db> [--apply]`.
- Dry run outputs table counts and exits without changing mtime/content.
- Apply creates `<name>.pre-anonymous-<UTC timestamp>.bak`, deletes only records linked to exact `demo-user-001`, commits, then prints remaining counts.

- [ ] **Step 1: Write failing dry-run/apply tests against a temporary SQLite file**

```py
def test_dry_run_does_not_write_database(tmp_path):
    before = sha256(database_path)
    report = remove_legacy_demo_learner(database_path, apply=False)
    assert report.total_matches > 0
    assert sha256(database_path) == before

def test_apply_backs_up_and_preserves_other_learners(tmp_path):
    report = remove_legacy_demo_learner(database_path, apply=True)
    assert report.backup_path.exists()
    assert count_for("demo-user-001") == 0
    assert count_for("anon:keep-me") > 0
```

Run: `apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests/test_remove_legacy_demo_learner.py -q`

Expected: FAIL because the script does not exist.

- [ ] **Step 2: Implement allowlisted table cleanup with mandatory backup**

Reject directories, non-SQLite URLs, missing files, relative paths and paths outside the explicitly supplied file. Use SQLite backup API or `shutil.copy2` only after closing read handles. Delete in foreign-key-safe order and re-query every allowlisted table.

- [ ] **Step 3: Replace README with the current formal deployment contract**

Document:

- no-login anonymous semantics and limitations;
- `/#/agent` iframe/WebView integration;
- `window.__EDUCATIONMIND_CONFIG__` example;
- `VITE_EDUCATION_API_URL`, `EDUCATION_CORS_ORIGINS`, database and real LLM settings;
- exact local run, test, build and migration commands;
- no-fabrication and privacy boundaries;
- no claim of RBAC, invigilation or cross-device identity.

- [ ] **Step 4: Run migration tests and current-copy grep**

Run: `apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests/test_remove_legacy_demo_learner.py -q`

Run: `git grep -n -I -E "比赛展示|三分钟演示|单学习者演示|本地演示|Mock Provider" -- README.md src apps/api/app`

Expected: tests pass; grep returns no current product/runtime claims.

- [ ] **Step 5: Inventory local runtime databases without writing**

Record full path, length, UTC mtime and SHA-256 for `education.db` and `apps/api/education.db`. Run the migration CLI in dry-run mode against each existing file and retain its exact report for final verification.

- [ ] **Step 6: Apply exact legacy cleanup only when dry-run finds matching rows**

The user explicitly requested complete demo withdrawal. For each file with matches, run `--apply`, verify backup hash equals the pre-migration database hash, verify zero remaining legacy rows, and keep the backup. If no matches exist, do not rewrite the file.

- [ ] **Step 7: Commit Task 6 without databases, backups or the user DOCX**

```powershell
git add -- apps/api/scripts/remove_legacy_demo_learner.py apps/api/tests/test_remove_legacy_demo_learner.py README.md src/pages/PlaceholderPages.tsx
git commit -m "docs: prepare anonymous agent deployment and data retirement"
```

### Task 7: Full verification and release evidence

**Files:**
- Create: `docs/verification/2026-08-25-formal-anonymous-agent-page.md`
- Modify only files required by a reproduced failing test.

**Interfaces:**
- Consumes all prior tasks.
- Produces a dated verification record with commands, outputs, limitations and protected-file checks.

- [ ] **Step 1: Snapshot protected runtime and user files**

Record Git status, branch, HEAD, hashes/metadata of runtime databases, presence/status of local Live2D assets, and the untracked DOCX path. Do not stage the DOCX.

- [ ] **Step 2: Run the full frontend unit suite**

Run: `pnpm test --run`

Expected: every Vitest file and test passes with no unhandled error.

- [ ] **Step 3: Run the required frontend gate**

Run: `pnpm check`

Expected: TypeScript and ESLint exit 0 with zero warnings.

- [ ] **Step 4: Build production assets**

Run: `pnpm build`

Expected: TypeScript and Vite exit 0. Record any chunk-size warning as a non-blocking packaging limitation only if it remains.

- [ ] **Step 5: Run the complete backend suite**

Run: `apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests -q`

Expected: all tests pass; only explicitly documented upstream deprecations may remain.

- [ ] **Step 6: Run live API smoke checks**

Start the API against a fresh temporary SQLite path. Verify `/api/health`, `/api/system/llm`, empty anonymous profile, one catalog/knowledge request, one grounded fallback chat, one learning evidence write, and CORS preflight from an allowed origin. Stop the process and delete only the validated temporary database.

- [ ] **Step 7: Run browser QA for both product shapes**

Start API and Vite, then inspect `/`, `/#/agent` and a 390px viewport. Verify stable anonymous ID across refresh, no demo/showcase links, no fake initial mastery, agent response labelling, speech controls, Live2D visibility/failure behavior, console/page/request/HTTP errors, and absence of unexpected writes.

- [ ] **Step 8: Recompare protected files and write verification record**

Runtime databases may differ only by the explicitly backed-up legacy-data migration; frontend/backend tests must not change them. DOCX hash/status and local Live2D asset status must be unchanged.

- [ ] **Step 9: Run final repository checks and commit evidence**

Run: `git diff --check`

Run: `git status --short`

Stage only the verification record and intentional source/docs changes, then:

```powershell
git commit -m "docs: verify formal anonymous agent release"
```
