# EducationMind UI-8 Xiaolian Companion Flow Implementation Plan

**Goal:** Guide learners through real current-plan tasks with a deterministic
Xiaolian companion flow, while preserving all existing API and learning-state
boundaries.

**Architecture:** Add one pure presentation module, focused React components,
and page integrations. Keep task starts on `useStartPlanTask`, keep Tutor API
responses on the existing `TutorExplanationCard`, and derive every new state
from existing plan, evidence, knowledge, and learning-loop values.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, Tailwind CSS, Radix Dialog,
Lucide, Vitest, pnpm.

## Constraints

- React frontend changes only.
- No backend, API contract, database, Agent, MCP, or task-system changes.
- No fabricated history, learning state, goal, or long-term memory.
- No mastery mutation or Evidence creation from reflection.
- Keep UI-5 through UI-7 behavior intact.

## Tasks

### 1. Documentation

- Record design and implementation boundaries.
- Initialize the template-aligned development log.
- Update the log with actual files, decisions, issues, and verification.

### 2. Pure companion model

- Add failing tests for source-filtered entry content.
- Add failing tests for companion journey derivation.
- Add failing tests for proactive teaching content and next-task selection.
- Add failing tests for Today's Journey derivation.
- Implement the typed deterministic transformations.

### 3. Runtime and companion state

- Add failing store tests proving the two dimensions are independent.
- Replace the mixed runtime union with `idle | thinking | loading`.
- Add `companion | encouraging | reminding | celebrating`.
- Migrate all existing consumers and character presentation mapping.

### 4. Learning entry and home

- Add `LearningEntryDialog`.
- Add `TodaysJourney`.
- Open the dialog from the home task entry.
- Confirm through the existing `useStartPlanTask()` callback.

### 5. Learning space

- Add `CompanionJourney`.
- Extend `TutorExplanationCard` with a knowledge-only mode based on current
  `KnowledgePointContent.sections`.
- Open `LearningEntryDialog` for fallback plan-task entries.
- Keep Agent trace and real Tutor explanation behavior unchanged.

### 6. Reflection continuation

- Find the next real task by plan order.
- Render continuation only after a real frontend `ReflectionResult`.
- Open the preparation dialog, then use the existing start-task flow.
- Show a truthful plan-end state when there is no next task.

### 7. Review and verification

- Run focused and full tests.
- Review source boundaries and frontend-only diff.
- Run `pnpm check`.
- Run `pnpm build`.
- Run `git diff --check`.
- Update the development log with final evidence.
