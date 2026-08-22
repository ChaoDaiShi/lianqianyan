# EducationMind 星海学院 UI 重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变任何后端、数据库、API 契约与教育业务语义的前提下，将 EducationMind 前端重构为“星海学院工作台”式 AI 学习伙伴产品。

**Architecture:** 新增 `src/design/` 作为唯一视觉 token 与 motion 层，以聚焦的产品组件承载玻璃表面、星云背景、学习星轨、角色徽记、成长指标、任务卡和知识星图。现有页面继续调用原来的 hooks/API；页面只重新组合真实 Profile、Diagnosis、Current Plan、Knowledge、Tutor、Evidence 与 Tool Catalog 数据，不复制或修改业务逻辑。

**Tech Stack:** React 18、TypeScript 5、Vite 5、React Router hash mode、Tailwind CSS 3、Lucide React、Zustand、framer-motion、pnpm。

## Global Constraints

- 只修改 React/Vite 前端表现层、前端依赖/config 与本计划文档；不得修改 `apps/api/`、数据库、领域算法、API 契约或后端文档。
- 保持 `src/lib/educationApi.ts` 的 endpoint、request/response mapper 与既有 hooks 行为不变。
- Primary 必须为 `#8B7CF6`，Secondary 必须为 `#6CA8FF`，Accent 必须为 `#FF9FCB`。
- 大面板圆角为 `28px`，普通面板圆角为 `20px`；动效范围为 `180–420ms`。
- 只新增 `framer-motion`；不得引入大型 UI 框架、图表库、Live2D、远程图片或新的 Agent/MCP 功能。
- `UNASSESSED` / `INSUFFICIENT_EVIDENCE` 不显示 `0%`，不渲染为薄弱状态。
- Current Plan、显式 generate/replan、practice evaluate 与 practice 后 Profile/Diagnosis/Plan 刷新语义必须保持不变。
- 全局小涟仍是明确的 Mock UI 边界；`XiaolianPage` 与 `SpaceTutor` 继续使用真实 Agent API，不宣称新增会话记忆。
- 所有新增图片引用集中于 `src/assets/xiaolian/manifest.ts`；首版仅使用本地 CSS/SVG 徽记与装饰。
- 页面不得造成 body 横向滚动；窄屏使用底部学习星轨；尊重 `prefers-reduced-motion`。
- 依照仓库契约只使用 `pnpm`，最终必须通过 `pnpm check` 与 `pnpm build`。
- 未经用户明确要求，不创建实现提交、不 push、不 merge；以工作树 diff 交付。

---

## File Structure Map

### Create

- `src/design/tokens.ts`：导出颜色、圆角、阴影、间距、持续时间及 `XiaolianStatus`。
- `src/design/theme.css`：CSS variables、星云背景、玻璃表面、滚动条、focus 与 reduced-motion。
- `src/design/motion.ts`：`pageTransition`、`staggerContainer`、`cardReveal`、`gentleHover`、`portraitMotion`。
- `src/design/index.ts`：设计层统一出口。
- `src/assets/xiaolian/manifest.ts`：角色资源槽位和本地 SVG/CSS 标识清单。
- `src/components/design/GlassPanel.tsx`：统一玻璃容器。
- `src/components/design/NebulaBackground.tsx`：纯 CSS 星云与知识粒子背景。
- `src/components/design/PageTransition.tsx`：路由页面进入容器。
- `src/components/design/XiaolianPortrait.tsx`：统一小涟角色徽记与五种 UI 状态。
- `src/components/design/GrowthMetric.tsx`：非 KPI 式真实成长指标。
- `src/components/design/QuestCard.tsx`：Current Plan task 的游戏化任务卡。
- `src/components/layout/LearningRail.tsx`：五入口桌面轨道与移动底栏。
- `src/components/layout/TopCompanionBar.tsx`：品牌、小涟状态、设置入口。
- `src/components/diagnosis/KnowledgeStarMap.tsx`：桌面星图与移动轨迹列表。
- `src/components/diagnosis/diagnosisPresentation.ts`：纯展示映射（状态色、百分比、确定性建议）。
- `src/components/feedback/LearningState.tsx`：统一 loading/error/empty 玻璃状态。

