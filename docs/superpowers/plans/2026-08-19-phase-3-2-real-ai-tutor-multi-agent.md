# EducationMind Phase 3-2 Real AI Tutor & Multi-Agent Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic EducationAgentOrchestrator with Diagnosis, Planner, Tutor, and Assessment capabilities, an OpenAI-compatible provider with honest fallback metadata, and a real `/api/agents/chat` web path without changing the learner-state algorithms or database schema.

**Architecture:** Existing domain services remain the sole source of truth. A concentrated `apps/api/app/agents/` layer routes requests, wraps those services, and executes either one capability or the fixed Diagnosis → Planner → Tutor DAG; only Tutor calls an LLM. The old `/api/tutor/chat` remains compatible while XiaolianPage and SpaceTutor use the new agents endpoint.

**Tech Stack:** Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2, httpx, pytest, React 18, TypeScript, Vite, Tailwind CSS, Axios, pnpm.

## Global Constraints

- Use `pnpm` only for frontend commands.
- Run `pnpm check`, `pnpm build`, and `uv run --project apps/api pytest` before completion.
- Do not change database Schema or seed semantics.
- Do not add LangGraph, CrewAI, AutoGen, MCP, RAG, Vector DB, Knowledge Graph, Dynamic Replanning, Conversation Persistence, Digital Human, TTS, payment, membership, order, or teacher-admin features.
- Agents wrap existing services; they must not recalculate mastery, weak points, priority ordering, plans, or evaluation projections.
- Mastery writes remain exclusive to `PracticeEvaluationService`; AssessmentAgent is read-only.
- Planner reads Current Plan for ordinary questions and generates only after an explicit generation request.
- API keys come only from environment variables; never hardcode, commit `.env`, or log complete keys.
- Multi-agent collaboration executes structured Diagnosis and Planner services and at most one LLM call through Tutor.
- Only actually executed agents appear in `agent_trace`.
- New UI reuses existing components and preserves the Phase 3-1 layout and stable demo seed.

---

## File Map

### Backend files

- Create `apps/api/app/agents/__init__.py`: public agent-domain exports.
- Create `apps/api/app/agents/base.py`: capabilities, request/result/trace/provider metadata models and shared protocols.
- Create `apps/api/app/agents/router.py`: explicit-capability and deterministic keyword routing.
- Create `apps/api/app/agents/diagnosis_agent.py`: read-only wrapper around Profile and Diagnosis services.
- Create `apps/api/app/agents/planner_agent.py`: current-plan reader and explicit plan generator wrapper.
- Create `apps/api/app/agents/tutor_agent.py`: TutorService wrapper that supports one final provider call.
- Create `apps/api/app/agents/assessment_agent.py`: read-only recent-evidence explanation.
- Create `apps/api/app/agents/orchestrator.py`: single-capability and fixed collaboration orchestration.
- Create `apps/api/app/api/routes/agents.py`: `POST /api/agents/chat` dependency wiring.
- Create `apps/api/app/llm/openai_compatible_provider.py`: httpx OpenAI-compatible implementation.
- Modify `apps/api/app/core/config.py`: LLM environment settings.
- Modify `apps/api/app/llm/__init__.py`: configured provider selection and exports.
- Modify `apps/api/app/domain/tutor.py`: additive agent request/response models and provider metadata while preserving old models.
- Modify `apps/api/app/services/tutor_context_builder.py`: use Current Plan and expose recent assessment payload fields.
- Modify `apps/api/app/services/tutor_service.py`: preserve old response contract while exposing provider/response-mode metadata for the agent path.
- Modify `apps/api/app/api/__init__.py`: include agents router.

### Tests

- Create `apps/api/tests/test_agents.py`: router, agents, orchestrator, API, trace, and planner write-boundary tests.
- Create `apps/api/tests/test_openai_compatible_provider.py`: mocked httpx transport tests for success and every required failure.
- Modify `apps/api/tests/test_tutor.py`: update/add Current Plan and metadata compatibility assertions without deleting existing tests.

