# Task 4: Archive Learning Journey Report

## Status

Implemented and verified.

Archive now keeps its independent Current Plan panel and replaces only the
previous `GrowthTimeline` integration with `LearningJourneyTimeline`. The new
timeline combines Current Plan context, recent `LearningEvidence`, and
current-session `PracticeEvaluationResponse` values from the non-persisted
learning-loop store.

## Implementation

### New timeline component

Created `src/components/archive/LearningJourneyTimeline.tsx` with the exact
required prop contract.

The component:

- Calls the existing pure `buildJourneyEvents()` for filtering, derivation,
  deduplication, and ordering.
- Renders plan generation, plan task context, learning starts, and practice
  evaluations.
- Displays the exact source labels returned by the builder: `Current Plan`,
  `LearningEvidence`, and `PracticeEvaluationResponse`.
- Uses each event's source-owned `occurredAt` value for both the semantic
  `<time dateTime>` attribute and `zh-CN` display formatting.
- Marks each plan task as `计划上下文，不表示已完成学习`.
- Shows an honest empty state when there are no events.
- Shows Evidence loading/error information without hiding Current Plan
  events.
- Keeps an Evidence-specific retry button available on error.
- Does not display or derive reflection evidence, mastery changes, or
  synthetic timestamps.

### Archive integration

Modified `src/pages/ArchivePage.tsx` only at the timeline integration points:

- Replaced the `GrowthTimeline` import and render with
  `LearningJourneyTimeline`.
- Read the existing `practiceEvaluations` record from
  `useLearningLoopStore`.
- Passed the current plan, recent Evidence, real in-session practice
  evaluations, knowledge names, learner/course ids, and existing Evidence
  loading/error/retry state.

The independent Current Plan panel and all existing profile, diagnosis, plan,
and Evidence loading/retry behavior remain in place.

## TDD Record

### RED

Added `src/components/archive/LearningJourneyTimeline.test.tsx` before the
component implementation.

Command:

```text
pnpm test --run src/components/archive/LearningJourneyTimeline.test.tsx
```

Observed expected failure:

```text
FAIL src/components/archive/LearningJourneyTimeline.test.tsx
Error: Failed to load url ./LearningJourneyTimeline
Test Files 1 failed (1)
```

This confirmed the focused test suite exercised the missing Task 4 timeline.

### GREEN

After the minimal component and Archive integration were implemented:

```text
pnpm test --run src/components/archive/LearningJourneyTimeline.test.tsx
Test Files 1 passed (1)
Tests 3 passed (3)
```

The focused tests cover:

1. Current Plan events remain visible during an Evidence error and Evidence
   retry remains available.
2. Learning and practice events expose their explicit source labels and
   source timestamps.
3. No events produce an honest empty state that does not imply plan
   completion.

## Verification

Focused learning-loop, store, and timeline tests:

```text
pnpm test --run src/components/learning/learningLoop.test.ts src/components/archive/LearningJourneyTimeline.test.tsx src/store/useLearningLoopStore.test.ts
Test Files 3 passed (3)
Tests 23 passed (23)
```

Required repository gate:

```text
pnpm check
type-check: passed
lint: passed
```

Diff hygiene:

```text
git diff --check
```

No whitespace errors were reported. Git emitted only existing Windows line
ending notices.

## Self-Review

- React frontend only: satisfied.
- Backend/API/database/Agent/MCP changes: none.
- Event sources limited to Evidence, practice evaluations, and Current Plan:
  satisfied through `buildJourneyEvents()`.
- Current Plan tasks treated only as context: satisfied with explicit UI
  copy and no completion wording.
- Synthetic timestamps: none.
- Reflection Evidence: none.
- Mastery changes: none.
- Evidence failure blocking plan rendering: prevented; plan events render
  whenever available.
- Evidence retry retained: satisfied.
- Actual source timestamps with `zh-CN` formatting: satisfied.
- Explicit source labels: satisfied.
- `GrowthTimeline.tsx`: unchanged.
- LearningIdentityCard and independent Archive states: unchanged by Task 4.
- Existing unrelated dirty work: preserved and excluded from Task 4 staging.

## Files In Task 4

- `src/components/archive/LearningJourneyTimeline.tsx`
- `src/components/archive/LearningJourneyTimeline.test.tsx`
- Task 4 hunks in `src/pages/ArchivePage.tsx`
- `.superpowers/sdd/task-4-report.md`