### Modify

- `package.json`、`pnpm-lock.yaml`：加入 `framer-motion`。
- `tailwind.config.js`：将 primary palette 调整为紫色，并暴露 star/companion/ink/glass tokens。
- `src/index.css`：导入 `src/design/theme.css`，替换后台蓝白全局基线。
- `src/components/layout/AppShell.tsx`：组合背景、顶部状态栏、LearningRail、页面内容与全局小涟。
- `src/components/layout/AppSidebar.tsx`：删除旧 Sidebar 实现；导航数据迁入 `LearningRail` 后移除文件引用，若无引用则删除文件。
- `src/pages/Home.tsx` 与 `src/components/home/{HeroBanner,HomeProfileCard,HomeDiagnosisCard,TodayPlanCard,CapabilitiesCard}.tsx`：重组 AI 学习驾驶舱。
- `src/pages/DiagnosisPage.tsx`：保留真实 fetch 状态机，改为学习体检报告并使用星图。
- `src/pages/LearningSpacePage.tsx`：保留任务选择、真实内容、Tutor、Practice 与刷新回调，重排三栏任务场景。
- `src/components/learning/{ModulePractice,SpaceTutor,AgentToolTrace,SourceReferences}.tsx`：统一玻璃和小涟语言，不改请求/响应语义。
- `src/pages/MyLearningPage.tsx`：计划改为成长路线，保留显式生成/重新规划。
- `src/pages/ArchivePage.tsx`：聚合数据改为成长记忆。
- `src/pages/XiaolianPage.tsx`：真实 Agent 对话改为陪伴空间，保留 Tool Catalog/Trace/Sources。
- `src/components/xiaolian/XiaolianAssistant.tsx`：使用统一肖像与状态，保持 Mock 声明。
- `src/components/PlaceholderPage.tsx`、`src/pages/PlaceholderPages.tsx`、`src/pages/NotFound.tsx`：纳入同一视觉语言，不虚构能力。

---

### Task 1: Design tokens, theme, motion, and Xiaolian asset boundary

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `tailwind.config.js:29-33,426-493`
- Modify: `src/index.css`
- Create: `src/design/tokens.ts`
- Create: `src/design/theme.css`
- Create: `src/design/motion.ts`
- Create: `src/design/index.ts`
- Create: `src/assets/xiaolian/manifest.ts`

**Interfaces:**
- Produces: `XiaolianStatus = 'idle' | 'thinking' | 'answering' | 'happy' | 'encourage'`.
- Produces: `designTokens`, `pageTransition`, `staggerContainer`, `cardReveal`, `gentleHover`, `portraitMotion`.
- Produces: `xiaolianAssets.avatarMark/backgroundMotif/decorationMotif/emptyStateMotif` as local asset identifiers, never remote URLs.

- [ ] **Step 1: Install the only new runtime dependency**

Run:

```bash
pnpm add framer-motion
```

Expected: `package.json` contains `"framer-motion"` under dependencies and `pnpm-lock.yaml` updates without changing the package manager.

- [ ] **Step 2: Add the typed token contract**

Create `src/design/tokens.ts` with concrete values:

```ts
export type XiaolianStatus =
  | 'idle'
  | 'thinking'
  | 'answering'
  | 'happy'
  | 'encourage';

export const designTokens = {
  color: {
    primary: '#8B7CF6',
    secondary: '#6CA8FF',
    accent: '#FF9FCB',
    ink: '#29234A',
    mutedInk: '#6F6A8A',
    canvas: '#F7F4FF',
  },
  radius: { panel: 28, surface: 20, control: 14 },
  duration: { quick: 180, standard: 280, ambient: 420 },
  shadow: {
    glass: '0 24px 70px rgba(87, 73, 151, 0.12)',
    glow: '0 16px 42px rgba(139, 124, 246, 0.24)',
  },
} as const;
```

- [ ] **Step 3: Add framer-motion presets**

