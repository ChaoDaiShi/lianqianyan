# Learning Workshop Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/resources` into a complete learning workshop UI for grounded resource generation, Wikipedia learning search, and safe compiler simulation, then document and verify the end-to-end product.

**Architecture:** Typed API adapters map backend snake_case contracts once, focused panels own their request state, and a route-level page composes them through the existing Radix Tabs and glass design system. The workshop is discoverable from the learning rail and exposes honest source/safety labels in every state.

**Tech Stack:** React 18, TypeScript, Axios, Radix Tabs, Tailwind CSS, Lucide, Vitest, Vite, FastAPI.

## Global Constraints

- Reuse `src/components/ui`, `GlassPanel`, `AppShell`, and existing API patterns.
- The UI must say “联网学习检索 · Wikipedia”, “教学模拟，不执行本机程序”, and “基于课程材料模板生成”.
- External links use `target="_blank" rel="noreferrer"`.
- No network result becomes diagnosis, mastery, or course evidence.
- Downloads are UTF-8 Markdown created in the browser from the exact API response.
- The only new public path is the existing `/resources`; do not add an unnecessary second lab route.

## File map

- Modify `src/lib/educationApi.ts`: typed request/response adapters.
- Extend `src/lib/educationApi.test.ts`: response mapping tests through exported pure mappers.
- Create `src/components/workshop/ResourceGenerator.tsx`.
- Create `src/components/workshop/NetworkSearchPanel.tsx`.
- Create `src/components/workshop/CompilerLab.tsx`.
- Create `src/components/workshop/workshopPresentation.ts` and test: constants/examples/download helpers.
- Create `src/pages/ResourcesPage.tsx` and page test.
- Modify `src/router/routeManifest.ts` and test.
- Modify `src/components/layout/LearningRail.tsx` and add rail test.
- Modify `src/pages/PlaceholderPages.tsx`: remove only the old `ResourcesPage` export.
- Modify `README.md`, `docs/skills/README.md` if it catalogs capabilities, and capability copy that still lists these features as absent.

---

### Task 1: Typed workshop API client

**Files:**
- Modify: `src/lib/educationApi.ts`
- Modify: `src/lib/educationApi.test.ts`

**Interfaces:**
- Produces: `searchNetwork(params): Promise<NetworkSearchResponse>`.
- Produces: `simulateCompile(code): Promise<CompileSimulationResponse>`.
- Produces: `generateLearningResource(params): Promise<GeneratedResource>`.
- Produces exported pure `mapNetworkSearch`, `mapCompileSimulation`, and `mapGeneratedResource` for contract tests.

- [ ] **Step 1: Write failing pure mapping tests**

Use representative snake_case fixtures and assert exact camelCase output, including `source_domain -> sourceDomain`, `safety_notice -> safetyNotice`, `generation_mode -> generationMode`, and `source_sections -> sourceSections`. Assert missing arrays map to `[]`, never `undefined`.

Run: `pnpm test -- --run src/lib/educationApi.test.ts`

Expected: FAIL because the mappers are not exported.

- [ ] **Step 2: Add exact TypeScript contracts**

```ts
export interface NetworkSearchResult { title: string; summary: string; url: string; sourceDomain: string }
export interface NetworkSearchResponse { provider: 'wikipedia'; query: string; results: NetworkSearchResult[] }
export type CompileStageName = 'preprocess'|'syntax'|'semantic'|'link'|'run';
export interface CompileStage { name: CompileStageName; label: string; status: 'passed'|'failed'|'skipped' }
export interface CompileDiagnostic { stage: CompileStageName; severity: 'error'|'warning'; line: number|null; code: string; message: string }
export interface CompileSimulationResponse { success: boolean; language: 'c-edu'; mode: 'simulation'; stages: CompileStage[]; diagnostics: CompileDiagnostic[]; stdout: string; safetyNotice: string }
export type ResourceType = 'study_sheet'|'flashcards'|'quiz'|'mind_map'|'study_plan';
export interface GeneratedResource { title: string; resourceType: ResourceType; format: 'markdown'; content: string; generationMode: 'course_template'; sourceSections: string[]; filename: string }
```

