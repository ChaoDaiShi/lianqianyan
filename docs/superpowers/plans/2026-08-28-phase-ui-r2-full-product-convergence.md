# Phase UI-R2 Full Product Convergence Implementation Plan

> **For Codex:** Execute this plan in the current session with test-driven changes. The user explicitly prohibited subagents and commits, so checkpoints are verified locally without delegation or commit creation.

**Goal:** Converge six EducationMind 1.4.0 authenticated pages into task-led, truthful, responsive product scenes without changing business logic or API contracts.

**Architecture:** Keep existing hooks and service clients as the data boundary. Refactor only page composition and narrowly scoped presentation components/helpers. Use existing React function components, Radix-style primitives, Tailwind classes, and current Xiaolian components.

**Tech Stack:** React, TypeScript, Vite, Vitest, Tailwind CSS, existing FastAPI backend.

---

## Task 1: Freeze presentation contracts

- [ ] Add page-level rendering tests for My Learning, Diagnosis, Chat, and Settings.
- [ ] Update Exam and Workshop tests to assert the new task-led hierarchy and removal of stale/default technical copy.
- [ ] Run the focused test set and confirm the new expectations fail before implementation.

## Task 2: Build Growth Route and Learning Observation Space

- [ ] Recompose `src/pages/MyLearningPage.tsx` around the real ordered plan and compact truthful empty state.
- [ ] Make `src/components/diagnosis/KnowledgeStarMap.tsx` selectable without changing diagnosis math.
- [ ] Recompose `src/pages/DiagnosisPage.tsx` around focus, state distribution, and an evidence inspector.
- [ ] Run focused My Learning and Diagnosis tests.

## Task 3: Build Assessment and Creation workspaces

- [ ] Recompose `src/pages/ExamPage.tsx` so published exams are primary and authoring tools are secondary.
- [ ] Recompose `src/pages/ResourcesPage.tsx` into a creation-led scene.
- [ ] Refactor `src/components/workshop/ResourceGenerator.tsx` to preserve the existing generation/export API while providing an always-present preview canvas and local edit step.
- [ ] Run focused Exam and Workshop tests.

## Task 4: Build Conversation Core and Preference Space

- [ ] Recompose `src/pages/XiaolianPage.tsx` around messages, voice, and composer, with technical detail collapsed.
- [ ] Recompose `src/pages/SettingsPage.tsx` into mutually exclusive sections, with appearance open by default and credentials kept advanced.
- [ ] Run focused Chat and Settings tests.

## Task 5: Responsive and semantic review

- [ ] Check all six pages for 1440×900, 1024×900, and 390×844 layout behavior.
- [ ] Confirm empty/loading/error states are semantic and do not fabricate real-world state.
- [ ] Confirm Home, Knowledge, Archive, backend contracts, authentication, and business rules were not changed.

## Task 6: Verification

- [ ] Run all focused Vitest tests.
- [ ] Run `pnpm exec vitest run`.
- [ ] Run `pnpm check`.
- [ ] Run `pnpm build`.
- [ ] Run the backend pytest suite with the existing project runtime.
- [ ] Run `git diff --check` and capture final Git status without mutating unrelated worktree state.
- [ ] Perform authenticated browser audits for all six routes at desktop, tablet, and mobile widths, including console-error and horizontal-overflow checks.
- [ ] Produce `# Phase UI-R2 完成报告` and stop before UI-Final.