### Frontend files

- Modify `src/lib/educationApi.ts`: agent request/response types and `chatWithAgents` mapper.
- Modify `src/lib/hooks.ts`: `useAgentChat` hook while preserving `useTutorChat`.
- Modify `src/pages/XiaolianPage.tsx`: capability cards, agent endpoint, trace and provider state.
- Modify `src/components/learning/SpaceTutor.tsx`: new endpoint and capability/trace display.
- Modify `src/components/home/CapabilitiesCard.tsx`: four honest capability cards.
- Optionally create `src/components/xiaolian/AgentTrace.tsx`: small reusable trace renderer if duplication would otherwise be needed.

### Documentation

- Modify `README.md`: truthful Agent Layer architecture and provider semantics.
- Modify `.project.md`: Phase 3-2 Provider, Protocol, Router, Agents, Orchestrator, Trace, Web, and E2E status.

---

## Task 1: Agent protocol and deterministic Router

**Files:**
- Create: `apps/api/app/agents/__init__.py`
- Create: `apps/api/app/agents/base.py`
- Create: `apps/api/app/agents/router.py`
- Test: `apps/api/tests/test_agents.py`

**Interfaces:**
- `AgentCapability(str, Enum)` exposes `DIAGNOSIS`, `PLANNING`, `TUTORING`, `ASSESSMENT` with values `diagnosis`, `planning`, `tutoring`, `assessment`.
- `AgentRequest(BaseModel)` has `learner_id`, `course_id`, `message`, and optional `capability`.
- `AgentTraceItem(BaseModel)` has `agent`, `label`, `status`.
- `AgentResult(BaseModel)` has `agent`, `success`, `summary`, `data`, `suggested_actions`, `context_used`.
- `AgentRouter.route(message: str, capability: AgentCapability | None) -> RouteDecision` returns selected capability and `collaborative: bool`.

- [ ] **Step 1: Write failing routing tests.**

```python
@pytest.mark.parametrize(("message", "expected"), [
    ("我哪里薄弱", AgentCapability.DIAGNOSIS),
    ("今天学什么", AgentCapability.PLANNING),
    ("为什么这题错了", AgentCapability.ASSESSMENT),
    ("解释死锁", AgentCapability.TUTORING),
    ("随便聊聊", AgentCapability.TUTORING),
])
def test_router_is_deterministic(message, expected):
    decision = AgentRouter().route(message, None)
    assert decision.capability == expected


def test_explicit_capability_wins():
    decision = AgentRouter().route("解释死锁", AgentCapability.DIAGNOSIS)
    assert decision.capability == AgentCapability.DIAGNOSIS
    assert decision.collaborative is False


def test_priority_question_selects_collaboration():
    decision = AgentRouter().route("我现在最应该学什么，为什么？", None)
    assert decision.capability == AgentCapability.PLANNING
    assert decision.collaborative is True
```

- [ ] **Step 2: Run the focused tests and verify the expected missing-module failure.**

Run: `uv run --project apps/api pytest apps/api/tests/test_agents.py -q`

Expected: collection fails because `app.agents` does not yet exist.

- [ ] **Step 3: Implement the minimal protocol and keyword Router.**

Use `Enum` values and Pydantic validators matching `TutorConversationRequest`; strip and reject blank learner/course/message. Match collaboration phrases before ordinary planning keywords, explicit capability before every keyword branch, and default to tutoring.

- [ ] **Step 4: Run focused routing tests.**

Run: `uv run --project apps/api pytest apps/api/tests/test_agents.py -q`

Expected: routing tests pass; agent execution tests may remain absent at this task boundary.

- [ ] **Step 5: Commit the protocol and Router.**