Create `src/design/motion.ts` with typed variants using opacity and transforms only:

```ts
import type { Variants } from 'framer-motion';

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } },
};
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
export const cardReveal: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
};
export const gentleHover = { y: -3, transition: { duration: 0.18 } } as const;
export const portraitMotion: Variants = {
  idle: { y: [0, -4, 0], transition: { duration: 4, repeat: Infinity } },
  thinking: { scale: [1, 1.03, 1], transition: { duration: 1.4, repeat: Infinity } },
  answering: { y: [0, -3, 0], transition: { duration: 1.1, repeat: Infinity } },
  happy: { rotate: [0, -2, 2, 0], transition: { duration: 0.6 } },
  encourage: { scale: [1, 1.04, 1], transition: { duration: 0.9 } },
};
```

- [ ] **Step 4: Add CSS theme and local asset manifest**

`theme.css` must define `--em-primary`, `--em-secondary`, `--em-accent`, `--em-ink`, `--em-muted-ink`, `--em-canvas`, `--em-panel-radius`, `--em-surface-radius`, `--em-glass-border`, `--em-glass-bg`, `.em-nebula`, `.em-glass`, `.em-focus-ring`, scrollbar styling, and a `prefers-reduced-motion` block. `manifest.ts` must export only stable local identifiers:

```ts
export const xiaolianAssets = {
  avatarMark: 'xiaolian-orbit-mark',
  backgroundMotif: 'xiaolian-memory-ripple',
  decorationMotif: 'xiaolian-star-petal',
  emptyStateMotif: 'xiaolian-sleeping-star',
} as const;
```

Import `./design/theme.css` immediately after Tailwind directives in `src/index.css`, set body to the canvas/ink variables, and update Tailwind primary/star/companion/ink colors.

- [ ] **Step 5: Verify design foundation**

Run:

```bash
pnpm type-check
pnpm lint
```

Expected: both exit 0; no import, variant, or CSS-related TypeScript/ESLint errors.

- [ ] **Step 6: Inspect the task diff without committing**

Run:

```bash
git diff -- package.json pnpm-lock.yaml tailwind.config.js src/index.css src/design src/assets/xiaolian
```

Expected: only dependency/design-layer changes; no backend files.

---

### Task 2: Shared visual primitives and responsive learning shell

**Files:**
- Create: `src/components/design/GlassPanel.tsx`
- Create: `src/components/design/NebulaBackground.tsx`
- Create: `src/components/design/PageTransition.tsx`
- Create: `src/components/design/XiaolianPortrait.tsx`
- Create: `src/components/design/GrowthMetric.tsx`
- Create: `src/components/design/QuestCard.tsx`
- Create: `src/components/layout/LearningRail.tsx`
- Create: `src/components/layout/TopCompanionBar.tsx`
- Create: `src/components/feedback/LearningState.tsx`
- Modify: `src/components/layout/AppShell.tsx`
- Delete after reference removal: `src/components/layout/AppSidebar.tsx`

**Interfaces:**
- `GlassPanel({ children, className?, as?, interactive? })` renders one semantic glass surface.
- `PageTransition({ children, className? })` wraps page content in reduced-motion-aware motion.
- `XiaolianPortrait({ status?, size?, message?, className? })` accepts `XiaolianStatus` and uses no image URL.
- `GrowthMetric({ label, value, hint?, tone? })` renders real values or honest unknown text.
- `QuestCard({ task, index, active?, pending?, onStart? })` consumes `PersistedStudyTask` directly.
- `LearningState({ kind, title, description, action? })` handles `loading | error | empty`.

- [ ] **Step 1: Establish a compile-red shell contract**

Modify `AppShell.tsx` imports first to reference `NebulaBackground`, `TopCompanionBar`, `LearningRail`, and `PageTransition` before those files exist.

Run:

```bash
pnpm type-check
```

Expected: FAIL only because the new component modules cannot be found. This confirms the shell is the consumer contract being built.

- [ ] **Step 2: Implement the six focused design primitives**