## Concerns

The repository contains extensive pre-existing uncommitted UI-5/UI-6A work,
including unrelated changes in `src/pages/ArchivePage.tsx` and untracked files
under `src/components/archive`. The Task 4 commit must therefore use selective
staging for the Archive integration hunks and explicit paths for the two new
timeline files and this report.

## Review Fix Wave (2026-08-22)

### Scope

This fix wave preserves the dirty UI-6A Archive baseline and does not modify
or stage `src/pages/ArchivePage.tsx`. It adds a page-level guard around that
final-worktree integration, strengthens timestamp coverage, and removes the
nested card treatment inside `LearningJourneyTimeline`.

The new `src/pages/ArchivePage.test.tsx` imports the actual current
`ArchivePage.tsx` and uses focused SSR mocks only at its dependencies. It
proves that:

- `LearningIdentityCard` is still rendered when profile and diagnosis data
  exist.
- `LearningJourneyTimeline` is rendered and `GrowthTimeline` is absent.
- The timeline receives the current Plan, real Evidence,
  `Object.values(practiceEvaluations)`, and the learner/course ids.
- Evidence error/loading state does not suppress the independent Current Plan
  content or loading state.
- The timeline's Evidence retry calls only `evidence.refetch`, not the Plan
  retry.

No renderer dependency was added. The node Vitest setup has SSR but no
interactive React renderer, so retry wiring is tested by capturing the
`onRetry` prop from the actual page render, invoking it, and asserting the
Evidence refetch callback.

### RED Evidence

Command:

```text
pnpm test --run src/pages/ArchivePage.test.tsx src/components/archive/LearningJourneyTimeline.test.tsx
```

Exact result summary:

```text
✓ src/pages/ArchivePage.test.tsx (2 tests)
❯ src/components/archive/LearningJourneyTimeline.test.tsx (4 tests | 1 failed)
× LearningJourneyTimeline > uses unframed rows or compact utility surfaces inside the outer panel
  → expected '<section class="em-glass rounded-[28p…' not to contain 'rounded-[18px]'

Test Files  1 failed | 1 passed (2)
Tests       1 failed | 5 passed (6)
```

The failure exposed the existing 18px loading, error, empty, and event-card
surfaces inside the outer `GlassPanel`.

### GREEN Evidence

The minimal presentation change keeps `GlassPanel` as the sole outer surface.
Loading and error states now use unframed left-border rows, the empty state
uses a dashed top divider, event content uses an unframed bottom-divider row,
and the icon utility surface uses `rounded-md`.

Command:

```text
pnpm test --run src/pages/ArchivePage.test.tsx src/components/archive/LearningJourneyTimeline.test.tsx
```

Exact result:

```text
✓ src/pages/ArchivePage.test.tsx (2 tests) 20ms
✓ src/components/archive/LearningJourneyTimeline.test.tsx (4 tests) 36ms

Test Files  2 passed (2)
Tests       6 passed (6)
```

The timeline source test now also asserts the visible timestamp text generated
with `toLocaleString('zh-CN', ...)`, in addition to the source ISO value in
`dateTime`.

### Final Verification

Focused Archive and learning-loop command:

```text
pnpm test --run src/pages/ArchivePage.test.tsx src/components/archive/LearningJourneyTimeline.test.tsx src/components/learning/learningLoop.test.ts src/store/useLearningLoopStore.test.ts
```

Exact result:

```text
✓ src/components/learning/learningLoop.test.ts (17 tests) 9ms
✓ src/store/useLearningLoopStore.test.ts (3 tests) 4ms
✓ src/pages/ArchivePage.test.tsx (2 tests) 14ms
✓ src/components/archive/LearningJourneyTimeline.test.tsx (4 tests) 34ms

Test Files  4 passed (4)
Tests       26 passed (26)
```

Required repository gate:

```text
pnpm check
$ pnpm run type-check && pnpm run lint
$ tsc --noEmit
$ eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0
```

Exit code: `0`.

### Dirty-Baseline Integration Note

The page-level test deliberately imports the actual final-worktree
`src/pages/ArchivePage.tsx`. This guards the UI-6A dirty-baseline integration
that a historical Task 4 commit-only diff cannot show. The predecessor page
file remains unstaged; only the new fix-wave test, timeline test/component
edits, and this report are included in the fix-wave commit.