```bash
git add apps/api/app/agents apps/api/tests/test_agents.py
git commit -m "feat: add deterministic education agent protocol and router" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Task 2: OpenAI-compatible Provider and provider selection

**Files:**
- Modify: `apps/api/app/core/config.py`
- Create: `apps/api/app/llm/openai_compatible_provider.py`
- Modify: `apps/api/app/llm/__init__.py`
- Create: `apps/api/tests/test_openai_compatible_provider.py`

**Interfaces:**
- `OpenAICompatibleProvider(base_url: str, api_key: str, model: str, timeout: float, client: httpx.AsyncClient | None = None)` implements `BaseLLMProvider`.
- `.name` returns `openai_compatible`.
- `.chat(messages, **kwargs) -> LLMResult` posts to one normalized `/v1/chat/completions` endpoint.
- `get_llm_provider()` selects OpenAI-compatible only when base URL, key, and model are all nonblank; otherwise returns `MockTutorProvider`.

- [ ] **Step 1: Write failing mocked transport tests.**

Cover:

```python
@pytest.mark.asyncio
async def test_openai_provider_extracts_content():
    transport = MockTransport(lambda request: Response(
        200, json={"choices": [{"message": {"content": "真实回答"}}]}
    ))
    provider = OpenAICompatibleProvider("https://llm.test", "secret-key", "demo", 3, transport=transport)
    result = await provider.chat([LLMMessage("user", "问题")])
    assert result.content == "真实回答"
    assert result.usage["provider"] == "openai_compatible"
```

Add parametrized 401/403/429/500 responses, timeout, invalid JSON, empty choices, and assert every exception string/log record does not contain `secret-key`. Add URL normalization tests for bases ending in `/`, `/v1`, and `/v1/`. Add provider-selection tests using `monkeypatch` and `get_settings.cache_clear()`.

- [ ] **Step 2: Run tests and verify they fail because the provider is absent.**

Run: `uv run --project apps/api pytest apps/api/tests/test_openai_compatible_provider.py -q`

Expected: import/constructor failures.

- [ ] **Step 3: Implement the httpx provider.**

Use an injected `httpx.MockTransport`-compatible client/transport for tests, send `Authorization: Bearer <key>` and JSON `{model, messages}`, parse only `choices[0].message.content`, reject empty/non-string content, map usage into `LLMResult.usage`, and raise sanitized typed/runtime exceptions. Close only clients created by the provider; do not log request headers or bodies.

Add settings fields `llm_base_url: str | None`, `llm_api_key: str | None`, `llm_model: str | None`, `llm_timeout: float = 20.0` under the existing `EDUCATION_` prefix.

- [ ] **Step 4: Run all provider tests.**

Run: `uv run --project apps/api pytest apps/api/tests/test_openai_compatible_provider.py -q`

Expected: all success, error, timeout, normalization, and selection tests pass.

- [ ] **Step 5: Commit provider support.**

```bash
git add apps/api/app/core/config.py apps/api/app/llm apps/api/tests/test_openai_compatible_provider.py
git commit -m "feat: add configurable openai compatible tutor provider" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Task 3: Current Plan and Tutor metadata compatibility

**Files:**
- Modify: `apps/api/app/domain/tutor.py`
- Modify: `apps/api/app/services/tutor_context_builder.py`
- Modify: `apps/api/app/services/tutor_service.py`
- Modify: `apps/api/tests/test_tutor.py`

**Interfaces:**
- Existing `TutorResponse` and `/api/tutor/chat` JSON remain valid.
- Add an internal result/metadata path exposing `provider` and `response_mode` without changing old `source` assertions.
- `TutorContextBuilder._build_plan()` reads the repository Current Plan (`get_current`) and its tasks.
- `TutorEvidenceContext` may contain additive optional fields for `is_correct`, `score`, `difficulty`, `mastery_before`, `mastery_after`, `confidence`, and `evidence_count` sourced from evidence payload only.

- [ ] **Step 1: Add failing regression tests.**