Use `cn`, semantic elements, explicit props and motion presets. `QuestCard` must derive difficulty deterministically from `task.actionType` and may only say “完成后形成学习证据并更新状态”; it must never fabricate XP, points, streaks, or mastery gain.

Core signatures:

```tsx
export interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'article' | 'div';
  interactive?: boolean;
}

export interface XiaolianPortraitProps {
  status?: XiaolianStatus;
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

export interface QuestCardProps {
  task: PersistedStudyTask;
  index: number;
  active?: boolean;
  pending?: boolean;
  onStart?: () => void;
}
```

- [ ] **Step 3: Implement the navigation and top companion bar**

`LearningRail` must contain exactly these five route items:

```ts
[
  { label: '首页', to: '/', icon: Home },
  { label: '我的学习', to: '/my-learning', icon: GraduationCap },
  { label: '学习诊断', to: '/diagnosis', icon: Stethoscope },
  { label: '知识空间', to: '/knowledge', icon: BookOpen },
  { label: '学习档案', to: '/archive', icon: FolderOpen },
]
```

Render a narrow fixed desktop rail at `md` and above, and a fixed bottom nav below `md`. `TopCompanionBar` must link settings to `/settings`, link the brand to `/`, show “小涟在线陪伴”, and avoid claiming LLM connectivity.

- [ ] **Step 4: Recompose AppShell**

Use this structural contract:

```tsx
<div className="relative min-h-screen overflow-x-clip bg-[var(--em-canvas)] text-[var(--em-ink)]">
  <NebulaBackground />
  <TopCompanionBar />
  <LearningRail currentPath={location.pathname} />
  <main className="relative z-10 pb-28 pt-20 md:pb-10 md:pl-24">
    <PageTransition className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10">
      {children}
    </PageTransition>
  </main>
  <XiaolianAssistant />
</div>
```

The shell must not change route contracts or own page data.

- [ ] **Step 5: Verify shell and accessibility baseline**

Run:

```bash
pnpm check
```

Expected: exit 0; the earlier missing-module failures are resolved; no unused old Sidebar import remains.

Run:

```bash
git diff --check
```

Expected: no whitespace errors.

---

### Task 3: Home learning cockpit

**Files:**
- Modify: `src/pages/Home.tsx`
- Modify: `src/components/home/HeroBanner.tsx`
- Modify: `src/components/home/HomeProfileCard.tsx`
- Modify: `src/components/home/HomeDiagnosisCard.tsx`
- Modify: `src/components/home/TodayPlanCard.tsx`
- Modify: `src/components/home/CapabilitiesCard.tsx`

**Interfaces:**
- Existing Profile, Diagnosis and Current Plan hooks/API calls remain in their current home components.
- Home composition produces a cockpit hero, four growth metrics, real plan quests, and an honest capability/companion panel.
- `QuestCard` consumes existing `PersistedStudyTask`; existing `useStartPlanTask` call remains the only task-start write path.

- [ ] **Step 1: Create a compile-red cockpit composition**

Change `Home.tsx` to the target hierarchy before completing child props:

```tsx
<AppShell>
  <div className="space-y-6 lg:space-y-8">
    <HeroBanner courseName="操作系统" />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(20rem,0.85fr)]">
      <div className="space-y-6"><TodayPlanCard /><CapabilitiesCard /></div>
      <div className="space-y-6"><HomeProfileCard /><HomeDiagnosisCard /></div>
    </div>
  </div>
</AppShell>
```

Run `pnpm type-check`; expected FAIL only for newly introduced prop/interface mismatches, proving the composition contract.

- [ ] **Step 2: Rebuild the hero as an API-backed cockpit**

Preserve existing hooks and actions in `HeroBanner`. The left side must show greeting, course, current objective, mastery/confidence when available, today advice and existing continue/ask actions. The right side must use `<XiaolianPortrait status="encourage" size="lg" />` with CSS particles. Unknown mastery must read “等待更多学习证据”, never `0%`.

- [ ] **Step 3: Rebuild growth and diagnosis surfaces**

Use `GrowthMetric` for:

