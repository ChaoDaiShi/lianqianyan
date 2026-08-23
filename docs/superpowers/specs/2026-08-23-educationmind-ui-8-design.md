# EducationMind UI-8 Xiaolian Companion Flow Design

## Objective

Upgrade Xiaolian from a page-level character into a companion who guides the
learner through an existing study task. This phase changes only React
presentation and frontend session state.

The companion flow must remain grounded in data already returned by the
EducationMind frontend. It does not create tasks, learning history, evidence,
mastery updates, Agent behavior, or MCP capabilities.

## Data Boundaries

### Server-backed facts

- Learner state: `LearnerProfile`
- Current diagnosis focus: `DiagnosisResult`
- Active study plan and tasks: `PersistedStudyPlan`
- Recorded learning behavior: `LearningEvidence`
- Course teaching material: `KnowledgePointContent`
- Practice feedback: `PracticeEvaluationResponse`

### Frontend session facts

- Current task session, Tutor response, practice response, and reflection:
  `useLearningLoopStore`
- Deterministic reflection feedback: `ReflectionResult`
- User experience state derived from those facts: `CompanionJourney`

No new backend or API data source is introduced.

## Deterministic Presentation Model

`companionFlow.ts` owns pure transformations used by the UI:

- `buildLearningEntryContent()` filters diagnosis and evidence to the selected
  task and produces only source-backed preparation items.
- `deriveCompanionJourney()` maps observed learning-loop facts into
  `prepare`, `learning`, `thinking`, `practice`, `reflection`, or `complete`.
- `buildProactiveTeachingContent()` derives core concepts, focus, and reminders
  only from non-empty `KnowledgePointContent.sections`.
- `findNextPlanTask()` selects the next real task by plan order. If replanning
  has replaced the reflected task, it resumes from the first ordered task in
  the current plan.
- `buildTodaysJourney()` presents the current plan as today's existing journey
  without creating a second task system.

Generated labels explain the meaning of supplied fields. They do not claim
memory, completion, mastery, or relationships that are not present.

## Learning Entry Dialog

`LearningEntryDialog` appears before an existing plan task is started. It
shows:

- The selected task knowledge point
- The matching diagnosis focus or intervention, when present
- Matching historical `LearningEvidence`, when present
- Today's goal, expressed as the real plan action and knowledge-point name

Confirming the dialog calls the existing `useStartPlanTask()` path. Opening or
closing it has no server effect.

The confirmation stays disabled while preparation data is loading. Diagnosis
and Evidence failures are represented independently so one failed source does
not imply that the other source failed.

## Companion Journey

`CompanionJourney` is a learner-facing process indicator and remains separate
from `AgentToolTrace`.

The states are derived as follows:

- `prepare`: no matching current-session learning start
- `learning`: learning has started but no Tutor response exists
- `thinking`: the real Tutor request is pending
- `practice`: Tutor response exists but no practice response exists
- `reflection`: practice exists while the verified loop is incomplete
- `complete`: every existing `LearningStageProgress` stage is complete

The component does not display percentages and does not describe technical
Agent execution.

## Proactive Teaching Card

The learning space extends `TutorExplanationCard` with a
`mode="knowledge"` presentation. This knowledge-content-only mode uses the
current `KnowledgePointContent` to display:

- Core concepts
- Learning focus
- Xiaolian reminder

The card explicitly identifies itself as course-content preparation. The
default `TutorExplanationCard` mode remains the renderer for real Tutor API
responses, so course preparation never replaces or rewrites Agent output.

## Reflection Continuation

After deterministic reflection feedback is complete:

- Xiaolian feedback continues to use only `ReflectionResult`.
- The next task is selected from the current real plan by `order`.
- Continuing opens `LearningEntryDialog`, then uses the existing task-start
  flow.
- When no next task exists, the UI shows an honest end-of-plan state.

No mastery or Evidence mutation is added.

## Home Today's Journey

The home page gains a `TodaysJourney` view derived from the active
`CurrentPlan`. It shows ordered real plan tasks and identifies the selected
current task. Starting the selected task uses `LearningEntryDialog`.

## Xiaolian State Separation

`useXiaolianRuntimeStore` separates:

- Runtime state: `idle`, `thinking`, `loading`
- Companion state: `companion`, `encouraging`, `reminding`, `celebrating`

Runtime state describes whether frontend work is happening. Companion state
selects presentation tone. Character assets map the two dimensions at the
component boundary; presentation semantics are no longer stored as runtime
operations.

## Routes

No new route is required.

- `/#/`: Today's Journey and preparation dialog
- `/#/space`: companion journey and proactive teaching
- `/#/reflection`: reflection feedback and next-task continuation

## Verification

- Focused tests for deterministic derivations and store separation
- Component tests for truthful empty and source-backed states
- Full Vitest suite
- `pnpm check`
- `pnpm build`
- `git diff --check`