- [ ] **Step 3: Implement mappers and HTTP functions**

Post to `/api/network/search`, `/api/lab/compile-simulate`, and `/api/resources/generate`. Keep all snake_case request construction in these functions. The compiler always sends `{ language: 'c-edu', code }`.

- [ ] **Step 4: Run tests and type check**

Run:

```powershell
pnpm test -- --run src/lib/educationApi.test.ts
pnpm type-check
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/lib/educationApi.ts src/lib/educationApi.test.ts
git commit -m "feat: add typed learning workshop API client"
```

### Task 2: Workshop presentation primitives

**Files:**
- Create: `src/components/workshop/workshopPresentation.ts`
- Test: `src/components/workshop/workshopPresentation.test.ts`

**Interfaces:**
- Produces: `WORKSHOP_KNOWLEDGE_POINTS`, `RESOURCE_TYPES`, `COMPILER_EXAMPLES`.
- Produces: `downloadMarkdown(resource, documentRef?, urlApi?)` with injectable browser objects for tests.
- Produces: `stageTone(status)` and `resultCountLabel(count)`.

- [ ] **Step 1: Write failing tests**

Assert five unique resource types, five OS knowledge points with IDs matching backend seed, one valid and one intentionally broken compiler example, correct Chinese count labels, and a download helper that creates an `text/markdown;charset=utf-8` Blob, sets the server filename, clicks once, revokes the object URL, and removes its temporary anchor.

Run: `pnpm test -- --run src/components/workshop/workshopPresentation.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 2: Implement constants and helpers**

Use the existing OS knowledge IDs exactly: `kp-process-concept`, `kp-process-sync`, `kp-pv`, `kp-deadlock`, `kp-scheduling`. Do not duplicate course content—only labels and example source code belong here.

- [ ] **Step 3: Run focused test**

Run: `pnpm test -- --run src/components/workshop/workshopPresentation.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add -- src/components/workshop/workshopPresentation.ts src/components/workshop/workshopPresentation.test.ts
git commit -m "feat: add learning workshop presentation model"
```

### Task 3: Resource generator panel

**Files:**
- Create: `src/components/workshop/ResourceGenerator.tsx`
- Test: `src/components/workshop/ResourceGenerator.test.tsx`

**Interfaces:**
- Consumes: `generateLearningResource`, workshop constants, and `downloadMarkdown`.
- Produces: a self-contained resource generation form and result preview.

- [ ] **Step 1: Write a failing SSR presentation test**

Render the panel and assert it contains a knowledge-point select, five resource-type options, “基于课程材料模板生成”, a generate button, and no claim containing “AI 自动生成” or “大模型生成”.

Run: `pnpm test -- --run src/components/workshop/ResourceGenerator.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 2: Implement request state and form**

Default to `kp-deadlock` + `study_sheet`. On submit clear the prior error, set loading, call the API, replace the result only on success, and show a retry-safe error without fabricated preview on failure. Disable controls while loading.

- [ ] **Step 3: Implement grounded preview actions**

Show title, source-section chips, generation-mode badge, scrollable `whitespace-pre-wrap` Markdown, “复制 Markdown”, and “下载 .md”. Copy uses `navigator.clipboard.writeText` only from a user click and reports copied/failed status in an `aria-live` region.

- [ ] **Step 4: Run test and type check**

