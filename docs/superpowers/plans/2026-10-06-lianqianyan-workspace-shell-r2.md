# 涟千言 Workspace Shell R2 Implementation Plan

> **For agentic workers:** Execute inline in the current session. This repository explicitly forbids unannounced subagents. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 建立三级响应式左侧导航与右侧工作区，提高全站字体、按钮和结果输出的可读性与一致性。

**Architecture:** 由 `LearningRail` 和 `AppShell` 统一控制导航宽度与内容缩进；`PageIntro`、公共 Button/Input/Select 和结果组件统一字体与控件规格；业务页面只做必要的局部字号修正，不改变数据或 API。

**Tech Stack:** React 18、TypeScript、Tailwind CSS、Vitest、Playwright。

## Global Constraints

- 只使用 `pnpm`。
- 不改变路由、API、数据库、账号范围或 Agent SSE 协议。
- 对外品牌保持“涟千言”。
- 移动端五槽 Dock 行为保持不变。
- 新行为和规格先写失败测试，再实现。
- 不推送远端，不触碰 SQLite、`.env`、PPT、视频或其他交付物。

### Task 1: 三级响应式侧栏与工作区

**Files:**
- Modify: `src/components/layout/LearningRail.tsx`
- Modify: `src/components/layout/LearningRail.test.tsx`
- Modify: `src/components/layout/AppShell.tsx`
- Create: `src/components/layout/AppShell.test.tsx`
- Modify: `src/components/layout/TopCompanionBar.tsx`

- [ ] 写失败测试，要求 `data-learning-rail-mode="expanded"`、导航分组、辅助说明、`xl:w-[248px]`，以及 AppShell 的 `md:pl-[6.5rem]`、`xl:pl-[17rem]`。
- [ ] 运行布局测试确认 RED。
- [ ] 实现 md 紧凑轨道、xl 完整侧栏、内容缩进和 1600px 工作区。
- [ ] 运行布局测试和类型检查确认 GREEN。
- [ ] 提交 `feat: rebalance desktop workspace shell`。

### Task 2: 字体和控件规格

**Files:**
- Modify: `src/components/design/PageIntro.tsx`
- Modify: `src/components/design/PageIntro.test.tsx`
- Modify: `src/components/ui/button.tsx`
- Create: `src/components/ui/button.test.tsx`
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/ui/textarea.tsx`
- Modify: `src/components/ui/select.tsx`
- Modify: `src/design/theme.css`

- [ ] 写失败测试，锁定 PageIntro 30/36px 标题与 15/16px说明、Button 44/40/52px尺寸。
- [ ] 运行测试确认 RED。
- [ ] 更新公共组件与全局字体变量，减少局部小字号。
- [ ] 运行组件测试和 `pnpm type-check` 确认 GREEN。
- [ ] 提交 `feat: increase typography and control scale`。

### Task 3: 首页与通用页面密度

**Files:**
- Modify: `src/components/home/HeroBanner.tsx`
- Modify: `src/components/home/TodaysJourney.tsx`
- Modify: `src/components/home/XiaolianDailyInsight.tsx`
- Modify: `src/components/design/GlassPanel.tsx`

- [ ] 更新现有首页测试，要求主说明和指标具备新的语义字号标记。
- [ ] 运行测试确认 RED。
- [ ] 提升首页正文、观察卡、指标和路径说明字号，统一 24–32px 区块间距。
- [ ] 运行首页测试确认 GREEN。
- [ ] 提交 `feat: improve learning dashboard readability`。

### Task 4: 输出结果与流式阅读体验

**Files:**
- Modify: `src/components/content/MarkdownText.tsx`
- Modify: `src/components/content/MarkdownText.test.tsx`
- Modify: `src/components/xiaolian/StreamingResponse.tsx`
- Modify: `src/components/xiaolian/StreamingResponse.test.tsx`
- Modify: `src/components/learning/AgentToolTrace.tsx`
- Modify: `src/components/learning/AgentToolTrace.test.tsx`
- Modify: `src/components/learning/SourceReferences.tsx`
- Modify: `src/pages/XiaolianPage.tsx`

- [ ] 写失败测试，锁定 Markdown 段落/标题、流式正文、Trace 与来源的新字号和间距。
- [ ] 运行测试确认 RED。
- [ ] 实现统一的 15–16px / 28px 输出排版、40px结果动作和更清晰的来源卡。
- [ ] 运行输出组件与小涟页面测试确认 GREEN。
- [ ] 提交 `feat: improve generated result readability`。

### Task 5: 集成与浏览器验收

**Files:**
- Create: `docs/verification/2026-10-06-workspace-shell-r2.md`

- [ ] 运行完整 `pnpm test -- --run`。
- [ ] 运行 `pnpm check` 与 `pnpm build`。
- [ ] 在 1440、1280、1024、390 四个视口测量侧栏、内容、按钮、字体和溢出。
- [ ] 遍历首页、小涟、知识空间、工坊和设置，记录浏览器错误。
- [ ] 保存前后截图和验证报告。
- [ ] 自审后快进合并到本地 `main`，不推送远端。
