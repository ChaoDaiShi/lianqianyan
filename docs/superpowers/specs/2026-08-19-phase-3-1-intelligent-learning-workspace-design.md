# Phase 3-1 Intelligent Learning Workspace Design

## Goal

Deliver EducationMind as a five-minute competition demo of an authentic personalized-learning loop: learner state and diagnosis drive a study plan; a learner starts a task, receives contextual Tutor help, completes practice, and sees server-calculated mastery, profile, diagnosis, and report updates.

## Baseline Decision

The current repository is authoritative. It already implements a tested current-plan lifecycle through `GET /api/plans/current`, with generation superseding the prior ACTIVE plan. Preserve this backend capability. The competition UI will not expose plan history because it does not improve the required demo route.

## Product Architecture

### Real learner-state boundary

The following values must always come from the Education API:

- LearnerProfile and knowledge-point mastery
- Diagnosis and primary focus
- Current StudyPlan and StudyTasks
- Tutor answers and reported context
- Practice evaluation, mastery before/after, confidence, and evidence count
- Recent LearningEvidence

Errors display an explicit unavailable state and retry action. No static learner-state fallback is permitted.

### Static education-content boundary

Centralized frontend content may contain:

- Knowledge-point explanations
- Fixed demonstration questions
- Tutor shortcut questions
- Presentation labels and deterministic educational copy

Static content must not calculate or impersonate mastery, diagnosis, plans, Tutor answers, or practice results.

### Frontend state and data access

`src/lib/educationApi.ts` owns transport mapping. `src/lib/hooks.ts` provides lightweight loading/error/ready/empty hooks without React Query. Workspace context uses URL query parameters plus the existing Zustand workspace store for plan, task, and knowledge-point identifiers. URL context remains the refresh-safe source for task entry.

## Pages

### Dashboard `/#/`

The first screen presents EducationMind as an AI personalized-learning cockpit within ten seconds. It includes a restrained hero, current course, real profile metrics, primary diagnosis focus, current plan and top tasks, explicit plan generation when empty, task entry, and a factual summary of Xiaolian's diagnosis, planning, and tutoring capabilities.

Profile, diagnosis, and plan modules each support loading, error, empty, and ready states. Null overall mastery renders “暂无足够数据”. Plan generation occurs only after an explicit user action.

### My Learning `/#/my-learning`

Show only the current/latest plan: generation time, strategy, task count, and complete task timeline. Every task can start learning. When empty, offer explicit generation. Remove plan-history UI while leaving backend history capability untouched.

### Learning Space `/#/space`

Resolve the selected task from query parameters and workspace state. The desktop layout uses a task status header, approximately 65% learning content and practice, and 35% embedded Tutor. If no task context exists, show a safe task-selection state using the current plan rather than silently choosing a task.

Starting a task records `learning_started`. Learning content and questions come from the centralized content module. Tutor questions always call `POST /api/tutor/chat`. Practice answers always call `POST /api/practice/evaluate`.

After practice success, display correctness plus server-returned mastery before/after and deterministic supportive copy. Refetch profile and diagnosis. Do not generate a new plan automatically.

### Xiaolian `/#/xiaolian`

Retain the global AI learning Tutor. It calls the same Tutor endpoint as the embedded assistant and exposes which real learning contexts the backend reports using.

### Diagnosis `/#/diagnosis`

Continue presenting the real structured diagnosis without engineering scores. Reuse centralized status and reason-code presentation.

### Learning Report `/#/archive`

Aggregate real profile, diagnosis, current plan, and recent evidence. Show course, aggregate mastery, confidence, coverage, assessed knowledge points, primary focus, plan, horizontal knowledge-point status bars, and recent behavior. Keep the implementation lightweight and chart-library free.

## Data Flow

1. Pages mount and read profile, diagnosis, and current plan independently.
2. The learner explicitly generates a plan if none exists.
3. Starting a task stores URL/store context and records learning start evidence.
4. The embedded Tutor submits only learner ID, course ID, and message; backend context construction remains authoritative.
5. A fixed question determines only the submitted correctness, score, and difficulty.
6. Backend returns mastery before/after and persists evidence and mastery changes.
7. The workspace refetches profile and diagnosis and renders the updated state.
8. Returning to Dashboard or Report mounts fresh reads and exposes the same server state.

## Error and Empty Behavior

Core modules distinguish loading, network/server error, legitimate empty data, and ready data. Empty plans never trigger generation automatically. Tutor errors do not fabricate answers. Practice errors retain the selected answer and permit retry. Missing task or unknown static content does not crash the workspace.

## Visual Design

Use warm white surfaces, light blue emphasis, restrained green completion cues, warm orange weakness cues, gray unknown states, thin borders, medium radii, subtle shadows, and generous whitespace. Avoid large gradients, purple-led visuals, glassmorphism, cyberpunk styling, and admin-dashboard density. Optimize for 1440×900 and 1920×1080 while remaining intact at 1024px and above.

## Scope Constraints

Do not add Multi-Agent runtime, MCP integration, RAG, dynamic replanning, database schema changes, payment, membership, orders, teacher administration, or unrelated platform features. Preserve accepted backend algorithms and provider abstraction. MockTutorProvider remains an honest development fallback unless a real provider is already configured and verified without expanding scope.

## Verification

Required gates:

- `pnpm check`
- `pnpm build`
- `uv run pytest` in `apps/api`
- Real FastAPI + Vite browser demo covering Dashboard, optional generation, task start, Tutor chat, practice evaluation, profile/diagnosis refresh, Dashboard return, and Report
- 1440×900 and 1024+ visual checks
- Pollution search for payment, nuwax, datatable, checkout, billing, subscription, order_id, is_paid
- README and `.project.md` accuracy review

Use temporary or resettable demo data for mutation verification. Do not manually update database records.