Run: `pnpm test -- --run src/components/workshop/ResourceGenerator.test.tsx && pnpm type-check`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/components/workshop/ResourceGenerator.tsx src/components/workshop/ResourceGenerator.test.tsx
git commit -m "feat: add grounded resource generator panel"
```

### Task 4: Network search and compiler panels

**Files:**
- Create: `src/components/workshop/NetworkSearchPanel.tsx`
- Create: `src/components/workshop/CompilerLab.tsx`
- Test: `src/components/workshop/NetworkSearchPanel.test.tsx`
- Test: `src/components/workshop/CompilerLab.test.tsx`

**Interfaces:**
- Consumes: `searchNetwork`, `simulateCompile`, and compiler examples.
- Produces: two self-contained, honest learning-tool panels.

- [ ] **Step 1: Write failing presentation tests**

The search test asserts “联网学习检索 · Wikipedia”, source disclaimer, query input, and no “全网搜索” claim. The compiler test asserts “教学模拟，不执行本机程序”, editor, examples, five stage labels, and safety notice placeholder.

Run: `pnpm test -- --run src/components/workshop/NetworkSearchPanel.test.tsx src/components/workshop/CompilerLab.test.tsx`

Expected: FAIL because components do not exist.

- [ ] **Step 2: Implement network search states**

Require two trimmed characters before enabling submit. Preserve the typed query, clear stale results on a new request, and render loading, empty, failure, and success separately. Each result shows title, summary, domain, and an external source link with `target="_blank" rel="noreferrer"`.

- [ ] **Step 3: Implement compiler experiment states**

Use a monospace textarea with the valid example by default and buttons for valid/broken examples. Render returned stage cards from response data, diagnostics with error code/line, stdout in a dark `pre`, and the exact backend safety notice. Do not infer success client-side.

- [ ] **Step 4: Run focused tests and check**

Run:

```powershell
pnpm test -- --run src/components/workshop/NetworkSearchPanel.test.tsx src/components/workshop/CompilerLab.test.tsx
pnpm check
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/components/workshop/NetworkSearchPanel.tsx src/components/workshop/NetworkSearchPanel.test.tsx src/components/workshop/CompilerLab.tsx src/components/workshop/CompilerLab.test.tsx
git commit -m "feat: add network search and compiler lab panels"
```

### Task 5: Route-level learning workshop and navigation

**Files:**
- Create: `src/pages/ResourcesPage.tsx`
- Test: `src/pages/ResourcesPage.test.tsx`
- Modify: `src/pages/PlaceholderPages.tsx`
- Modify: `src/router/routeManifest.ts`
- Modify: `src/router/routeManifest.test.ts`
- Modify: `src/components/layout/LearningRail.tsx`
- Test: `src/components/layout/LearningRail.test.tsx`

**Interfaces:**
- Consumes: the three workshop panels and `XiaolianCharacter`.
- Produces: the complete existing `/resources` route and navigation entry.

- [ ] **Step 1: Write failing page and rail tests**

Mock the three panels, `AppShell`, and `XiaolianCharacter`; SSR-render `ResourcesPage` and assert all three tabs/panels, heading “学习工坊”, and honest boundary cards. Assert `learningRailItems` contains exactly one `{ label: '学习工坊', to: '/resources' }` and mobile navigation declares six columns.

Run: `pnpm test -- --run src/pages/ResourcesPage.test.tsx src/components/layout/LearningRail.test.tsx src/router/routeManifest.test.ts`

Expected: FAIL because the route still loads the placeholder and the rail lacks the item.

- [ ] **Step 2: Compose the page**

Use an `AppShell` header panel with `XiaolianCharacter size="lg"`, title/copy, and three compact boundary badges. Compose Radix `Tabs` with values `resources`, `network`, `compiler`; keep all tab content mounted only when selected according to Radix defaults.

- [ ] **Step 3: Replace the placeholder route**

Change the route lazy import from `@/pages/PlaceholderPages` to `@/pages/ResourcesPage`; remove only `ResourcesPage` and its now-unused imports from `PlaceholderPages.tsx`. The public path list does not change.

- [ ] **Step 4: Add the rail entry**

Import `WandSparkles`, append `{ label: '学习工坊', to: '/resources', icon: WandSparkles }` before the archive item, change mobile `grid-cols-5` to `grid-cols-6`, and keep desktop layout unchanged.

- [ ] **Step 5: Run focused and full frontend tests**

Run:

```powershell
pnpm test -- --run src/pages/ResourcesPage.test.tsx src/components/layout/LearningRail.test.tsx src/router/routeManifest.test.ts
pnpm test -- --run
pnpm check
pnpm build
```

Expected: focused and full test suites PASS; check and build PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- src/pages/ResourcesPage.tsx src/pages/ResourcesPage.test.tsx src/pages/PlaceholderPages.tsx src/router src/components/layout/LearningRail.tsx src/components/layout/LearningRail.test.tsx
git commit -m "feat: deliver the learning workshop UI"
```