```ts
[
  ['综合掌握度', profile.overallMastery],
  ['学习可信度', profile.overallConfidence],
  ['当前阶段', deterministicStage],
  ['成长记录', `${profile.assessedCount}/${profile.totalKnowledgePoints} 个知识点已有评估`],
]
```

`deterministicStage` must map only from real coverage/mastery/status and use “探索期 / 建构期 / 巩固期 / 进阶期”; no streak is allowed. `HomeDiagnosisCard` must keep primary-focus semantics and unassessed honesty.

- [ ] **Step 4: Rebuild today tasks with QuestCard**

Keep `useCurrentPlan`, explicit empty/error states, and `useStartPlanTask`. Render plan tasks with `QuestCard`; use current title, estimated minutes and action type. Preserve the route/query/store transition performed by the existing task-start hook.

- [ ] **Step 5: Verify Home compile and data boundaries**

Run:

```bash
pnpm check
```

Expected: exit 0.

Search production Home files for fabricated claims:

```bash
rg -n "连续|streak|经验值|XP|\+\d+%|积分" src/pages/Home.tsx src/components/home
```

Expected: no fabricated reward/streak matches.

---

### Task 4: Diagnosis health report and knowledge star map

**Files:**
- Create: `src/components/diagnosis/diagnosisPresentation.ts`
- Create: `src/components/diagnosis/KnowledgeStarMap.tsx`
- Modify: `src/pages/DiagnosisPage.tsx`

**Interfaces:**
- `getDiagnosisTone(status: DiagnosisStatus): DiagnosisTone` returns label, node, glow, badge and text classes.
- `formatDiagnosisPercent(value, assessed): string` returns `--` for unassessed/insufficient evidence.
- `buildDiagnosisAdvice(diagnosis: DiagnosisResult): string[]` preserves the exact deterministic semantics of the current `buildAdvice`.
- `KnowledgeStarMap({ points, primaryFocusId? })` consumes `KnowledgePointDiagnosis[]` and never infers new scores.

- [ ] **Step 1: Extract presentation logic with a compile-red import**

Replace local `statusTone`, `pct`, and `buildAdvice` references in `DiagnosisPage.tsx` with imports from `diagnosisPresentation.ts` before creating it.

Run `pnpm type-check`; expected FAIL because the module is missing.

- [ ] **Step 2: Implement deterministic display helpers**

Use exact status semantics:

```ts
const DIAGNOSIS_TONES = {
  unassessed: { node: 'bg-slate-300', glow: 'shadow-slate-300/40' },
  insufficient_evidence: { node: 'bg-slate-300', glow: 'shadow-slate-300/40' },
  weak: { node: 'bg-fuchsia-500', glow: 'shadow-fuchsia-400/50' },
  developing: { node: 'bg-sky-500', glow: 'shadow-sky-400/50' },
  proficient: { node: 'bg-gradient-to-br from-sky-400 to-amber-300', glow: 'shadow-sky-300/50' },
  mastered: { node: 'bg-amber-300', glow: 'shadow-amber-300/60' },
} as const;
```

Move the current advice wording without semantic changes. The formatter must require `assessed === true` before returning a percentage.

- [ ] **Step 3: Implement KnowledgeStarMap**

Desktop: render an accessible `<ol>` with responsive grid positions, connecting gradient lines, status legend and buttons/nodes carrying `aria-label` with name, status, evidence count, mastery (only when assessed), confidence. Mobile: switch to a vertical trajectory with no absolute positioning and no horizontal overflow.

- [ ] **Step 4: Recompose DiagnosisPage**

Keep the existing `Promise.all(fetchLearnerProfile, fetchDiagnosis)` state machine and cancellation guard unchanged. Replace the visual sections with:

1. “学习体检报告” hero and real course/coverage state.
2. Three `GrowthMetric` cards.
3. Xiaolian analysis panel using `buildDiagnosisAdvice`.
4. `KnowledgeStarMap` using all profile knowledge points.
5. Primary focus and unknown-evidence detail surfaces.

Use `LearningState` for loading/error/empty; error state must preserve the existing honest message. Do not add mock fallback data.