```python
def test_context_builder_uses_active_current_plan_after_history_changes(...):
    # Generate two plans; repository marks the first superseded.
    _generate_plan(client)
    _generate_plan(client)
    context = TutorContextBuilder(testdb.session()).build(DEMO_LEARNER_ID, COURSE_OS)
    current = testdb.session().scalar(select(StudyPlan).where(StudyPlan.id == context.plan.plan_id))
    assert current.status == StudyPlanStatus.ACTIVE


def test_tutor_metadata_distinguishes_mock_provider(testdb):
    response = _run_chat(TutorService(testdb.session()))
    assert response.provider == "mock"
    assert response.response_mode == "provider"
```

- [ ] **Step 2: Run the regression tests and observe the Current Plan/metadata failure.**

Run: `uv run --project apps/api pytest apps/api/tests/test_tutor.py -q`

Expected: the new assertions fail while the existing Tutor tests remain the compatibility baseline.

- [ ] **Step 3: Implement additive changes.**

Use `StudyPlanRepository.get_current(learner_id, course_id)` and return an empty context when no ACTIVE plan exists. Extend TutorService’s internal response construction with metadata, preserve `source="llm"` for the legacy response model, and ensure fallback has `provider` from the configured provider plus `response_mode="fallback"`. Do not modify the service algorithms or database models.

- [ ] **Step 4: Run the complete Tutor test file.**

Run: `uv run --project apps/api pytest apps/api/tests/test_tutor.py -q`

Expected: all old tests plus the new Current Plan and metadata tests pass.

- [ ] **Step 5: Commit compatibility changes.**

```bash
git add apps/api/app/domain/tutor.py apps/api/app/services/tutor_context_builder.py apps/api/app/services/tutor_service.py apps/api/tests/test_tutor.py
git commit -m "feat: ground tutor context in current plan metadata" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Task 4: Diagnosis, Planner, Tutor, and Assessment Agents

**Files:**
- Create: `apps/api/app/agents/diagnosis_agent.py`
- Create: `apps/api/app/agents/planner_agent.py`
- Create: `apps/api/app/agents/tutor_agent.py`
- Create: `apps/api/app/agents/assessment_agent.py`
- Modify: `apps/api/app/agents/__init__.py`
- Test: `apps/api/tests/test_agents.py`

**Interfaces:**
- `DiagnosisAgent(db).run(request) -> AgentResult` calls Profile once and `DiagnosisService.build_from_profile` once; its `data` contains profile and diagnosis summaries.
- `PlannerAgent(db).run(request, diagnosis: AgentResult | None = None) -> AgentResult` reads Current Plan; `should_generate(message)` is deterministic; only explicit generate/re-generate language calls `generate_plan`.
- `TutorAgent(db, llm_provider=None).run(request, extra_context: dict | None = None) -> AgentResult` delegates to TutorService and maps provider metadata, context, suggestions, and answer.
- `AssessmentAgent(db).run(request) -> AgentResult` reads the most recent practice evidence and returns a factual explanation or an honest insufficient-evidence message.

- [ ] **Step 1: Write failing agent tests.**

```python
def test_diagnosis_agent_reuses_service_result(testdb):
    result = DiagnosisAgent(testdb.session()).run(_request("我哪里薄弱"))
    assert result.success is True
    assert result.data["diagnosis"]["primary_focus"]["knowledge_point_id"] == "kp-deadlock"


def test_planner_ordinary_question_reads_without_generating(client, testdb, monkeypatch):
    agent = PlannerAgent(testdb.session())
    monkeypatch.setattr(agent._application, "generate_plan", lambda *_: pytest.fail("must not write"))
    result = agent.run(_request("我今天学什么"))
    assert result.success is True


def test_assessment_agent_does_not_change_mastery(testdb):
    before = _read_mastery(testdb, "kp-deadlock")
    result = AssessmentAgent(testdb.session()).run(_request("分析一下我刚才的练习"))
    after = _read_mastery(testdb, "kp-deadlock")
    assert result.success is True
    assert before == after