### Task 6: Product documentation and end-to-end verification

**Files:**
- Modify: `README.md`
- Modify: capability/about copy found by exact repository search.
- Modify: `mcp/server/docs/tools.md` only if it incorrectly describes all HTTP services as MCP tools; otherwise leave it unchanged.

**Interfaces:**
- Produces: accurate setup instructions, capability boundaries, and verification evidence.

- [ ] **Step 1: Update documentation without overstating capabilities**

Add a Phase 3-6 section documenting the three endpoints, local Live2D installer command, browser TTS requirement, Wikipedia scope, compiler subset, and `course_template` resource mode. Remove only the now-false items “数字人 / TTS”, “网络搜索”, and resource placeholder from the unimplemented list; retain speech recognition, arbitrary code sandbox, and general web search as unimplemented.

- [ ] **Step 2: Scan for stale or misleading copy**

Run:

```powershell
Get-ChildItem README.md,src,docs -Recurse -File | Select-String -Pattern '资源空间仍在汇聚|数字人 / TTS|网络搜索 /|完整编译环境|AI 自动生成'
```

Expected: no stale claims remain except historical design/plan documents where the dated context is explicit.

- [ ] **Step 3: Run the complete automated gate**

Run:

```powershell
pnpm test -- --run
pnpm check
pnpm build
uv run --project apps/api pytest -q
git diff --check
git status --short
```

Expected: all tests/check/build PASS; diff check clean; only intended tracked changes plus the pre-existing untracked DOCX appear.

- [ ] **Step 4: Prove restricted assets are absent from Git and build**

Run:

```powershell
git ls-files | Select-String -Pattern 'Cyrene|\.moc3$|live2dcubismcore|\.local/'
Get-ChildItem -LiteralPath dist -Recurse -File | Select-String -Pattern 'Cyrene\.model3|Cyrene\.moc3|live2dcubismcore'
```

Expected: both commands produce no matches.

- [ ] **Step 5: Run live API smoke tests**

Start FastAPI and Vite in separate hidden processes. Call `/api/health`, `/api/network/search`, `/api/lab/compile-simulate`, and `/api/resources/generate`. Assert health 200, compiler stdout `5\n`, generated mode `course_template`, and either Wikipedia 200 with HTTPS results or a clean 503 if the network is unavailable.

- [ ] **Step 6: Run browser visual and interaction QA**

Open `/#/`, `/#/xiaolian`, `/#/space`, and `/#/resources` at desktop and mobile widths. Capture screenshots. Verify one visible Live2D instance per primary surface, no canvas overflow/jitter, no browser console errors, all three workshop tabs, compile success/error, resource preview/download, and the digital-human play/stop control. Record Web Speech limitations if the headless browser exposes no voices.

- [ ] **Step 7: Commit documentation and any verified integration fixes**

```powershell
git add -- README.md src docs ':!docs/创新赛道——开发日志参考模板.docx'
git commit -m "docs: document verified learning workshop capabilities"
```

- [ ] **Step 8: Final clean verification**

Run all commands from Step 3 again from the committed tree and record exact test totals, build chunk sizes, API smoke results, browser routes, and `git status --short` for handoff.

