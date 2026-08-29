# EducationMind Phase UI-R1 Presentation Language Design

**Date:** 2026-08-28  
**Status:** Approved by the user-provided Phase UI-R1 specification  
**Scope:** Home, Knowledge Space, Growth Memory only

## Objective

Replace the three target pages' repeated glass-card dashboard composition with three distinct product scenes:

- Home: a companion-led next-action scene;
- Knowledge Space: a course-grounded knowledge galaxy for exploration;
- Growth Memory: a learning storybook based on real records.

The implementation changes presentation and interaction only. Existing API contracts, hooks, learner identifiers, routes, authentication, diagnosis, plan, mastery, evidence and local reflection semantics remain authoritative.

## Considered Approaches

### 1. CSS-only rearrangement

This preserves code but cannot remove duplicated information, competing calls to action, persistent detail blocks or the split between course graph and mastery graph. Rejected as insufficient.

### 2. A new page-specific data layer

This gives maximum visual freedom but duplicates learner profile, diagnosis, plan and evidence selection logic. It risks producing conflicting business semantics. Rejected.

### 3. Presentation selectors over existing domain data

Selected. The pages continue to consume the existing hooks. Small pure selectors derive only display decisions such as the single Home action, journey-node state, selected knowledge-point details and deterministic archive copy. No new records or learning state are created.

## Shared Presentation Language

`AppShell` gains an optional page-scene value. The default remains unchanged for every non-target page. The three target pages receive restrained backgrounds built on `#F8F7FB`, `#F7F6FA` and `#F6F5FA`, with only faint page-specific color and a small number of decorative marks.

Hierarchy is fixed to:

1. the page scene;
2. the current action or state;
3. details revealed by selection or expansion.

Navigation routes and labels do not change. Existing reduced-motion handling remains authoritative; new transitions are short opacity, scale or slide changes and are disabled through `prefers-reduced-motion`.

Xiaolian appears in three semantic sizes:

- scene character on Home and Growth Memory;
- companion character beside selected knowledge or deterministic observations;
- miniature avatar only for compact feedback.

No page repeats the same full-body character placement mechanically.

## Home: Companion Scene

The Home page becomes one continuous scene rather than three stacked dashboard panels.

The scene chooses exactly one primary action from real state:

- no Diagnosis: link to `/diagnosis`, label `开始学习诊断`;
- Diagnosis exists but no active CurrentPlan: invoke the existing `generate()` function, label `生成学习计划`;
- active CurrentPlan with a real task: open the existing `LearningEntryDialog`, label `继续当前任务`.

The central observation combines the current Diagnosis focus, most recent course Evidence and CurrentPlan task into one reading flow. Missing information remains explicitly missing. A loading or partial failure never fabricates a focus or plan.

The journey becomes four connected semantic nodes: diagnosis, plan, learning and validation. Nodes use only `completed`, `current` and `waiting`. Completion is derived from actual Diagnosis, CurrentPlan and matching `LearningEvidence`; no percentage or automatic progress is added. The journey contains no second primary call to action.

The Home first screen contains at most two framed surfaces: the scene itself and the lightweight journey strip.

## Knowledge Space: Knowledge Galaxy

The two-tab graph/mastery dashboard becomes one explorer. Approximately 70% of the desktop content width belongs to a large SVG knowledge canvas.

The canvas displays only nodes and edges returned by `GET /api/knowledge/graph`. It never synthesizes prerequisites or connects unlinked points. Course and section nodes stay neutral. Knowledge-point nodes overlay the matching `LearnerProfile` status when available:

- `mastered`: mastered;
- `proficient`: proficient, never labelled mastered;
- `developing`: developing;
- `weak`: weak;
- `unassessed` and `insufficient_evidence`: unassessed/insufficient, never `0%`.

Selected nodes are largest; a node matching the current plan task is second-largest. Layout is deterministic and exploratory rather than a row-based graph administration view.

Selecting a node opens one inspector:

- desktop: right-side panel;
- tablet: compressed right-side panel;
- mobile: bottom sheet that can be dismissed.

The inspector uses only existing data: node name and kind, diagnosis status, mastery and confidence only for assessed states, evidence count, diagnosis reasons, matching CurrentPlan task and real source sections. A matching plan task links to `/my-learning` with `去学习`; otherwise a knowledge-point node links to `/xiaolian?knowledge_point_id=...` with `问小涟`. Selection never generates a plan.

Sources are collapsed under `知识来源 · N`. Weak, insufficient and unassessed points may appear as an unframed `还没点亮的星星` list, excluding every other point and never duplicating the full canvas.

An empty graph remains a sparse galaxy scene with honest copy and a link to diagnosis or learning. It is not a large empty-state card.

## Growth Memory: Learning Storybook

Growth Memory becomes a narrative page with the story timeline as the primary column and a smaller Xiaolian observation scene as the secondary column.

`LearningStoryTimeline` no longer wraps every event or the full timeline in identical glass cards. Events render as date, timeline mark and content. Existing real event types remain, and frontend-local reflection results are added only when they match the active learner, course and real knowledge points. They are explicitly labelled `本地复述记录`, never `LearningEvidence`.

Xiaolian's summary is deterministic and sourced from `LearnerProfile`, `Diagnosis`, matching `LearningEvidence` and CurrentPlan. Copy uses `小涟看到`, `小涟发现` or `从学习记录来看`; it never claims a memory conversation that does not exist.

The full learner portrait is retained under a closed `成长画像` disclosure. Its summary reports only real assessed and unassessed counts. The chart dashboard renders only when assessed data exists and only after expansion. Empty charts never dominate the page.

The old always-visible Learning Identity, empty Memory Capsule, separate Current Track card and two-column card matrix are removed from the default composition. CurrentPlan remains visible as clearly labelled context inside the story timeline.

## Responsive Behaviour

- 1440×900: Home scene and journey read as one composition; Knowledge uses canvas plus inspector; Growth uses timeline plus companion column.
- 1024×900: scene spacing tightens; Knowledge inspector narrows; Growth companion moves below when needed.
- 390×844: Home stacks character, observation, action and journey; Knowledge canvas is full width and inspector is a bottom sheet; Growth timeline becomes one column with dates above event content.

No mobile layout retains a three- or four-column card grid.

## Error and Empty States

Errors are inline and actionable without becoming large white cards. Empty copy is page-specific:

- Home: `今天从第一次诊断开始。`
- Knowledge: `这片星海还没有被学习证据点亮。`
- Growth: `你的第一段学习故事还没开始。`

Unknown is never converted to weak. Missing relationships, events, plans and assessments remain absent.

## Testing and Acceptance

Pure selectors receive unit tests for every state boundary. Component tests assert unique Home CTA, real-only journey states, assessed-only percentages, source disclosure, local-reflection labelling and collapsed profile details.

Required commands:

```powershell
pnpm exec vitest run
pnpm check
pnpm build
apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests -q
git diff --check
```

Visual acceptance covers Home, Knowledge and Growth at 1440×900, 1024×900 and 390×844 using an available local browser without installing a new browser dependency.

## Scope Boundaries

No changes to backend business code, APIs, database, Auth, Agent, MCP, Tool Registry, RAG, evidence semantics, mastery, diagnosis, plan/replanning or route meanings. No new navigation items, XP, levels, streaks, scores, mock learning state, generated history or synthetic graph relationships. No commit, push, merge, reset or clean.

