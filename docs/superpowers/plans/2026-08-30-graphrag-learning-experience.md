# GraphRAG Learning Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. This task explicitly forbids subagents, so execution stays inline in the current session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a compact, rounded EducationMind experience with stable course GraphRAG, persistent Xiaolian conversations and memory, MiniMax-only voice/image output, AnySearch, richer resources, a six-axis portrait, rebuilt settings, and initialization onboarding.

**Architecture:** Extend existing React and FastAPI boundaries with focused pure helpers and provider adapters. Persist account/course chat state in one JSON-backed SQLAlchemy table; preserve current learning evidence and course truth sources. Use existing selected LLM for opt-in generated summaries and optimization.

**Tech Stack:** React 18, TypeScript, Tailwind, Zustand, Vitest, FastAPI, Pydantic 2, SQLAlchemy 2, httpx, pytest, MiniMax APIs, AnySearch REST API.

## Global Constraints

- Use `pnpm` only for frontend commands.
- Preserve real API, account, course, evidence, diagnosis, plan, Agent, and MCP semantics.
- Do not fabricate learner metrics, graph relationships, history, memory, provider results, or AI output.
- Preserve unrelated untracked PPT artifacts and do not modify SQLite data during implementation.
- Do not use subagents.
- Run only proportional targeted tests plus the required final gates.

---

### Task 1: Stable GraphRAG focus and retrieval

**Files:**
- Modify: `src/components/knowledge/forceMesh.ts`
- Create: `src/components/knowledge/graphFocus.ts`
- Modify: `src/components/knowledge/KnowledgeGalaxy.tsx`
- Modify: `src/components/knowledge/forceMesh.test.ts`
- Create: `src/components/knowledge/graphFocus.test.ts`
- Create: `apps/api/app/knowledge/graphrag.py`
- Modify: `apps/api/app/knowledge/models.py`
- Modify: `apps/api/app/knowledge/__init__.py`
- Modify: `apps/api/app/api/routes/knowledge.py`
- Create: `apps/api/tests/test_graphrag.py`

**Interfaces:**
- Produce `buildGraphFocus(scene, selectedId): { nodes; edges; activeKnowledgePointId }`.
- Produce `GraphRAGRetriever.retrieve(course_id, query, knowledge_point_id, top_k)`.
- Return `retrieval_mode="graph_rag_course_grounded"` and `generation_mode="graph_rag_course_grounded"`.

- [ ] Write graph focus and force-layout tests that iterate course, point, and section selections and expect non-empty finite in-bounds coordinates.
- [ ] Run `pnpm exec vitest run src/components/knowledge/forceMesh.test.ts src/components/knowledge/graphFocus.test.ts` and confirm the new divergence/focus case fails before implementation.
- [ ] Add bounded force integration, finite-coordinate recovery, and the pure focus helper; update the galaxy with reset-focus controls and compact GraphRAG labels.
- [ ] Run the focused frontend tests and confirm they pass.
- [ ] Write backend tests proving lexical seeds are expanded only through real graph neighbors, are deduplicated, respect `top_k`, and expose the retrieval mode.
- [ ] Run `apps/api/.venv/Scripts/pytest.exe apps/api/tests/test_graphrag.py -q` and confirm failure before implementation.
- [ ] Implement `GraphRAGRetriever`, wire the knowledge routes, and rerun the focused backend tests.

### Task 2: Compact rounded application chrome

**Files:**
- Modify: `src/design/theme.css`
- Modify: `src/index.css`
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `src/components/layout/TopCompanionBar.tsx`
- Create: `src/components/design/PageIntro.tsx`
- Modify: `src/pages/KnowledgePage.tsx`
- Modify: `src/pages/DiagnosisPage.tsx`
- Modify: `src/pages/MyLearningPage.tsx`
- Modify: `src/pages/ExamPage.tsx`
- Modify: `src/pages/ResourcesPage.tsx`
- Modify: `src/pages/ArchivePage.tsx`

**Interfaces:**
- Produce `PageIntro` with typed `eyebrow`, `title`, `description`, `icon`, `aside`, and `tone` props.

- [ ] Add a static-render test for compact page intro semantics and accessible heading order.
- [ ] Run the focused test and confirm the component is missing.
- [ ] Implement the shorter top bar/AppShell offsets, rounder tokens, PageIntro, and convert major oversized page headers.
- [ ] Rerun the focused test and existing affected page presentation tests.

### Task 3: Persistent Xiaolian conversations and long-term memory

