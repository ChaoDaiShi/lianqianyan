# EducationMind UI-6B Learning Reflection Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a source-backed learning reflection loop across Reflection, LearningSpace, and Archive without changing backend state or inventing learning progress.

**Architecture:** Keep deterministic transformations in a small pure helper module and render them through focused React components. Store only real current-session Reflection and Practice results in Zustand; continue loading Plan, Diagnosis, Knowledge Content, and Evidence through existing hooks.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, Tailwind CSS, Lucide icons, pnpm.

## Global Constraints

- Modify React frontend code only.
- Do not modify backend, API contracts, database, Agents, or MCP.
- Do not update mastery or create Evidence from Reflection.
- Do not display percentages in `LearningStageProgress`.
- Do not fabricate progress, feedback, goals, relations, or learning events.
- Run `pnpm check` and `pnpm build` before completion.

---

### Task 1: Deterministic Learning Loop Model

**Files:**
- Create: `src/components/learning/learningLoop.ts`
- Create: `src/components/learning/learningLoop.test.ts`
- Create or modify: `vitest.config.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `ReflectionResult`, `LearningStageItem`, `buildReflectionResult()`, `deriveLearningStages()`, and `buildJourneyEvents()`.
- Consumes: `KnowledgePointContent`, `LearningEvidence`, `PracticeEvaluationResponse`, `PersistedStudyPlan`, and task-scoped interaction timestamps.

- [ ] **Step 1: Write failing tests for concept matching**

Create tests with this public API:

```ts
const result = buildReflectionResult({
  knowledge,
  submittedText: '互斥条件表示资源不能同时共享。',
  submittedAt: '2026-08-22T10:00:00.000Z',
});

expect(result.coveredConcepts).toEqual(['互斥条件']);
expect(result.missingConcepts).toEqual(['循环等待']);
```

Also assert that an empty section list returns empty covered and missing arrays instead of invented concepts.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `pnpm exec vitest run src/components/learning/learningLoop.test.ts`

Expected: FAIL because `learningLoop.ts` does not exist.

- [ ] **Step 3: Implement minimal reflection result generation**

Implement these exact exported shapes:

```ts
export interface ReflectionResult {
  knowledgePointId: string;
  knowledgePointName: string;
  submittedText: string;
  submittedAt: string;
  coveredConcepts: string[];
  missingConcepts: string[];
  nextSuggestion: string;
}

export function buildReflectionResult(input: {
  knowledge: KnowledgePointContent;
  submittedText: string;
  submittedAt: string;
}): ReflectionResult;
```

Normalize punctuation and whitespace, match only section-title anchors sourced from `KnowledgePointContent`, and return a deterministic suggestion naming the first missing section. When none are missing, direct the learner to compare the explanation against all returned sections.

- [ ] **Step 4: Add failing tests for stage ordering and timeline deduplication**

Assert the following stage sequence:

```ts
expect(deriveLearningStages({
  hasLearningStarted: true,
  hasTutorResponse: true,
  practiceEvaluation: evaluation,
  reflectionResult,
}).map((stage) => stage.status)).toEqual([
  'completed',
  'completed',
  'completed',
  'completed',
  'current',
]);
```

Then provide a practice evaluation whose `evidence.occurredAt` is later than `reflectionResult.submittedAt` and expect all five stages to be completed. Add a journey test where the same practice evidence appears in both Evidence and `PracticeEvaluationResponse`; expect one event with that evidence id.

- [ ] **Step 5: Implement stage and journey derivation**

Implement:

```ts
export type LearningStageStatus = 'completed' | 'current' | 'locked';

export interface LearningStageItem {
  id: 'understand' | 'explain' | 'practice' | 'reflect' | 'verify';
  label: '理解' | '讲解' | '实践' | '复述' | '验证';
  status: LearningStageStatus;
}

export function deriveLearningStages(input: {
  hasLearningStarted: boolean;
  hasTutorResponse: boolean;
  practiceEvaluation: PracticeEvaluationResponse | null;
  reflectionResult: ReflectionResult | null;
}): LearningStageItem[];

export interface LearningJourneyEvent {
  id: string;
  occurredAt: string;
  kind: 'plan' | 'plan_task' | 'learning' | 'practice';
  title: string;
  detail: string | null;
  sourceLabel: string;
}