```

Add Tutor delegation and no-evidence honesty assertions.

- [ ] **Step 2: Run the focused tests and verify they fail because agents are absent.**

Run: `uv run --project apps/api pytest apps/api/tests/test_agents.py -q`

Expected: import or constructor failures for the four Agent classes.

- [ ] **Step 3: Implement the four thin wrappers.**

Diagnosis must call the existing Profile service and pass that exact output to `DiagnosisService.build_from_profile`; do not duplicate thresholds or sorting. Planner must use `StudyPlanApplicationService.get_current()` and only call `generate_plan()` when the message includes explicit generation wording. Tutor must create a `TutorConversationRequest` and pass optional structured collaboration notes into the prompt/context without a second model call. Assessment must query `list_recent_by_learner(..., limit=...)`, filter the latest practice evaluation, and read payload values defensively; if no record exists, return a successful honest “目前还没有足够记录判断……” result.

- [ ] **Step 4: Run focused Agent tests.**

Run: `uv run --project apps/api pytest apps/api/tests/test_agents.py -q`

Expected: all four wrapper and boundary tests pass.

- [ ] **Step 5: Commit the Agent capability wrappers.**

```bash
git add apps/api/app/agents apps/api/tests/test_agents.py
git commit -m "feat: add education capability agents" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Task 5: EducationAgentOrchestrator and new API route

**Files:**
- Create: `apps/api/app/agents/orchestrator.py`
- Create: `apps/api/app/api/routes/agents.py`
- Modify: `apps/api/app/api/__init__.py`
- Modify: `apps/api/app/agents/__init__.py`
- Test: `apps/api/tests/test_agents.py`

**Interfaces:**
- `EducationAgentOrchestrator(db, llm_provider=None).handle(request: AgentRequest) -> AgentsChatResponse`.
- Response fields: `answer`, `selected_capability`, `provider`, `response_mode`, `context_used`, `suggested_actions`, `agent_trace`.
- `POST /api/agents/chat` accepts the Pydantic `AgentRequest`, returns the response model, and uses the same `get_db` dependency as existing routes.

- [ ] **Step 1: Write failing Orchestrator and API tests.**

```python
def test_orchestrator_collaboration_trace_is_dag(client):
    response = _agent_chat(client, "我现在最应该学什么，为什么？")
    assert response.status_code == 200
    body = response.json()
    assert [item["agent"] for item in body["agent_trace"]] == ["diagnosis", "planning", "tutoring"]
    assert body["agent_trace"][-1]["status"] == "completed"


def test_tutoring_request_has_no_fake_planner_trace(client):
    body = _agent_chat(client, "给我解释死锁四个必要条件。").json()
    assert body["selected_capability"] == "tutoring"
    assert [item["agent"] for item in body["agent_trace"]] == ["tutoring"]


def test_agents_api_rejects_blank_message(client):
    assert _agent_chat(client, "   ").status_code == 422
```

Add explicit-capability, assessment, no-loop, provider metadata, and injected failing-Tutor fallback tests.

- [ ] **Step 2: Run the focused tests and verify the route/orchestrator failures.**

Run: `uv run --project apps/api pytest apps/api/tests/test_agents.py -q`

Expected: failures because `EducationAgentOrchestrator` and `/api/agents/chat` are not implemented.

- [ ] **Step 3: Implement the fixed orchestration DAG.**

For non-collaborative routing, execute exactly the selected Agent and then build the unified response. For collaborative planning, execute Diagnosis, pass its structured result into Planner, then pass both results into Tutor. Never let an Agent invoke another Agent. Append trace entries only after successful actual execution; if an Agent returns failure, append a failed entry only when it was actually called, stop dependent nodes, and use a deterministic honest answer. Keep provider metadata from Tutor; structured-only Agents use `provider="none"` unless the final Tutor runs.

Add the FastAPI route and include it after the existing Tutor route. Use a response model that serializes enum values as strings and suggested actions as `{type, label}` objects.

- [ ] **Step 4: Run API and orchestration tests.**