- [ ] **Step 5: Verify diagnosis invariants**

Run:

```bash
pnpm check
```

Expected: exit 0.

Inspect these conditions in the diff:

```bash
rg -n "fetchLearnerProfile|fetchDiagnosis|unassessed|insufficient_evidence|masteryScore" src/pages/DiagnosisPage.tsx src/components/diagnosis
```

Expected: both real fetches remain; unknown statuses have explicit branches; mastery percentage rendering is guarded by assessed status.

---

### Task 5: Game-like Learning Space without changing practice/replanning

**Files:**
- Modify: `src/pages/LearningSpacePage.tsx`
- Modify: `src/components/learning/ModulePractice.tsx`
- Modify: `src/components/learning/SpaceTutor.tsx`
- Modify: `src/components/learning/AgentToolTrace.tsx`
- Modify: `src/components/learning/SourceReferences.tsx`

**Interfaces:**
- Existing `SpaceTutorProps` remains `{ knowledgePointId?: string; knowledgePointName?: string; quickQuestions?: string[] }`.
- Existing `ModulePracticeProps.onPracticeComplete(replanning): Promise<boolean> | boolean` remains unchanged.
- Existing `useCurrentPlan`, `useLearnerProfile`, `useDiagnosis`, `useKnowledgePoint`, `useStartPlanTask`, `useAgentChat` call sites remain.

- [ ] **Step 1: Capture the protected callback before editing**

Record and preserve this exact behavioral branch in the page:

```tsx
onPracticeComplete={async (replanning) => {
  const [profileUpdated, diagnosisUpdated, planUpdated] = await Promise.all([
    profile.refetch(),
    diagnosis.refetch(),
    replanning.status === 'performed' ? refetch() : Promise.resolve(true),
  ]);
  return profileUpdated && diagnosisUpdated && planUpdated;
}}
```

Run `pnpm type-check`; expected: PASS before restructuring.

- [ ] **Step 2: Recompose the ready state into the three-column task scene**

Use desktop `xl:grid-cols-[17rem_minmax(0,1fr)_22rem]`:

- Left glass panel: current knowledge point, action type, minutes, current diagnosis state and task objective.
- Middle: real `knowledge.data?.sections ?? module.points` content, key insight and `ModulePractice`.
- Right: sticky `SpaceTutor` with unified Xiaolian portrait/status.

Mobile DOM order must be task → content → Tutor → practice. Achieve this with explicit `order-*` classes while keeping the practice component and callback intact.

- [ ] **Step 3: Convert task selection to QuestCard**

Keep the URL/store task resolution and `handleStartTask`. Render up to the same three current plan tasks as `QuestCard`. Keep `startError`, `refetch`, homepage link and no-plan behavior.

- [ ] **Step 4: Restyle practice and real tutor surfaces**

Wrap `ModulePractice` and `SpaceTutor` in glass styling, use purple/star-blue controls and status feedback, but do not alter:

- `evaluatePractice` payload.
- before/after mastery values from the server.
- dynamic replanning status messages.
- `useAgentChat` request.
- real `AgentToolTrace` and `SourceReferences` rendering.

Set Xiaolian UI state to `thinking` while `pending`, `answering` for assistant messages, and `idle` otherwise.

- [ ] **Step 5: Verify protected behavior and compilation**

Run:

```bash
pnpm check
rg -n "evaluatePractice|onPracticeComplete|profile\.refetch|diagnosis\.refetch|replanning\.status === 'performed'|useAgentChat|AgentToolTrace|SourceReferences" src/pages/LearningSpacePage.tsx src/components/learning
```

Expected: check exits 0 and every protected call remains visible.

---

### Task 6: Growth route and growth memory pages

**Files:**
- Modify: `src/pages/MyLearningPage.tsx`
- Modify: `src/pages/ArchivePage.tsx`

