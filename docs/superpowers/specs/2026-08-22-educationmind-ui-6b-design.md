# EducationMind UI-6B Learning Reflection Loop Design

## Objective

Extend the existing UI-6A learning experience into a visible learning loop:

`理解 -> 学习/讲解 -> 练习 -> 复述 -> 反馈 -> 调整`

The implementation remains a React frontend change. It does not change backend behavior, API contracts, database state, Agents, or MCP tools.

## Data Boundaries

### Server-backed facts

- Current learning task and plan: `PersistedStudyTask`, `PersistedStudyPlan`
- Course knowledge: `KnowledgePointContent`
- Learner diagnosis: `DiagnosisResult`, `KnowledgePointDiagnosis`
- Learning evidence: `LearningEvidence`
- Practice result: `PracticeEvaluationResponse`
- Tutor response: `AgentChatResponse`

### Frontend session facts

`ReflectionResult` is created only after the learner submits text in the current browser session. It contains:

- Knowledge point id and title
- Submitted text
- Submission timestamp
- Covered course section titles
- Missing course section titles
- Deterministic next-step suggestion

It is not sent to an API, persisted as Evidence, or used to update mastery. The UI must label it as a frontend teaching feedback demonstration.

The latest real `PracticeEvaluationResponse` may also be retained in the frontend session so Archive can explain the response already received by the browser. It remains separate from server evidence and is deduplicated by `evaluation.evidence.id`.

## Reflection Workspace

`ReflectionPage` loads `KnowledgePointContent` by the knowledge point id already carried in the route query. The page delegates the interaction to `ReflectionWorkspace`.

States:

- `idle`: no learner text
- `writing`: learner has entered text
- `analyzing`: deterministic comparison is running
- `completed`: a `ReflectionResult` is available

The reflection objective is derived from the returned knowledge title and non-empty section titles. No fallback learning objective is invented. If knowledge content cannot be loaded, submission remains unavailable and the page shows an honest loading/error/empty state.

Deterministic feedback treats each non-empty `KnowledgePointContent.sections[].title` as a concept anchor. A section is covered only when its normalized title, or a meaningful normalized title fragment, appears in the submitted text. This deliberately conservative rule is described in the UI and is not presented as semantic understanding or AI grading.

Output:

- Covered concepts: matched course section titles
- Missing concepts: unmatched course section titles
- Next suggestion: revisit the first missing course section, or compare the full explanation with all returned course sections when none are missing

## Learning Evidence Insight

`EvidenceInsightCard` filters real `LearningEvidence` for the active learner, course, and knowledge point.

It displays:

- Learning behavior: `learning_started`
- Practice result: `practice_answer_evaluated`
- Reflection record: only a real evidence item identifiable as reflection; the current API union has no reflection evidence type, so the expected state is an explicit empty message

The card is read-only and never mutates evidence.

## Learning Stage Progress

`LearningStageProgress` displays five stages without percentages:

1. 理解
2. 讲解
3. 实践
4. 复述
5. 验证

The stages are derived from observed events in order:

- A matching `learning_started` Evidence completes 理解.
- A task-scoped Tutor response completes 讲解.
- A task-scoped `PracticeEvaluationResponse` completes 实践.
- A matching session `ReflectionResult` completes 复述.
- A practice evaluation whose evidence timestamp is later than the reflection submission completes 验证.

The first unmet stage is `current`; later stages are `locked`. This represents interaction steps only, not mastery or knowledge correctness.

## Xiaolian Feedback

`XiaolianFeedbackBubble` accepts one of three typed source variants:

- Practice completed: show `PracticeEvaluationResponse.message` and its real replanning status.
- Reflection completed: show covered/missing concepts and the deterministic next suggestion from `ReflectionResult`.
- Learning completed: summarize the current `KnowledgePointDiagnosis` status, evidence count, and reason codes.

The component contains no random copy and does not alter the supplied source data.

## Learning Journey Timeline

`LearningJourneyTimeline` replaces the older Archive growth timeline.

It merges:

- Matching `LearningEvidence` events
- The current session's latest real `PracticeEvaluationResponse`
- Current Plan generation and task entries

Events are sorted by their real timestamps. A practice response is not added a second time when its Evidence id already exists in the evidence list. Current Plan entries are labeled as plan context, not completed learning events.

## State Ownership

A small Zustand `useLearningLoopStore` owns only current-session values:

- Reflection results keyed by knowledge point id
- Latest practice evaluation keyed by task id

No mock defaults are created. Empty state means no current-session result exists.

## Integration

- `/#/reflection`: upgraded Reflection workspace and reflection feedback bubble
- `/#/space`: learning stages, evidence insight, and source-backed Xiaolian feedback
- `/#/archive`: journey timeline combining Evidence, current-session practice response, and Current Plan

## Verification

- Unit tests cover deterministic concept matching, stage derivation, and timeline deduplication.
- `pnpm check`
- `pnpm build`