Run: `uv run --project apps/api pytest apps/api/tests/test_agents.py -q`

Expected: all route, trace, DAG, fallback, explicit-capability, and validation tests pass.

- [ ] **Step 5: Run the complete backend suite.**

Run: `uv run --project apps/api pytest`

Expected: all existing tests and new Phase 3-2 tests pass with zero failures.

- [ ] **Step 6: Commit the Orchestrator and API.**

```bash
git add apps/api/app/agents apps/api/app/api apps/api/tests/test_agents.py
git commit -m "feat: expose education agent orchestration API" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Task 6: Frontend API types, hook, XiaolianPage, and SpaceTutor

**Files:**
- Modify: `src/lib/educationApi.ts`
- Modify: `src/lib/hooks.ts`
- Modify: `src/pages/XiaolianPage.tsx`
- Modify: `src/components/learning/SpaceTutor.tsx`
- Optionally create: `src/components/xiaolian/AgentTrace.tsx`

**Interfaces:**
- `AgentCapability = 'diagnosis' | 'planning' | 'tutoring' | 'assessment'`.
- `AgentChatRequest` maps `learnerId`, `courseId`, `message`, optional `capability` to snake_case.
- `AgentTraceItem` maps `agent`, `label`, `status`.
- `AgentChatResponse` maps `selectedCapability`, `provider`, `responseMode`, `contextUsed`, typed `suggestedActions`, and `agentTrace`.
- `chatWithAgents(request) -> Promise<AgentChatResponse>` calls `/api/agents/chat`.
- `useAgentChat(learnerId, courseId)` exposes `send(message, capability?)` and `pending`.

- [ ] **Step 1: Add frontend type/mapping tests if the project test harness exists; otherwise add compile-visible typed mappings and use existing API patterns.**

The mapper must default absent arrays to `[]`, preserve `null` capability, and never map new metadata into the old Tutor response type.

- [ ] **Step 2: Implement API client and hook.**

Keep `chatWithTutor` and `useTutorChat` unchanged for compatibility. Add the new function adjacent to them and use the same `extractApiData`/Axios error handling conventions.

- [ ] **Step 3: Upgrade XiaolianPage without changing its route.**

Change the title to “小涟 · 智能学习中枢” and subtitle to “结合你的学习画像、诊断结果和学习计划，为你提供针对性的学习帮助。” Add four compact capability buttons. Clicking one sets a pending capability and pre-fills a representative question; sending calls `chatWithAgents`. Render only real trace items in a restrained horizontal/vertical sequence, provider/fallback status, context chips, and typed suggested-action labels. Keep the existing conversation layout and no external state persistence.

- [ ] **Step 4: Upgrade SpaceTutor to use `useAgentChat`.**

Use automatic routing for ordinary messages. Add capability/trace metadata to assistant messages; show the trace only when nonempty and keep the compact learning-space layout. Preserve current quick questions and task topic placeholder.

- [ ] **Step 5: Run frontend gates.**

Run: `pnpm check`

Expected: TypeScript and ESLint pass.

- [ ] **Step 6: Commit the frontend agent experience.**

```bash
git add src/lib/educationApi.ts src/lib/hooks.ts src/pages/XiaolianPage.tsx src/components/learning/SpaceTutor.tsx src/components/xiaolian/AgentTrace.tsx
git commit -m "feat: add multi-agent tutor web experience" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Task 7: Home capability card and project documentation

**Files:**
- Modify: `src/components/home/CapabilitiesCard.tsx`
- Modify: `README.md`
- Modify: `.project.md`

- [ ] **Step 1: Update the home card.**

Replace the three-item wording with four items: 学习诊断、学习规划、学习辅导、学习评估. Add concise copy explaining that the four capability modules coordinate through the same learner state; do not claim an autonomous swarm.

- [ ] **Step 2: Update README architecture and provider truthfulness.**