**Interfaces:**
- `MyLearningPage` continues to use `useCurrentPlan` and `useStartPlanTask` only.
- `ArchivePage` continues to aggregate `useLearnerProfile`, `useDiagnosis`, `useCurrentPlan`, and `useRecentEvidence`.
- Both pages consume shared `GlassPanel`, `GrowthMetric`, `QuestCard`, `XiaolianPortrait`, and `LearningState`.

- [ ] **Step 1: Rebuild My Learning as “成长路线”**

Retain `formatTime`, plan strategy mapping, `generate()`, `generating`, `refetch`, `startTask(plan, task)`, and all error/empty semantics. Present current plan metadata as route header and each task as a connected star checkpoint. The button text remains “生成学习计划” / “重新规划”; state copy must still explain that a new plan replaces the current plan.

- [ ] **Step 2: Verify explicit-write semantics**

Run:

```bash
rg -n "generate\(|startTask\(|重新规划|取代|useCurrentPlan|useStartPlanTask" src/pages/MyLearningPage.tsx
pnpm type-check
```

Expected: the two write paths remain explicit and type-check exits 0.

- [ ] **Step 3: Rebuild Archive as “成长记忆”**

Keep the existing loading/error combination and `reloadAll()` calls. Reframe sections as:

- Current course and three real growth metrics.
- “此刻最值得记住” primary focus.
- “当前星轨” current plan tasks.
- “知识星点” knowledge statuses, preserving unknown-as-unknown.
- “最近记忆片段” recent evidence with real timestamps.

Do not add charts, streaks, invented history or client-computed progress.

- [ ] **Step 4: Verify Archive data aggregation**

Run:

```bash
rg -n "useLearnerProfile|useDiagnosis|useCurrentPlan|useRecentEvidence|reloadAll|尚未评估" src/pages/ArchivePage.tsx
pnpm check
```

Expected: all four hooks remain and check exits 0.

---

### Task 7: Unified Xiaolian experience, traces, catalog, and honest auxiliary pages

**Files:**
- Modify: `src/components/xiaolian/XiaolianAssistant.tsx`
- Modify: `src/pages/XiaolianPage.tsx`
- Modify: `src/components/learning/AgentToolTrace.tsx`
- Modify: `src/components/learning/SourceReferences.tsx`
- Modify: `src/components/PlaceholderPage.tsx`
- Modify: `src/pages/PlaceholderPages.tsx`
- Modify: `src/pages/NotFound.tsx`

**Interfaces:**
- Global assistant keeps `useAssistantStore` and local mock messages.
- `XiaolianPage` keeps `chatWithAgents`, `useLlmStatus`, and `useToolCatalog`.
- `AgentToolTrace({ items, compact? })` and `SourceReferences({ sources })` signatures remain compatible.

- [ ] **Step 1: Unify the global assistant without crossing its boundary**

Use `XiaolianPortrait` for the floating entry and panel header. Add a typed local `XiaolianStatus` derived as `thinking` during the existing 500ms mock response, `answering` after response and `idle` otherwise. Keep explicit copy such as:

```text
这里是全局界面演示入口；需要真实学习辅导时，请进入“小涟学习中枢”或具体学习任务。
```

Add a visible route action to `/xiaolian`. Do not call a new API, claim memory, or remove the existing mock boundary comment.

- [ ] **Step 2: Rebuild the real Xiaolian page as a companion workspace**

Preserve `chatWithAgents` request payload, capability chips, provider status, Tool Catalog, real trace, Sources and errors. Use a two-pane layout at desktop: companion/context panel + conversation panel. Tool catalog entries continue to render `tool.name`, `tool.description`, `tool.capability`, and read-only/write state from `GET /api/tools`; do not hardcode the count.

- [ ] **Step 3: Restyle trace and sources**

Keep trace order and type distinction. Agent nodes use larger soft cards, Tool nodes use compact monospace pills, and failed status stays visible. Sources remain clearly labeled evidence/knowledge references rather than decorative tags.

- [ ] **Step 4: Restyle auxiliary pages honestly**

Use `GlassPanel`, `XiaolianPortrait` and the nebula language for Knowledge, Resources, Settings, About and NotFound. Replace admin wording such as “结构化管理” with honest current-state copy. Placeholder pages may say “这个学习空间仍在汇聚中” but must not claim search, resource generation, account management or model configuration works when it does not.