**Files:**
- Create: `apps/api/app/companion/models.py`
- Create: `apps/api/app/companion/schemas.py`
- Create: `apps/api/app/companion/service.py`
- Create: `apps/api/app/companion/__init__.py`
- Create: `apps/api/app/api/routes/companion.py`
- Modify: `apps/api/app/api/__init__.py`
- Modify: `apps/api/app/main.py`
- Modify: `apps/api/app/agents/base.py`
- Modify: `apps/api/app/api/routes/agents.py`
- Modify: `apps/api/app/agents/orchestrator.py`
- Create: `apps/api/tests/test_companion_history.py`
- Create: `src/lib/companionApi.ts`
- Create: `src/components/xiaolian/ConversationRail.tsx`
- Create: `src/components/xiaolian/LongTermMemoryPanel.tsx`
- Modify: `src/pages/XiaolianPage.tsx`
- Create: `src/pages/XiaolianHistory.test.tsx`

**Interfaces:**
- Thread endpoints under `/api/companion/threads` accept/return bounded `CompanionThreadOut` payloads.
- `AgentRequest.thread_id` is optional; valid memory is loaded server-side for the authenticated account/course.
- Frontend exports `listCompanionThreads`, `createCompanionThread`, `getCompanionThread`, `appendCompanionMessage`, `deleteCompanionThread`, `addCompanionMemory`, and `deleteCompanionMemory`.

- [ ] Write backend authorization, persistence, size-limit, ordering, and memory-injection tests; run them and observe failure.
- [ ] Implement the model/service/routes and Agent memory injection, then rerun focused backend tests.
- [ ] Write a frontend test for thread switching, new conversation, saved memory, deletion, and unsaved error messaging; run and observe failure.
- [ ] Implement the API client, rail, memory panel, and compact Xiaolian workspace; rerun the focused frontend test.

### Task 4: MiniMax-only speech output

**Files:**
- Modify: `apps/api/app/api/routes/voice.py`
- Modify: `apps/api/app/voice/models.py`
- Modify: `apps/api/app/voice/status.py`
- Modify: `apps/api/app/core/config.py`
- Modify: `apps/api/pyproject.toml`
- Modify: `apps/api/uv.lock`
- Delete: legacy GPT-SoVITS/Genie/provider factory modules and install scripts
- Modify: `apps/api/tests/test_voice_api.py`
- Modify: `src/lib/voiceApi.ts`
- Modify: `src/components/digital-human/useSpeechSynthesis.ts`
- Modify: `src/components/digital-human/SpeechControls.tsx`
- Delete: browser-output fallback and legacy attribution modules/tests
- Modify: `src/pages/XiaolianPage.tsx`

**Interfaces:**
- Voice status is `{ provider: "minimax" | "unavailable", voice: "cyrene", configured: boolean }`.
- `useSpeechSynthesis` remains the UI controller name for compatibility but only plays `/api/voice/synthesize` audio.

- [ ] Rewrite voice tests to require MiniMax-only status and to forbid browser/GPT-SoVITS/Genie fallback copy; run and observe failures.
- [ ] Simplify backend and frontend voice paths, delete legacy modules, remove `genie-tts`, regenerate the lockfile, and rerun focused tests.

### Task 5: Parallel text/image resources, rich preview, and AI optimization

**Files:**
- Create: `apps/api/app/resources/minimax_image.py`
- Modify: `apps/api/app/resources/models.py`
- Modify: `apps/api/app/resources/service.py`
- Modify: `apps/api/app/api/routes/resources.py`
- Modify: `apps/api/app/core/config.py`
- Modify: `apps/api/tests/test_resource_generation.py`
- Create: `apps/api/tests/test_resource_ai.py`
- Modify: `src/lib/educationApi.ts`
- Create: `src/components/workshop/RichResourcePreview.tsx`
- Create: `src/components/workshop/RichResourcePreview.test.tsx`
- Modify: `src/components/workshop/ResourceGenerator.tsx`
- Modify: `src/components/workshop/ResourceGenerator.test.tsx`

**Interfaces:**
- `GeneratedResource.images` contains provider, URL, prompt, and aspect ratio; no permanent-storage claim.
- `POST /api/resources/optimize` returns optimized Markdown and provider/model metadata.

- [ ] Write MiniMax image provider tests with `httpx.MockTransport`, resource warning behavior, and LLM optimization success/unavailable cases; confirm failures.
- [ ] Implement the provider, model extensions, route, and service orchestration; rerun focused backend tests.
- [ ] Write rich-preview and generator tests for headings, bold, red emphasis, images, original-source preservation, and AI optimization; confirm failures.
- [ ] Implement the safe preview and parallel editor/preview UI; rerun focused frontend tests.

