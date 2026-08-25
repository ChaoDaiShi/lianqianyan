# Learner Profile Visualization Implementation Plan

**Goal:** Turn the archive into an evidence-readable learner portrait using real mastery and exam analytics.

**Architecture:** Pure derivation helpers combine `LearnerProfile`, `DiagnosisResult` and `ExamAnalytics`; accessible SVG/CSS components visualize the derived values; `ArchivePage` fetches exam analytics independently so failure never hides existing profile data.

**Tech Stack:** React 18, TypeScript, SVG, Tailwind, Vitest.

## Task 1: Honest portrait derivation

**Files:**
- Create `src/components/profile/profileVisualization.ts`
- Test `src/components/profile/profileVisualization.test.ts`

- [ ] Write failing tests for four radar dimensions, missing exam metric as null, knowledge-point joins, status distribution, insufficient data and narrative labels.
- [ ] Implement pure bounded derivation functions with no sample fallback values.
- [ ] Run focused tests and commit.

## Task 2: Accessible visual components

**Files:**
- Create `src/components/profile/PortraitRadar.tsx`
- Create `src/components/profile/EvidenceCoverageRing.tsx`
- Create `src/components/profile/KnowledgePerformanceBars.tsx`
- Create `src/components/profile/AssessmentSnapshot.tsx`
- Create `src/components/profile/LearnerPortraitDashboard.tsx`
- Test `src/components/profile/LearnerPortraitDashboard.test.tsx`

- [ ] Write failing static-render tests for accessible titles/descriptions, real metric text, null exam state, pending review count and knowledge labels.
- [ ] Implement SVG/CSS visuals without a new chart dependency; every graphic gets a textual equivalent.
- [ ] Run focused tests and commit.

## Task 3: Archive integration and full verification

**Files:**
- Modify `src/lib/hooks.ts`
- Modify `src/pages/ArchivePage.tsx`
- Modify `src/pages/ArchivePage.test.tsx`
- Modify `README.md`
- Modify `.project.md`

- [ ] Add `useExamAnalytics`; keep its loading/error state independent from profile and diagnosis.
- [ ] Insert the new dashboard and preserve existing memories/timeline content.
- [ ] Update docs with exam/voice/privacy/runtime boundaries and exact commands.
- [ ] Run frontend/backend focused and full suites, `pnpm check`, `pnpm build`, live API smoke tests and desktop/narrow browser walkthrough.
- [ ] Verify Git status excludes runtime SQLite, local Live2D assets and the user's untracked Word template; commit only scoped project files.

