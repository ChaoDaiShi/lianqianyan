# Exam Web and Voice Implementation Plan

**Goal:** Provide one usable exam center for authoring, taking, resuming, grading and reviewing exams, plus explicit browser speech input/output controls.

**Architecture:** Typed exam contracts live in `src/domain/exam.ts`; network mapping remains in `src/lib/educationApi.ts`; page orchestration lives in `ExamPage`; focused components own catalog, builder, runner, results and review. Speech recognition is an isolated hook with a small reusable button.

**Tech Stack:** React 18 function components/hooks, TypeScript, Vite, Tailwind, Vitest, Web Speech API.

## Task 1: Typed client and validation presentation

**Files:**
- Create `src/domain/exam.ts`
- Modify `src/domain/index.ts`
- Modify `src/lib/educationApi.ts`
- Test `src/lib/examApi.test.ts`
- Create `src/components/exam/examPresentation.ts`
- Test `src/components/exam/examPresentation.test.ts`

- [ ] Write failing snake_case/camelCase mapping tests for all exam requests/responses and results.
- [ ] Write failing pure tests for labels, score formatting, answer completion, publish validation and downloadable CSV escaping.
- [ ] Implement typed client calls and pure presentation helpers; run focused tests and commit.

## Task 2: Browser speech recognition

**Files:**
- Create `src/components/digital-human/speechRecognition.ts`
- Create `src/components/digital-human/useSpeechRecognition.ts`
- Create `src/components/digital-human/VoiceInputButton.tsx`
- Test `src/components/digital-human/speechRecognition.test.ts`
- Test `src/components/digital-human/VoiceInputButton.test.tsx`
- Modify `src/pages/XiaolianPage.tsx`
- Modify `src/components/learning/SpaceTutor.tsx`

- [ ] Write failing tests for support detection, transcript merging, error mapping and accessible button states.
- [ ] Implement click-to-listen, interim/final transcription, stop/cleanup and unsupported/error states.
- [ ] Insert final transcript into chat inputs without auto-sending; preserve existing TTS controls.
- [ ] Run focused speech and existing digital-human tests, then commit.

## Task 3: Exam center UI

**Files:**
- Create `src/components/exam/QuestionTypeManager.tsx`
- Create `src/components/exam/QuestionBank.tsx`
- Create `src/components/exam/ExamBuilder.tsx`
- Create `src/components/exam/ExamCatalog.tsx`
- Create `src/components/exam/ExamRunner.tsx`
- Create `src/components/exam/ExamResultView.tsx`
- Create `src/components/exam/ReviewQueue.tsx`
- Create `src/pages/ExamPage.tsx`
- Modify `src/router/routeManifest.ts`
- Modify `src/components/layout/LearningRail.tsx`
- Test `src/pages/ExamPage.test.tsx`
- Modify route and rail tests.

- [ ] Start with failing render tests for four tabs, custom type/question forms, publish gating, resume action, autosave state, countdown, voice text answers, results, review queue, empty/error states and navigation.
- [ ] Implement the components using existing UI primitives; never expose authoring answers in runner props.
- [ ] Add question TTS and short/long answer voice input; do not auto-submit recognized text.
- [ ] Add client-side JSON/CSV result downloads generated only from returned result data.
- [ ] Run focused tests, all frontend tests, check and build, then commit.

