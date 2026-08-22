# EducationMind UI-7 Xiaolian Memory Experience Implementation Plan

**Goal:** Present existing learning data as Xiaolian observations, a companion
portrait, reflection growth feedback, and a learning story without adding
memory infrastructure.

**Architecture:** Add a pure deterministic presentation module, focused React
components, and Archive/Reflection integration. Keep all source objects
read-only and leave confirmed preferences explicitly empty until a real source
exists.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, Tailwind CSS, Lucide,
Vitest, pnpm.

## Constraints

- React frontend changes only.
- No backend, API, database, Agent, MCP, or Memory backend changes.
- No generated chat memory or automatic long-term preference.
- No mastery mutation or Evidence creation.
- Keep existing UI-5/UI-6 changes intact.

## Tasks

### 1. Pure presentation model

- Add failing tests for source filtering, latest reflection selection, portrait
  derivation, reflection feedback, and story mapping.
- Implement `xiaolianMemory.ts` with typed deterministic outputs.
- Confirm all generated text uses only supplied source values.

### 2. UI components

- Add `XiaolianMemoryCard`.
- Add `XiaolianLearningPortrait`.
- Add `MemoryCapsule` with an explicit empty state.
- Add `LearningStoryTimeline`.
- Add component tests for empty preferences and truthful story context.

### 3. Reflection integration

- Upgrade the reflection-completed Xiaolian bubble to consume a pure growth
  feedback model derived only from `ReflectionResult`.
- Retain the existing teaching-demo disclaimer and no-mutation behavior.

### 4. Archive integration

- Read current-session `reflectionResults` from the existing loop store.
- Render memory observations and portrait only when profile and diagnosis data
  are available.
- Replace `LearningJourneyTimeline` on Archive with
  `LearningStoryTimeline`.
- Pass `[]` to `MemoryCapsule` because no confirmed-preference source exists.
- Update Archive integration tests to verify exact source wiring.

### 5. Review and verification

- Inspect the frontend-only diff and run a focused code review.
- Run `git diff --check`.
- Run all Vitest tests.
- Run `pnpm check`.
- Run `pnpm build`.
- Report modified files, real data sources, routes, and fresh verification
  results.