- [ ] **Step 5: Verify real/mock boundary and catalog integrity**

Run:

```bash
rg -n "chatWithAgents|useToolCatalog|AgentToolTrace|SourceReferences|Mock|演示入口|记忆能力" src/pages/XiaolianPage.tsx src/components/xiaolian/XiaolianAssistant.tsx
pnpm check
```

Expected: real page integrations remain; global boundary remains explicit; check exits 0.

---

### Task 8: Full verification, actual app drive, screenshots, and review

**Files:**
- Review all modified frontend/config/plan files.
- Do not modify backend files.

**Interfaces:**
- Acceptance routes: `/#/`, `/#/diagnosis`, `/#/space`, `/#/my-learning`, `/#/archive`, `/#/xiaolian`, `/#/knowledge`, `/#/settings`.
- Required gates: `pnpm check`, `pnpm build`, actual Vite launch and user-visible route interaction.

- [ ] **Step 1: Run fresh static gates**

Run:

```bash
pnpm check
pnpm build
```

Expected: both exit 0; TypeScript, ESLint and production bundling report zero errors.

- [ ] **Step 2: Prove scope containment**

Run:

```bash
git status --short
git diff --name-only
git diff --check
```

Expected: no path under `apps/api/`, database files, generated `dist/`, secrets or environment files; diff check has no whitespace errors.

- [ ] **Step 3: Launch the actual application**

Run Vite in the background using the repository command:

```bash
pnpm dev --host 127.0.0.1
```

Wait for the Vite ready URL. If the API must also be running for real data and no project launch skill exists, use the documented existing API command without changing backend code. Do not treat a build as runtime verification.

- [ ] **Step 4: Drive desktop routes and inspect screenshots**

Use an available browser driver (prefer the environment’s existing browser tool or `chromium-cli`, not a new Playwright dependency) to open and interact with:

1. Home: real cockpit values/unknown states and Continue action.
2. Diagnosis: star map, primary focus, evidence/confidence labels.
3. My Learning: route checkpoints and explicit replan button.
4. Learning Space: select a task, see content/Tutor/practice, submit no destructive test unless using demo data as already intended.
5. Archive: real aggregate memory sections.
6. Xiaolian: Tool Catalog and real Agent/Tool trace after a representative demo question.

Capture desktop screenshots at approximately `1440×1000` and inspect each image for clipping, layering, unreadable contrast, blank frames, and body horizontal overflow.

- [ ] **Step 5: Drive narrow-screen routes**

At approximately `390×844`, verify Home, Diagnosis and Learning Space. Confirm bottom LearningRail, mobile star trajectory, task → content → Xiaolian → practice order, accessible controls, and no horizontal overflow. Capture and inspect screenshots when the driver supports it.

If no browser driver is available, do not install Playwright. Record the exact unavailable command/tool and report runtime URL/HTTP evidence without claiming screenshot verification.

- [ ] **Step 6: Review requirements line by line**

Verify:

- Five-item star rail only; settings in top bar; `/space` remains task-entered.
- All Profile/Diagnosis/Plan/Knowledge/Tutor/Evidence/Tool Catalog integrations are real.
- Unknown diagnosis is never weak or `0%`.
- No fake streak, XP, mastery increase, reward number or backend memory claim.
- `framer-motion` uses lightweight transforms/opacity and reduced-motion is respected.
- No remote image URL, Live2D, chart library or large UI framework.
- Error/loading/empty states do not fall back to mock learner data.

- [ ] **Step 7: Final diff review and report inputs**

Run:

```bash
git diff --stat
git status --short --branch
```

Prepare the final response with exactly the requested evidence categories:

1. 修改文件列表。
2. 新 UI 架构说明。
3. 页面截图验证情况（including honest unavailable-driver limitations）。
4. Fresh `pnpm check` and `pnpm build` results。
5. Exact `git status`。

Do not commit, push or merge unless the user explicitly requests it after reviewing the implementation.