### Task 6: AnySearch provider

**Files:**
- Create: `apps/api/app/network/anysearch.py`
- Modify: `apps/api/app/network/models.py`
- Modify: `apps/api/app/network/service.py`
- Modify: `apps/api/app/core/config.py`
- Create: `apps/api/tests/test_anysearch.py`
- Modify: `src/components/workshop/NetworkSearchPanel.tsx`
- Modify: `src/components/workshop/NetworkSearchPanel.test.tsx`

**Interfaces:**
- Provider calls `POST /v1/search` with `general.general`, zone, language, optional bearer token, and `max_results`.
- UI response provider is `anysearch` and keeps original URLs.

- [ ] Write request mapping, anonymous/authenticated headers, response mapping, invalid payload, and timeout tests; observe failure.
- [ ] Implement and wire AnySearch, then rerun focused backend and frontend tests.

### Task 7: Six-axis portrait and AI summary

**Files:**
- Modify: `src/components/profile/profileVisualization.ts`
- Modify: `src/components/profile/PortraitRadar.tsx`
- Modify: `src/components/profile/LearnerPortraitDashboard.tsx`
- Modify: `src/components/profile/profileVisualization.test.ts`
- Modify: `src/components/profile/LearnerPortraitDashboard.test.tsx`
- Create: `apps/api/app/profile_summary.py`
- Modify: `apps/api/app/api/routes/profile.py`
- Create: `apps/api/tests/test_profile_summary.py`
- Modify: `src/lib/educationApi.ts`

**Interfaces:**
- `ProfileRadarKey` adds `evidence_depth` and `balance` and keeps unknown values `null`.
- `POST /api/profile/{learner_id}/summary` returns an actual provider-backed summary or 503.

- [ ] Expand tests to six honest axes and dynamic SVG geometry; observe failure and implement the pure visualization changes.
- [ ] Add backend AI-summary tests for prompt grounding, scope authorization, and unavailable provider; implement and rerun.
- [ ] Add the summary action/status to the portrait and rerun component tests.

### Task 8: Rebuilt settings and initialization onboarding

**Files:**
- Create: `apps/api/app/onboarding/models.py`
- Create: `apps/api/app/onboarding/schemas.py`
- Create: `apps/api/app/onboarding/service.py`
- Create: `apps/api/app/api/routes/onboarding.py`
- Modify: `apps/api/app/api/__init__.py`
- Modify: `apps/api/app/main.py`
- Create: `apps/api/tests/test_onboarding.py`
- Modify: `src/auth/AuthGate.tsx`
- Replace: `src/auth/CourseSelectionScreen.tsx` with `src/auth/InitializationScreen.tsx`
- Modify: `src/auth/AuthProvider.tsx`
- Modify: `src/auth/authApi.ts`
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/lib/settingsApi.ts`
- Modify: `src/pages/SettingsPage.test.tsx`
- Create: `src/auth/InitializationScreen.test.tsx`

**Interfaces:**
- `POST /api/onboarding/complete` stores goal, pace, interaction preference, theme, and selected/recommended course atomically.
- Settings expose read-only MiniMax voice/image and AnySearch deployment status without secret values.

- [ ] Write onboarding persistence/default recommendation/auth tests and observe failure; implement backend service and route.
- [ ] Write initialization-screen tests for recommended defaults and the absence of the old forced-subject heading; implement the new screen and AuthProvider call.
- [ ] Rewrite settings presentation tests for the compact sidebar and MiniMax/integration status; rebuild the page without legacy TTS configuration.

### Task 9: Necessary verification and branch handoff

**Files:**
- Modify: `docs/EducationMind开发日志.md`

- [ ] Run focused frontend tests for all changed modules.
- [ ] Run focused backend pytest files for GraphRAG, companion, voice, resources, AnySearch, profile summary, and onboarding.
- [ ] Run `pnpm check`.
- [ ] Run `pnpm build`.
- [ ] Run `git diff --check`.
- [ ] Smoke-check Knowledge, Xiaolian, Resources, portrait, Settings, and onboarding at desktop and narrow widths using real empty/unavailable states where credentials are absent.
- [ ] Update the existing development log with implemented behavior, verification evidence, and explicit unverified external-service boundaries.
- [ ] Review `git status --short --branch` and `git diff --stat`; ensure the user's PPT artifacts remain untouched.