export function buildJourneyEvents(input: {
  evidence: LearningEvidence[];
  plan: PersistedStudyPlan | null;
  practiceEvaluations: PracticeEvaluationResponse[];
  knowledgeNames: Record<string, string>;
  learnerId: string;
  courseId: string;
}): LearningJourneyEvent[];
```

Use real evidence and timestamps only. Label plan events as plan context rather than completion.

- [ ] **Step 6: Run focused tests**

Run: `pnpm exec vitest run src/components/learning/learningLoop.test.ts`

Expected: PASS with all deterministic model tests green.

### Task 2: Session State and Reflection Workspace

**Files:**
- Create: `src/store/useLearningLoopStore.ts`
- Modify: `src/store/index.ts`
- Create: `src/components/learning/ReflectionWorkspace.tsx`
- Modify: `src/pages/ReflectionPage.tsx`

**Interfaces:**
- Consumes: `useKnowledgePoint()`, route `knowledge_point_id`, and `KnowledgePointContent`.
- Produces: real current-session `ReflectionResult` values keyed by knowledge point.

- [ ] **Step 1: Add an empty-by-default Zustand store**

Expose this store contract without seeded values or persistence middleware:

```ts
interface LearningLoopStore {
  reflectionResults: Record<string, ReflectionResult>;
  practiceEvaluations: Record<string, PracticeEvaluationResponse>;
  setReflectionResult: (result: ReflectionResult) => void;
  setPracticeEvaluation: (taskId: string, result: PracticeEvaluationResponse) => void;
}
```

- [ ] **Step 2: Build `ReflectionWorkspace`**

Use:

```ts
interface ReflectionWorkspaceProps {
  knowledge: KnowledgePointContent;
  initialResult?: ReflectionResult | null;
  onComplete: (result: ReflectionResult) => void;
}
```

Implement `idle`, `writing`, `analyzing`, and `completed`; disable submission without real knowledge sections; call `buildReflectionResult()` after a fixed analyzing transition; display covered concepts, missing concepts, next suggestion, and the mandatory demonstration disclaimer.

- [ ] **Step 3: Upgrade `ReflectionPage`**

Load the query-selected knowledge point with `useKnowledgePoint()`, show honest loading/error/empty states, and render `XiaolianFeedbackBubble` after a completed result.

- [ ] **Step 4: Run type checking**

Run: `pnpm type-check`

Expected: PASS.

### Task 3: Learning Space Loop Components

**Files:**
- Create: `src/components/learning/LearningStageProgress.tsx`
- Create: `src/components/learning/EvidenceInsightCard.tsx`
- Create: `src/components/xiaolian/XiaolianFeedbackBubble.tsx`
- Modify: `src/pages/LearningSpacePage.tsx`

**Interfaces:**
- Consumes: task-scoped Evidence, Tutor response, Practice response, Reflection result, and Diagnosis.
- Produces: source-backed stage states and Xiaolian feedback.

- [ ] **Step 1: Build `LearningStageProgress`**

Accept `stages: LearningStageItem[]`. Render five stable stages with `completed`, `current`, and `locked` icons and labels. Include an explanatory note that stages represent observed interactions rather than mastery.

- [ ] **Step 2: Build `EvidenceInsightCard`**

Use:

```ts
interface EvidenceInsightCardProps {
  evidence: LearningEvidence[];
  learnerId: string;
  courseId: string;
  knowledgePointId: string;
  loading: boolean;
  error: boolean;
}
```

Group only matching existing Evidence into learning behavior and practice result; show a truthful no-record state for reflection because the current API does not expose a reflection evidence type.

- [ ] **Step 3: Build `XiaolianFeedbackBubble`**

Use a discriminated union:

```ts
type XiaolianFeedbackBubbleProps =
  | { scenario: 'practice_completed'; evaluation: PracticeEvaluationResponse }
  | { scenario: 'reflection_completed'; result: ReflectionResult }
  | { scenario: 'learning_completed'; diagnosis: KnowledgePointDiagnosis };
```

Every scenario requires its real source object. Do not include fallback motivational text.

- [ ] **Step 4: Connect LearningSpace**

Store each real practice response in `useLearningLoopStore`, derive stage state from task-scoped data, and render the stage bar, evidence insight, and the highest-priority available feedback.

- [ ] **Step 5: Run type checking and lint**

Run: `pnpm check`

Expected: PASS.

### Task 4: Archive Learning Journey

**Files:**
- Create: `src/components/archive/LearningJourneyTimeline.tsx`
- Modify: `src/pages/ArchivePage.tsx`
- Retain: `src/components/learning/GrowthTimeline.tsx` for other callers, if any.

**Interfaces:**
- Consumes: `LearningEvidence[]`, current `PersistedStudyPlan`, knowledge point names, and current-session practice evaluations.
- Produces: a sorted, deduplicated timeline with explicit source labels.

- [ ] **Step 1: Build the timeline component**

Use:

```ts
interface LearningJourneyTimelineProps {
  evidence: LearningEvidence[];
  plan: PersistedStudyPlan | null;
  practiceEvaluations: PracticeEvaluationResponse[];
  knowledgeNames: Record<string, string>;
  learnerId: string;
  courseId: string;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}
```

Render plan generation, plan tasks, learning starts, and practice evaluations using timestamps from their source objects. Keep missing-data states explicit.

- [ ] **Step 2: Replace Archive timeline integration**

Read current-session evaluations from the loop store, pass Current Plan and real Evidence, and keep plan/evidence retry paths independent.

- [ ] **Step 3: Run focused tests and check**

Run: `pnpm exec vitest run src/components/learning/learningLoop.test.ts && pnpm check`

Expected: all tests and checks PASS.

### Task 5: Final Verification and Review

**Files:**
- Review all files changed by Tasks 1-4.

**Interfaces:**
- Consumes: the approved UI-6B design and complete git diff.
- Produces: verified implementation and a concise delivery report.

- [ ] **Step 1: Inspect the complete diff**

Run: `git diff --check` and `git diff -- src/components src/pages src/store package.json vitest.config.ts`

Expected: no whitespace errors and no backend/API contract changes.

- [ ] **Step 2: Request code review**

Provide the reviewer with the UI-6B requirements and changed-file diff. Resolve every Critical or Important issue.

- [ ] **Step 3: Run required gate**

Run: `pnpm check`

Expected: exit code 0.

- [ ] **Step 4: Run production build**

Run: `pnpm build`

Expected: exit code 0 and Vite production assets emitted.

- [ ] **Step 5: Report**

List modified files, exact real data sources, route integration, and fresh verification results.
