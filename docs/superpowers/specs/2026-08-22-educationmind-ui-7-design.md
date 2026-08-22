# EducationMind UI-7 Xiaolian Memory Experience Design

## Objective

Turn existing learner data into a warmer Xiaolian companion experience without
adding memory infrastructure or changing any server behavior.

This phase is presentation-only. Every statement must be traceable to a field
already available in the React frontend.

## Data Boundaries

### Server-backed facts

- Learner portrait and knowledge-point states: `LearnerProfile`
- Current focus and interventions: `DiagnosisResult`
- Recorded learning behavior: `LearningEvidence`
- Practice feedback received by the browser: `PracticeEvaluationResponse`
- Current plan and task context: `PersistedStudyPlan`

### Frontend session facts

- A learner-submitted reflection and its deterministic result:
  `ReflectionResult`
- User-confirmed learning preferences passed explicitly to `MemoryCapsule`

The implementation must not infer or persist long-term memory. An empty
preference list remains empty and is shown as an honest empty state.

## Pure Presentation Model

`xiaolianMemory.ts` owns deterministic transformations:

- `buildXiaolianMemoryObservations()` creates source-labelled observations from
  matching profile, diagnosis, evidence, and reflection fields.
- `buildXiaolianLearningPortrait()` turns profile and diagnosis states into
  companion language: current stage, mastered directions, strengthening
  directions, and next suggestion.
- `buildReflectionGrowthFeedback()` uses only the supplied `ReflectionResult`.
- `buildLearningStories()` transforms the existing journey events into story
  language while preserving source ids, timestamps, and source labels.

The model never parses chat messages, seeds fallback memories, uses random
copy, or writes to a store.

## Xiaolian Memory Card

The card displays “小涟观察到的学习特点”.

Possible observations are included only when their source exists:

- Diagnosis focus or intervention names
- Counts of matching learning-start and practice-evaluation Evidence
- The latest valid matching ReflectionResult and its covered/missing concepts
- Unassessed or insufficient-evidence knowledge-point counts from the profile

Copy uses “小涟发现” or “小涟观察到”. It never says “我记得你说过” and
never claims chat memory.

## Xiaolian Learning Portrait

The portrait is derived from learner-facing meaning rather than rendering raw
field names.

- Current stage is based on assessed coverage and the presence of a diagnosis
  focus.
- Mastered directions use only `mastered` and `proficient` knowledge points.
- Strengthening directions use the diagnosis primary focus and priority
  interventions.
- The next suggestion names the real primary focus when present, otherwise it
  directs the learner to gather evidence for unassessed areas or maintain
  already strong areas.

No percentage is required and no mastery change is implied.

## Reflection Growth Feedback

After a reflection is completed, the Xiaolian feedback bubble renders:

- An observation based on `coveredConcepts` and `missingConcepts`
- The exact deterministic `nextSuggestion`

The component does not update mastery, create Evidence, or call an LLM.

## Learning Story Timeline

`LearningStoryTimeline` replaces the Archive page's log-style timeline.

It consumes the same real inputs as the existing journey timeline:

- `LearningEvidence`
- `PracticeEvaluationResponse`
- Current `PersistedStudyPlan`

It preserves event order, source labels, and timestamps. Plan tasks are
explicitly labelled as context and never described as completed learning.

## Memory Capsule

`MemoryCapsule` accepts an explicit `confirmedPreferences` array. Archive passes
an empty array because the current frontend has no real user-confirmed
preference source.

The empty state states that no learning preference has been confirmed. No
preference is inferred from profile, diagnosis, evidence, reflection, or chat.

## Integration

- `/#/reflection`: completed reflection gains source-backed Xiaolian growth
  feedback.
- `/#/archive`: adds Xiaolian observations, learning portrait, story timeline,
  and empty Memory Capsule.
- Existing routes, hooks, API contracts, stores, and backend behavior remain
  unchanged.

## Verification

- Focused unit/component tests for all deterministic transformations and empty
  states
- Archive integration test for real data wiring
- `pnpm check`
- `pnpm build`
