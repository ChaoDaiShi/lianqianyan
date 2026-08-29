# EducationMind Phase UI-R1 Implementation Plan

> **For agentic workers:** Execute sequentially with test-driven development. The user explicitly prohibited subagents and commits for this phase.

**Goal:** Refactor Home, Knowledge Space and Growth Memory into companion, exploration and narrative scenes without changing business semantics.

**Architecture:** Existing hooks and API types remain the only data sources. Small pure presentation selectors drive page-specific components; optional AppShell scene styling affects only the three target routes.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Radix UI, Vitest.

## Global Constraints

- Use `pnpm` only.
- Modify no backend business file, API contract, database, auth, route meaning or non-target page.
- Add no mock data, synthetic relation, inferred completion, XP, level, streak or score.
- Preserve unknown versus weak and proficient versus mastered semantics.
- Do not commit, push, merge, reset or clean.
- Run `pnpm check` before finalizing.

---

### Task 1: Page-scene foundation

**Files:**
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `src/components/design/NebulaBackground.tsx`
- Modify: `src/design/theme.css`
- Test: `src/components/layout/AppShell.test.tsx`

**Interfaces:**
- `AppShell.scene?: 'default' | 'companion' | 'galaxy' | 'storybook'`
- `NebulaBackground.scene` consumes the same value.

- [ ] Write a failing render test proving scene attributes are opt-in and default pages remain unchanged.
- [ ] Run the focused test and confirm the new prop is missing.
- [ ] Add optional scene styling with muted target-page backgrounds and no new navigation behaviour.
- [ ] Run the focused test to green.

### Task 2: Home companion scene

**Files:**
- Create: `src/components/home/homePresentation.ts`
- Create: `src/components/home/homePresentation.test.ts`
- Modify: `src/components/home/HeroBanner.tsx`
- Modify: `src/components/home/TodaysJourney.tsx`
- Modify: `src/components/home/HomeCompanionEntry.test.tsx`
- Modify: `src/components/home/TodaysJourney.test.tsx`
- Modify: `src/pages/Home.tsx`

**Interfaces:**
- `selectHomePrimaryAction(input): { kind: 'diagnosis' | 'plan' | 'task'; label: string }`
- `buildHomeJourney(input): Array<{ id: 'diagnosis' | 'plan' | 'learning' | 'validation'; state: 'completed' | 'current' | 'waiting' }>`
- Hero consumes real profile, diagnosis, plan and evidence and exposes one primary action.

- [ ] Write failing selector tests for no Diagnosis, Diagnosis without plan, active plan, real learning evidence and validation evidence.
- [ ] Write failing component tests proving one primary CTA and no three-column insight grid.
- [ ] Run focused Home tests and confirm failures describe the old dashboard.
- [ ] Implement selectors and refactor Hero into a continuous Xiaolian scene.
- [ ] Remove `XiaolianDailyInsight` from Home composition and turn Today Journey into a connected four-node path without secondary CTA.
- [ ] Run focused Home tests to green and inspect Home before starting Knowledge work.

### Task 3: Knowledge galaxy explorer

**Files:**
- Create: `src/components/knowledge/knowledgePresentation.ts`
- Create: `src/components/knowledge/knowledgePresentation.test.ts`
- Modify: `src/components/knowledge/KnowledgeGalaxy.tsx`
- Modify: `src/components/knowledge/KnowledgeGraph.test.tsx`
- Create: `src/pages/KnowledgePage.test.tsx`
- Modify: `src/pages/KnowledgePage.tsx`

**Interfaces:**
- `buildKnowledgeNodeView(graphNode, profilePoint, selected, currentTask): KnowledgeNodeView`
- `buildKnowledgeInspector(node, profilePoint, diagnosis, plan): KnowledgeInspectorModel`
- `KnowledgeGalaxy` consumes `graph`, `points`, `diagnosis`, `plan`, loading/error state and `onRetry`.

- [ ] Write failing selector tests for unassessed display, assessed percentages, current-task priority and source preservation.
- [ ] Write failing component/page tests proving one canvas, collapsible sources, no mastery tabs and a selected-node inspector.
- [ ] Run focused Knowledge tests and confirm failures describe the split dashboard.
- [ ] Implement a deterministic SVG galaxy using only returned nodes and edges.
- [ ] Add desktop inspector and mobile bottom sheet, with `去学习` or `问小涟` links and no plan generation.
- [ ] Add the unframed `还没点亮的星星` list and honest sparse empty state.
- [ ] Run focused Knowledge tests to green and inspect Knowledge before starting Growth work.

### Task 4: Growth storybook

**Files:**
- Modify: `src/components/xiaolian/xiaolianMemory.ts`
- Modify: `src/components/xiaolian/xiaolianMemory.test.ts`
- Modify: `src/components/archive/LearningStoryTimeline.tsx`
- Modify: `src/components/archive/LearningStoryTimeline.test.tsx`
- Modify: `src/components/xiaolian/XiaolianMemoryCard.tsx`
- Modify: `src/pages/ArchivePage.tsx`
- Modify: `src/pages/ArchivePage.test.tsx`

**Interfaces:**
- `buildLearningStories` additionally consumes `reflectionResults` and emits `kind: 'reflection'` items labelled `本地复述记录`.
- `LearningStoryTimeline` receives filtered local reflections and renders month-grouped narrative rows.

- [ ] Write failing tests proving local reflections are labelled local, foreign reflections are excluded and empty sources create no story.
- [ ] Write failing Archive tests proving the timeline is primary, profile is collapsed and the old default dashboard cards are absent.
- [ ] Run focused Growth tests and confirm failures describe the current dashboard.
- [ ] Extend story selectors and render an unframed date/line/content timeline.
- [ ] Recompose Archive into story plus companion observation; move the real portrait dashboard into a closed disclosure and hide it when no assessed data exists.
- [ ] Run focused Growth tests to green.

### Task 5: Three-page consistency and responsive acceptance

**Files:**
- Modify only target-page components from Tasks 1–4.
- Create: `docs/verification/2026-08-28-phase-ui-r1.md`

- [ ] Audit visible rectangular surfaces against Home ≤3, Knowledge canvas plus ≤2 inspector surfaces and non-card-grid Growth.
- [ ] Verify 1440×900, 1024×900 and 390×844 CSS behaviour, including mobile Knowledge bottom sheet and one-column Growth timeline.
- [ ] Confirm reduced-motion behaviour and keyboard-selectable graph nodes.
- [ ] Use an available local browser to open `/`, `/knowledge` and `/archive`; capture evidence without installing browser dependencies.
- [ ] Record visual findings and any honest limitation in the verification document.

### Task 6: Complete verification and report

- [ ] Run `pnpm exec vitest run` and require zero failures.
- [ ] Run `pnpm check` and require TypeScript plus ESLint success.
- [ ] Run `pnpm build` and require a successful production bundle.
- [ ] Run `apps/api/.venv/Scripts/python.exe -m pytest apps/api/tests -q` because the backend cost is reasonable.
- [ ] Run `git diff --check` and inspect `git status --short` without modifying unrelated work.
- [ ] Write the final Phase UI-R1 report with baseline, each page, removed/merged cards, changed files, truth boundaries, responsive results, tests, browser verification and final status.
