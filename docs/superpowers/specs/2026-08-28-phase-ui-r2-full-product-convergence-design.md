# EducationMind Phase UI-R2 Full Product Convergence Design

## Scope and constraints

This phase refines presentation and interaction on exactly six authenticated product pages: My Learning, Diagnosis, Exam Center, Learning Workshop, Xiaolian Chat, and Settings. Existing API contracts, account semantics, evidence, mastery, diagnosis, planning, examination, resource generation, voice, model-profile, and MCP behavior remain authoritative and unchanged. Home, Knowledge, and Archive are outside this phase except for shared compatibility fixes.

## Product direction

The recommended direction is a page-specific task scene backed by real data, with secondary controls progressively disclosed. This keeps each page recognizable by its primary student job instead of repeating a generic dashboard shell.

Alternatives considered:

1. A shared dashboard-card system across all six pages would be visually consistent but would preserve the current problem: too many equal-weight cards and no dominant task.
2. A CSS-only visual reskin would be low-risk but cannot fix first-screen hierarchy, empty-state meaning, or technical-detail overload.
3. Page-specific semantic scenes with shared primitives is selected. It changes composition and disclosure without changing business rules or data truth.

## Information hierarchy

- Level 1: the page's primary student task and its current real state.
- Level 2: context, next actions, and supporting evidence.
- Level 3: authoring tools, provider details, traces, credentials, and advanced service settings, hidden behind tabs or disclosure controls.

## Page designs

### My Learning — Growth Route

The active plan becomes a continuous ordered journey. A compact route header reports generation time, strategy, and task count. Real plan tasks remain in server order and retain the existing explicit start dialog. The no-plan state becomes a small invitation scene with the exact action “让小涟帮我建立第一条学习路线”; the generate API is invoked only after that click.

### Diagnosis — Learning Observation Space

One top focus and the distribution of real diagnosis states lead the page. The knowledge map becomes selectable. Selecting a point opens an inspector that shows status, evidence count, mastery and confidence only when assessed, reasons, and available current-plan relationship. Unknown and insufficient evidence remain visually neutral and never become zero-percent weakness. “Proficient” and “mastered” stay distinct.

### Exam Center — Assessment Workspace

The default layer is the real published-exam catalog, including in-progress and recent state already supplied by the API. When no exam exists, the scene truthfully explains that no published exam is available and offers authoring entries without inventing one. Results, question bank/types, paper builder/review, and AI generation remain available as secondary workspace tabs.

### Learning Workshop — Creation Workspace

The resource tool becomes a left-side creation flow and an always-present right preview canvas. The flow communicates: choose knowledge point, choose output mode, generate, then preview/edit/export. Because the current API does not provide persistence for edits, preview editing is limited to a local editable preview and does not claim server persistence. Network search and compiler simulation remain secondary tools with their existing security boundaries.

### Xiaolian Chat — Conversation Core

The message stream and composer occupy the dominant width. Capability cards and provider status bars leave the default view. Quick prompts appear only before the student has sent a message. Voice input/output remains immediately usable. Context, suggestions, sources, agent/tool traces, provider/model, and voice attribution are grouped into collapsed details; no chain-of-thought is exposed.

### Settings — Preference and Service Space

The first view prioritizes appearance, active conversation model, and active voice model. Appearance is the initially expanded section. Model creation, voice configuration, MCP tokens, and account/security explanations use section disclosure; only one main section is open at a time. API keys and tokens are never first-screen dominant, and all existing validation and account-scoped API behavior remains intact.

## Xiaolian presence

Existing character assets and components are reused. My Learning and Workshop use a medium teaching/encouraging presence; Diagnosis uses the existing companion rail and focus guidance; Chat uses a compact conversational avatar. Exam and Settings use restrained icon-led headers so the character does not become decorative repetition.

## Responsive behavior

- 1440×900: primary scene and context can coexist; authoring and preview use two columns where appropriate.
- 1024×900: layouts collapse to a single content column before controls become cramped.
- 390×844: navigation strips are horizontally scrollable only inside their own containers; cards, forms, and dialogs occupy the viewport width; the page body must not overflow horizontally.

## Truth and empty states

Loading, error, and empty states never substitute simulated plans, diagnoses, exams, resources, agents, models, or online MCP status. Resource preview may show a clearly labelled structural guide before generation, not a generated result. All percentages are sourced from existing APIs and are withheld for unassessed points.

## Verification strategy

Presentation contracts are asserted by focused Vitest tests before implementation. Completion requires focused tests, the full frontend suite, TypeScript and lint gate, production build, backend regression suite, whitespace validation, and authenticated browser audits at desktop, tablet, and mobile viewports with console and horizontal-overflow checks.