Document Learner State Layer → Education Agent Layer → Orchestrator → Web, the four capability boundaries, deterministic routing, one final Tutor provider call, `mock` versus `openai_compatible`, `provider` versus `fallback`, environment variables, and explicit non-goals.

- [ ] **Step 3: Update `.project.md`.**

Add the Phase 3-2 record with Provider, Agent Protocol, Router, Agents, Orchestrator, Agent Trace, Web, tests, E2E status, and the exact not-implemented boundaries. Preserve historical records and do not claim verification until it runs.

- [ ] **Step 4: Run contamination search.**

Run a repository search for `payment|nuwax|datatable|checkout|billing|subscription|order_id|is_paid`; expected result is no Phase 3-2 business-feature contamination in changed production files.

- [ ] **Step 5: Commit documentation and home card.**

```bash
git add src/components/home/CapabilitiesCard.tsx README.md .project.md
git commit -m "docs: record Phase 3-2 agent architecture" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Task 8: Build, browser E2E, real-provider check, and final commit

**Files:**
- No planned source changes; only verification artifacts outside the repository may be created and removed.

- [ ] **Step 1: Run complete frontend checks.**

Run:

```bash
pnpm check
pnpm build
```

Expected: both commands exit 0.

- [ ] **Step 2: Run complete backend tests.**

Run: `uv run --project apps/api pytest`

Expected: all tests pass; record the exact count and any pre-existing warnings.

- [ ] **Step 3: Start FastAPI and Vite using the repository commands.**

Use the actual project launch commands, poll `/api/health` and the Vite port rather than sleeping blindly, and ensure no stale listener is reused.

- [ ] **Step 4: Drive four browser scenarios through the real app.**

A. Open `/#/xiaolian`, ask “我现在最应该学什么，为什么？”, observe a `POST /api/agents/chat`, and assert trace diagnosis → planning → tutoring plus real primary focus/current-plan text.

B. Ask “给我解释死锁四个必要条件。” and assert only tutoring appears in trace.

C. Open `/#/space`, ask “我现在这个知识点掌握得怎么样？”, and assert the request returns diagnosis capability.

D. Submit one real practice evaluation, wait for Profile/Diagnosis refresh, ask “分析一下我刚才的练习”, and assert assessment trace/evidence-based response without a Mastery write from the chat path.

Capture screenshots or structured CDP output, check browser console errors, and verify 1024px+ horizontal overflow remains false.

- [ ] **Step 5: Perform optional real Provider validation.**

If all `EDUCATION_LLM_BASE_URL`, `EDUCATION_LLM_API_KEY`, and `EDUCATION_LLM_MODEL` values are present, make one real request and report only provider/model/status/latency. Otherwise do not fabricate it; report that configuration is absent and mocked HTTP integration tests validated the provider.

- [ ] **Step 6: Inspect final diff and status.**

Run:

```bash
git diff --check
git status --short --branch
git diff HEAD~8 --stat
```

Confirm no `.env`, database files, generated bundles, API keys, or unrelated commercial feature changes are staged.

- [ ] **Step 7: Commit the verified sprint if verification is clean.**

```bash
git add apps/api src README.md .project.md docs/superpowers
git commit -m "feat: complete Phase 3-2 real AI tutor orchestration" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

Only report completion after fresh command output confirms the final tests, build, browser scenarios, and clean status.

---

## Self-review checklist

- [x] Every design area maps to at least one task: protocol, router, provider, agents, orchestration, API, frontend, docs, tests, E2E, scope boundaries.
- [x] No task changes the database Schema or replaces accepted learning algorithms.
- [x] The response metadata distinction is explicit: legacy `source` remains compatible; new API reports provider and response mode.
- [x] The Planner write boundary and Assessment read-only boundary are tested explicitly.
- [x] The collaboration trace and one-LLM-call constraint are tested.
- [x] Provider errors and missing configuration are covered without exposing secrets.
- [x] No unresolved TBD/TODO placeholders are present in the implementation steps.
- [x] Frontend and backend command contracts use `pnpm` and `uv` as required.
