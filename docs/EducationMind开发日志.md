# EducationMind 开发日志

> 本日志参考《创新赛道——开发日志参考模板》整理，是仓库内持续维护的开发记录。
> 事实以 Git 提交、源码和验证命令为准；未发生的功能、数据和结果不提前填写。

## 1. 使用说明

- 每个开发阶段开始时新增一条阶段记录，状态标记为“进行中”。
- 阶段完成后回填实际修改文件、关键决策、遗留问题和验证结果。
- 不把计划中的功能写成已完成，不把前端展示写成后端能力。
- 参考模板 `docs/创新赛道——开发日志参考模板.docx` 保持原样。

## 2. 项目概述

### 2.1 项目简介

EducationMind（忆涟千言—教）是一套围绕学习画像、诊断、计划、学习执行、
练习反馈和动态调整构建的 AI 学习体验。前端角色“小涟”负责将已有学习数据
转化为可理解、可行动的陪伴式界面。

### 2.2 核心技术与方案

- React 18、TypeScript、Vite、React Router Hash Router
- Zustand 前端会话状态
- Tailwind CSS、Radix UI、Lucide
- Vitest 单元与组件测试
- 前端通过既有 Education API 读取 Profile、Diagnosis、Current Plan、
  Knowledge Content、Learning Evidence 和评价结果

### 2.3 创新点

- 严格区分“尚未评估”和“薄弱”，不把未知状态展示为低分。
- 学习过程以真实 `LearningEvidence` 和评价响应为事实边界。
- 将诊断、计划、讲解、练习、复述和调整组织为连续学习体验。
- 小涟的观察和反馈由已有字段确定性生成，不虚构聊天记忆或长期记忆。

### 2.4 预期成果与应用场景

- 为学习者提供可执行的个性化学习路径。
- 为比赛演示提供可核验的数据来源和完整学习闭环。
- 为后续真实记忆能力和更丰富教学能力保留清晰前端扩展边界。

## 3. 阶段开发日志

### 3.1 Phase 3-1 至 Phase UI-5

- **时间：** 2026-08-19 至 2026-08-20
- **状态：** 已完成
- **阶段目标：** 建立真实学习任务入口、多 Agent 学习能力、课程知识检索、
  动态重规划、Education Tools/MCP 目录和小涟陪伴界面基础。
- **实际完成：** 相关实现和文档已进入 Git 历史；前端具备 Profile、Diagnosis、
  Current Plan、Tutor、Assessment、Replanning、Knowledge Retrieval 和 Tool Catalog
  展示能力。
- **关键决策：** 页面展示与真实学习状态分离；Agent Trace 只表示实际执行节点。
- **负责人：** EducationMind 项目组

### 3.2 Phase UI-6A Learning Growth Experience

- **时间：** 2026-08-20 至 2026-08-22
- **状态：** 已完成
- **阶段目标：** 将任务、讲解、知识状态、复述入口和成长档案组织为学习过程体验。
- **实际完成：** LearningModule、TutorExplanation、KnowledgeGalaxy、
  Reflection 路由和成长档案增强已进入当前代码基线。
- **关键决策：** 学习目标来自真实任务与课程内容；知识状态不宣称为知识图谱。
- **负责人：** EducationMind 项目组

### 3.3 Phase UI-6B Learning Reflection Loop

- **时间：** 2026-08-22
- **状态：** 已完成
- **阶段目标：** 补齐理解、学习、练习、复述、反馈、调整的前端闭环。
- **实际完成：** ReflectionWorkspace、EvidenceInsightCard、
  LearningStageProgress、XiaolianFeedbackBubble 和成长时间线已进入 Git 历史。
- **关键决策：** Reflection 使用确定性前端反馈，不调用 LLM、不更新 mastery、
  不创建 Evidence。
- **负责人：** EducationMind 项目组

### 3.4 Phase UI-7 Xiaolian Memory Experience

- **时间：** 2026-08-22
- **状态：** 已完成
- **阶段目标：** 将已有学习数据人格化为小涟观察、学习画像和成长故事。
- **实际完成：** XiaolianMemoryCard、XiaolianLearningPortrait、
  LearningStoryTimeline 和 MemoryCapsule 已进入当前代码基线。
- **关键决策：** 不新增记忆后端；不使用“我记得你说过”；未确认的偏好保持为空。
- **对应提交：** `92b141a feat: complete learning growth and Xiaolian memory experience`
- **负责人：** EducationMind 项目组

### 3.5 Phase UI-8 Xiaolian Companion Flow

- **时间：** 2026-08-23
- **状态：** 已完成
- **阶段目标：** 将小涟升级为学习任务开始、学习、思考、练习、复述和完成过程中的
  陪伴式引导者。
- **实际完成：**
  - 新增 `LearningEntryDialog`，在首页、我的学习、学习空间、复述继续项和演示页的
    真实任务启动前展示学习准备。
  - 新增 `CompanionJourney`，以 prepare、learning、thinking、practice、
    reflection、complete 展示学习体验状态。
  - 扩展 `TutorExplanationCard` 的 `mode="knowledge"`，只整理
    `KnowledgePointContent.sections`，保留默认模式展示真实 Tutor 响应。
  - 新增 `ReflectionNextStepCard`，使用 `ReflectionResult` 和当前计划顺序连接下一任务。
  - 新增首页 `TodaysJourney`，直接展示当前计划中的真实任务。
  - 将小涟 Runtime State 拆分为 idle、thinking、loading，将 Companion State
    拆分为 companion、encouraging、reminding、celebrating。
- **真实数据来源：** `DiagnosisResult`、`PersistedStudyPlan`、
  `LearningEvidence`、`KnowledgePointContent`、`PracticeEvaluationResponse`
  和 `useLearningLoopStore` 中已有的学习会话、Tutor 响应、练习响应与
  `ReflectionResult`。
- **页面路由：**
  - `/#/`：Today's Journey 与任务学习准备
  - `/#/space`：Companion Journey 与课程内容教学卡片
  - `/#/reflection`：复述反馈与当前计划下一任务引导
  - 本阶段未新增路由。
- **修改文件：**
  - 新增 `src/components/learning/companionFlow.ts`
  - 新增 `src/components/learning/LearningEntryDialog.tsx`
  - 新增 `src/components/learning/CompanionJourney.tsx`
  - 新增 `src/components/learning/ReflectionNextStepCard.tsx`
  - 新增 `src/components/home/TodaysJourney.tsx`
  - 修改 `src/components/learning/TutorExplanationCard.tsx`
  - 修改首页、学习空间、我的学习、Reflection、Demo 和小涟页面集成
  - 修改 `src/store/useXiaolianRuntimeStore.ts` 与小涟角色展示映射
  - 新增确定性派生、组件入口、状态拆分和 Reflection 页面续接测试
- **关键决策：**
  - 准备弹窗只包装既有 `useStartPlanTask()`，不新建任务或写入学习状态。
  - 准备数据加载完成前保持确认按钮禁用；Diagnosis 与 Evidence 的加载失败
    分别呈现，不用一个数据源的失败推断另一个数据源。
  - “当前诊断重点”只读取 `primaryFocus` 与 `priorityInterventions`，
    不把 strengths、developing 或 unassessed 状态改写为重点诊断。
  - Companion Journey 是用户体验状态，不是 Agent Trace。
  - 主动教学卡片不替代真实 Tutor API 返回。
  - Runtime 与陪伴语气使用两个独立状态维度。
  - 已有可信 `ReflectionResult` 且重规划替换原任务时，下一步引导读取
    当前计划排序后的首个真实任务；任务不匹配状态仍关闭新的复述提交。
- **验证结果：**
  - `pnpm exec vitest run`：21 个测试文件、83 项测试全部通过。
  - `pnpm check`：TypeScript 类型检查与 ESLint 全部通过。
  - `pnpm build`：生产构建成功；保留 Vite 的单包体积提示，不影响构建产物。
  - `git diff --check`：通过，仅输出 Windows 行尾转换提示。
- **负责人：** EducationMind 项目组

### 3.6 Product Hardening：运行稳定性、性能与移动端收口

- **时间：** 2026-08-25
- **状态：** 已完成
- **阶段目标：** 在不改变既有 API、Agent、MCP、数据库结构和真实数据语义的前提下，
  修复开发运行噪声、首包体积、移动端首屏遮挡、时间弃用警告与页面语义缺口。
- **实际完成：**
  - 将 XAGI Design Mode 与开发监控改为显式环境变量启用，默认开发环境不再请求
    不存在的监控脚本，也不再受 Windows 中文及空格路径下的虚拟模块错误影响。
  - 保留 Current Plan 不存在时的 `404` 接口契约，在 API 调用边界将其作为“尚无计划”
    的正常空状态处理，避免共享错误拦截器输出误导性控制台错误。
  - 保留首页同步加载，其余 14 个页面路由改为路由级懒加载；按职责拆分 React、
    Framer Motion、Radix、Axios、Zustand 与图标依赖，生产入口业务脚本降至 85.86 kB。
  - 将项目自有的 `datetime.utcnow()` 统一迁移到共享 `utc_now()`，继续返回 naive UTC，
    因而无需迁移现有 SQLite `DateTime` 字段。
  - 压缩 390 px 移动端首页 Hero 的角色尺寸、间距和按钮宽度，两个主操作均位于底部
    导航上方；修正页面语言与站点图标。
  - 为学习反思页补充稳定的一级标题和说明，使空任务、加载失败与任务重规划状态仍保留
    清晰的页面语义。
- **关键边界：**
  - 未新增受污染对话中出现的 Memory Center、语音模式或无限画布方案。
  - 未伪造学习画像、计划、证据、知识点关系或完成状态。
  - Current Plan 的 `404` 仍由后端真实返回，仅在前端调用边界转为 `null`。
  - 未修改 SQLite 文件、数据库表结构、Agent 编排与 MCP 工具契约。
- **验证结果：**
  - `pnpm exec vitest run`：25 个测试文件、102 项测试全部通过。
  - `pnpm check`：TypeScript 类型检查与 ESLint 全部通过。
  - `pnpm build`：生产构建成功，无 Vite 大包体积提示；入口业务脚本 85.86 kB。
  - 后端 `pytest -q`：199 项测试全部通过；仅保留 1 条第三方 Starlette 弃用提示。
  - 真实 Vite + FastAPI 浏览器巡检：15 条路由 × 2 个视口，共 30 个场景；横向溢出、
    破图、页面异常、意外 HTTP 错误和开发注入请求均为 0。
  - `git diff --check`：通过，仅输出 Windows 行尾转换提示。
- **负责人：** EducationMind 项目组

### 3.7 Learning Space Layout Refresh

- **时间：** 2026-08-29
- **状态：** 已完成
- **阶段目标：** 参考 [R星研学社](http://122.51.33.232) 的品牌优先、留白和聚焦入口组织方式，
  使用项目提供的樱花云海图片统一学习空间视觉，同时简化登录注册入口、应用壳层和首页的主要学习行动。
- **实际完成：**
  - 将用户提供的背景图原样纳入 `public/brand/learning-space-background.png`，作为认证入口和登录后学习空间的统一背景资源。
  - 重做 `AuthScreen` 与 `AuthCompanionScene` 的结构：桌面端采用左侧品牌说明、右侧聚焦认证卡片，
    移动端收敛为紧凑品牌头部和视口约束卡片。
  - 保留既有真实登录、注册、验证码、密码校验和错误反馈流程；新增认证入口、品牌区、认证卡片和视口约束的稳定测试标记。
  - 收敛 `AppShell`、`LearningRail`、`TopCompanionBar` 和背景层的间距与视觉层级；桌面端保留垂直主导航，
    移动端改为横向导航，主内容区域更聚焦。
  - 将首页主行动调整为“继续今天的学习”，并补充真实学习计划步骤数和学习证据数量；无计划、无证据时分别显示
    “尚未安排”和 `--`，不使用虚构进度或统计数据。
  - 为窄视口认证卡片增加宽度约束，完成桌面端和移动端浏览器布局检查；实际 DOM 测量未发现页面横向溢出。
  - 当前分支已有的相关前后端、设置、MCP、语音运行时和 UI-R2 改动均保留并纳入提交，未使用 reset 或清理方式覆盖用户工作区。
- **关键决策：**
  - 参考站点只用于提取布局和信息层级方向，不复制其代码、资源或业务实现。
  - 背景图片只改变展示层，不改变认证 API、学习数据接口、Agent、MCP、数据库结构或既有业务语义。
  - 登录注册只验证真实前端表单、状态转换、校验和错误反馈；当前没有授权测试账号，因此不把远端账号登录或注册结果写成已完成。
  - 首页摘要只读取既有计划和学习证据；缺失数据继续呈现诚实空状态。
- **对应提交：** `ea728bd merge: refresh learning space layout`
- **修改文件与资源：**
  - `src/auth/AuthScreen.tsx`、`src/auth/AuthCompanionScene.tsx` 及认证测试
  - `src/components/layout/`、`src/components/design/NebulaBackground.tsx` 及相关测试
  - `src/components/home/HeroBanner.tsx`、`src/components/home/TodaysJourney.tsx` 及首页派生测试
  - `src/design/theme.css`
  - `public/brand/learning-space-background.png`
  - `docs/superpowers/specs/2026-08-29-learning-space-layout-design.md`
  - `docs/superpowers/plans/2026-08-29-learning-space-layout-refresh.md`
- **验证结果：**
  - `pnpm check`：TypeScript 类型检查与 ESLint 全部通过。
  - `pnpm exec vitest run`：72 个测试文件、237 项测试全部通过。
  - `pnpm build`：生产构建成功，2483 个模块转换完成；保留 `vendor-pixi` 约 526 kB 的既有大包体积提示。
  - `uv run pytest`：后端 362 项测试全部通过；仅保留 1 条第三方 Starlette/httpx 弃用提示。
  - `git diff --check`：通过，仅输出 Windows 行尾转换提示。
  - Git：已从功能分支合并到 `main` 并推送远端；本地 `main` 与 `origin/main` 均指向合并提交
    `ea728bd4121020467d3b2e78b64b58245e2a91c4`。
- **负责人：** EducationMind 项目组

### 3.8 Workspace Cleanup & Dark Theme Readability

- **时间：** 2026-08-29
- **状态：** 已完成
- **阶段目标：** 清理仓库中的多余文件与未使用依赖；修复暗色主题下多个页面面板沿用亮色玻璃样式导致的
  低对比、文字不可读问题，使设置、知识星图、学习工坊、我的学习、学习诊断与考试中心在黑夜主题下全部可读。
- **实际完成：**
  - 删除与 `AGENTS.md` 逐字节相同的 `CLAUDE.md`，以及未被任何路由或组件引用的 `src/examples/`、
    `src/pages/ExamplesPage.tsx`、`src/components/PlaceholderPage.tsx` 与空目录 `src/mock/`、`src/components/showcase/`。
  - 删除未被使用的 shadcn 基元 `form.tsx`、`accordion.tsx`、`toggle.tsx`、`slider.tsx`，并移除仅被这些文件
    或示例代码引用的依赖：`react-hook-form`、`@hookform/resolvers`、`zod`、`@radix-ui/react-icons`、
    `@radix-ui/react-aspect-ratio`、`@radix-ui/react-menubar`、`@radix-ui/react-navigation-menu`、
    `@radix-ui/react-toggle-group`、`@radix-ui/react-accordion`、`@radix-ui/react-toggle`、`@radix-ui/react-slider`、
    `@radix-ui/react-toast`，以及模板遗留的 `@types/react-router-dom`（react-router-dom 7 自带类型）。
  - 清理本地未跟踪残留：`.logs/`、`.tmp/`、`.pytest_cache/`、`__pycache__/` 与过期数据库备份
    `education.db.pre-anonymous-*.bak`；`release/`、`dist/` 等构建产物与运行数据库保留。
  - 定位暗色低对比根因：主题体系以 `data-theme="dark"` 生效，`theme.css` 中对 `bg-white/*` 的重映射只覆盖
    4 个档位，实际代码使用了 17 个档位，另有大量浅色 `-50/-100` 底色、配套 `-700..-900` 深色状态文字、
    白色渐变 stops 与浅紫边框未被映射。按实际用法穷举补全 `theme.css` 的暗色重映射，并在组件测试中验证。
  - 将知识星图画布背景、节点标签与关系标签改为主题变量驱动（`var(--em-ink)` / `var(--em-muted-ink)` /
    `var(--em-glass-bg)`），黑夜主题下星图节点名称与关系说明全部可读。
  - 在真实浏览器（1440×900，黑夜与明亮主题）逐页巡检首页、我的学习、学习诊断、知识空间、考试中心、
    学习工坊、学习档案、设置、小涟对话、智能体对话与复盘页；确认暗色灰块全部消除、明亮主题无回归。
- **关键决策：**
  - 继续沿用项目既有的"暗色主题穷举重映射"策略而非重构全部组件配色：改动集中在一个 CSS 文件，
    亮色主题零影响，风险最小。
  - `CLAUDE.md` 与 `AGENTS.md` 内容完全相同且 `AGENTS.md` 明确自己是唯一代理规则来源，判定为冗余副本删除。
  - Genie-TTS 运行时启动失败经核实已在 `lifespan` 中捕获并降级（`voice_provider` 置空、仅记录日志），
    属预期行为，不做代码修改。
  - 探查使用的注册账号、学习计划与证据均来自真实前后端流程，不写入虚构演示数据。
- **对应提交：** `chore: remove unused files and dependencies`、`fix: remap light-panel utilities for dark theme readability`
- **修改文件与资源：**
  - 删除：`CLAUDE.md`、`src/examples/`、`src/pages/ExamplesPage.tsx`、`src/components/PlaceholderPage.tsx`、
    `src/components/ui/{form,accordion,toggle,slider}.tsx`
  - 修改：`src/design/theme.css`、`src/components/knowledge/KnowledgeGalaxy.tsx`、`src/components/index.ts`、
    `package.json`、`pnpm-lock.yaml`
- **验证结果：**
  - `pnpm check`：TypeScript 类型检查与 ESLint 全部通过。
  - `npx vitest run`：72 个测试文件、237 项前端测试全部通过。
  - `uv run pytest`：后端 362 项测试全部通过。
  - `pnpm build`：生产构建成功。
  - 浏览器实测：黑夜主题下设置/星图/工坊/我的学习/诊断/考试中心对比度恢复正常，明亮主题无回归。
- **负责人：** EducationMind 项目组

### 3.9 Compact Learning Workbench

- **时间：** 2026-08-29
- **状态：** 已完成
- **阶段目标：** 解决学习工作台（`/#/space`）首屏臃肿问题：原先页面大标题区、任务横幅、
  "陪伴旅程"六步条与"学习循环"五阶段条四层堆叠，信息重复（知识点名 3 次、进度 2 次、
  免责说明 3 次），核心工作区（辅导对话、学习产物）被挤出首屏。
- **实际完成：**
  - 新增 `WorkbenchTaskHeader`：把四层堆叠收敛为一个紧凑任务头——返回首页链接、知识点标题、
    任务类型与预计时间 chips、任务序号，以及单条六步学习进度轨（准备→学习→思考→练习→复述→完成，
    状态仍由真实学习证据经 `deriveCompanionJourney` 驱动），并保留一行诚实的边界说明。
  - `LearningSpacePage` 有任务时不再渲染页面级大标题区；无任务的空状态保留标题与任务列表入口。
  - 精简 `LearningModulePanel`：只保留学习单元范围、诊断状态与"用自己的话复述"入口，
    删除与新任务头重复的知识点/预计时间/任务序号信息块。
  - 删除被取代的 `CompanionJourney`、`LearningJourneyHeader`、`LearningStageProgress` 组件与测试，
    更新组件 barrel 导出；`learningLoop` 的阶段推导逻辑保留用于完成判定。
  - 桌面端 1440px 与移动端 390px 浏览器实测：辅导对话、课程知识、学习产物进入首屏；
    窄视口下 chips 正常换行、进度轨可横向滚动，无横向溢出。
- **关键决策：**
  - 合并而非保留两条进度展示：两条步骤条数据同源（真实学习证据），保留一条即可表达进度，
    学习环节五阶段（理解/讲解/实践/复述/验证）继续作为内部完成判定，不再单独占一层 UI。
  - 参考 Focus 式任务工作台的信息组织（单一任务上下文 + 单一进度指示 + 内容优先），
    不引入新依赖，不改变任何 API、数据语义或证据边界。
- **对应提交：** `feat: compact the learning workbench first screen`
- **修改文件与资源：**
  - 新增：`src/components/learning/WorkbenchTaskHeader.tsx` 及测试
  - 修改：`src/pages/LearningSpacePage.tsx`、`src/components/learning/LearningModulePanel.tsx`、
    `src/components/index.ts`
  - 删除：`src/components/learning/{CompanionJourney,CompanionJourney.test,LearningJourneyHeader,LearningStageProgress}.tsx`
- **验证结果：**
  - `pnpm check`：TypeScript 类型检查与 ESLint 全部通过。
  - `npx vitest run`：前端 238 项测试全部通过（含新工作台任务头 2 项）。
  - `pnpm build`：生产构建成功。
  - 浏览器实测：有任务/无任务两种状态、桌面与 390px 窄视口均正常。
- **负责人：** EducationMind 项目组

### 3.10 Codex-Style Workbench Layout

- **时间：** 2026-08-29
- **状态：** 已完成
- **阶段目标：** 参考复习研社官网（<http://122.51.33.232>）的大留白、内容优先设计语言与 Codex 式
  "中央对话 + 可收起侧板"结构，进一步收敛学习工作台：左右两栏常驻的"课前引导"与"学习产物"
  改为按需展开的滑出面板，中央保留单栏对话流。
- **实际完成：**
  - 新增 `WorkbenchSidePanel`：右侧滑出面板（遮罩 + `Esc`/点击遮罩关闭，`role="dialog"`），
    配色走主题变量，明暗主题通用。
  - `WorkbenchTaskHeader` 增加 `actions` 插槽，新增"课前引导""学习产物"两个开关；
    课前引导面板内含主动教学卡片与"用自己的话复述"入口，学习产物面板沿用原 `LearningArtifactPanel`。
  - `LearningSpacePage` 移除三栏网格，改为居中单栏：小涟对话 → 快速练习 → 学习证据；
    辅助内容全部收进滑出面板。
  - `SpaceTutor` 头部瘦身：居中大块角色区改为紧凑状态行（小角色 + 标题 + 进行中状态徽标），
    删除与首条欢迎消息重复的提示气泡。
  - 删除常驻左栏的 `LearningModulePanel`（诊断状态已由学习产物面板承载，复述入口移入引导面板）。
  - 浏览器实测：桌面 1440px 单栏聚焦，两个面板开合、`Esc` 关闭正常；390px 窄视口下面板全宽展示正常。
- **关键决策：**
  - 参考站点内页需要登录，不注册外部账号；其落地页的大留白、聚焦单栏设计语言与 Codex 的
    "中央工作流 + 按需侧板"模式仅作信息组织参考，不复制代码或资源。
  - 面板内容懒渲染（未打开不挂载），保持首屏只包含对话流，不增加默认加载体积。
- **对应提交：** `feat: adopt codex-style single column workbench layout`
- **修改文件与资源：**
  - 新增：`src/components/learning/WorkbenchSidePanel.tsx`
  - 修改：`src/pages/LearningSpacePage.tsx`、`src/components/learning/WorkbenchTaskHeader.tsx`、
    `src/components/learning/SpaceTutor.tsx`、`src/components/index.ts`
  - 删除：`src/components/learning/LearningModulePanel.tsx`
- **验证结果：**
  - `pnpm check`：TypeScript 类型检查与 ESLint 全部通过。
  - `npx vitest run`：前端 238 项测试全部通过。
  - `pnpm build`：生产构建成功。
  - 浏览器实测：单栏布局、滑出面板、Esc 关闭、窄视口全宽面板均正常。
- **负责人：** EducationMind 项目组

### 3.11 Reference-Aligned Page-Level Chat

- **时间：** 2026-08-29
- **状态：** 已完成
- **阶段目标：** 经项目所有者授权注册参考站（<http://122.51.33.232>）账号并进入其"对话学习"工作区，
  对照其设计语言继续完善学习工作台。参考站的核心形态：页面即对话（消息直接铺在画布上，无容器框）、
  底部悬浮大输入框、功能芯片贴近输入区、极轻的助手气泡。
- **实际完成：**
  - `SpaceTutor` 去容器化：移除外层 `GlassPanel` 大面板与内嵌滚动，消息直接铺在页面画布上，
    对话改为页面级滚动并自动平滑滚动到最新消息。
  - 助手气泡轻量化为无边框纯文本（保留"小涟"署名与语音控件），用户气泡保持主色填充圆角。
  - 输入区改为悬浮玻璃圆角胶囊（`sticky` 跟随视口底部，移动端抬高避开固定底部导航），
    快捷问题芯片与语音归属说明贴在输入区上方，与参考站"功能芯片贴近输入框"的形态一致。
  - 浏览器实测：发送真实消息后完整渲染 TutorExplanationCard（章节、记忆提示、参考课程知识、来源），
    自动滚动与悬浮输入框正常；390px 窄视口无遮挡、无横向溢出。
- **关键决策：**
  - 参考站为项目所有者的云端部署，经授权注册账号 `yilian_ref` 查看内页；仅吸收信息组织与视觉形态，
    不复制代码、资源或文案。
  - 不照搬参考站的右侧画像栏与极窄图标导航：画像与产物已由"学习产物"滑出面板承载，
    现有 LearningRail 信息更明确，保持现状。
- **对应提交：** `feat: make tutor conversation page-level like the reference workspace`
- **修改文件与资源：** `src/components/learning/SpaceTutor.tsx`
- **验证结果：**
  - `pnpm check`：通过；`npx vitest run`：72 文件 238 项测试全部通过；`pnpm build`：成功。
  - 浏览器实测：真实对话、自动滚动、悬浮输入框、窄视口均正常。
- **负责人：** EducationMind 项目组

### 3.12 V2 Visual & Knowledge Expansion

- **时间：** 2026-08-29
- **状态：** 已完成
- **阶段目标：** 参照参考站视觉语言（除 Live2D 模型外）完成一次整体视觉与功能升级：聊天页面合一、
  知识图谱改造为力导向网状图、扩充知识库与学科选择、资源生成/组卷/题库改为真实课程数据源、
  学生画像掌握度可视化。
- **实际完成：**
  - **聊天页合一**：删除 `/agent` 路由与其嵌入式包装页 `AgentPage`，`/xiaolian` 成为唯一聊天入口；
    关于页移除重复链接，路由清单测试同步收紧（`/agent` 加入 retired 断言）。
  - **知识图谱网状化**：新增零依赖力导向布局 `forceMesh`（斥力 + 连线弹簧 + 中心引力 +
    确定性随机种子，320 轮迭代收敛，节点按半径防重叠并夹回画布），`KnowledgeGalaxy` 由固定三行树
    改为网状图；SVG 按容器宽度缩放，课程根节点居中、知识点/章节环绕、包含/解释实线与先后虚线可辨。
  - **知识库扩充**：新增「计算机网络」（OSI 分层、IP 与子网、TCP/UDP、交换与路由、网络安全基础）
    与「数据结构与算法」（线性表、栈与队列、树与二叉树、图与遍历、排序与查找）两门课程，
    每门 5 个知识点并配套 5 篇分章节材料（共 10 篇），注册选课页自动出现全部三门学科。
  - **知识点数据源统一**：后端新增 `GET /api/knowledge/points`；前端新增 `useKnowledgePointOptions`
    hook，资源生成器、AI 组卷、自定义题库全部由硬编码 OS 列表改为按当前账号课程实时读取（含难度标注、
    加载与错误态），修复切课后仍显示 OS 知识点导致生成错配的缺陷。
  - **学生画像可视化**：新增通用 N 维 `MasteryRadar`（仅绘制有评价证据的维度，缺失不按 0 分计入），
    「我的学习」页新增"当前课程掌握画像"区块（雷达 + 每个知识点的掌握/未评估列表）。
  - **视觉对齐**：主导航激活态由白色实底改为主题化浅紫描边并增加左侧指示条，明暗主题一致。
- **关键决策：**
  - 网状布局自实现而非引入 d3-force：图中节点规模小（<40），自实现约 150 行即可满足，
    不增加依赖体积；确定性种子保证渲染与测试稳定。
  - 未照搬参考站的右侧画像常驻栏与图标导航替换：画像由滑出面板与新增雷达区块承载，LearningRail
    信息更明确，仅做激活态微调。
  - 后端验证在离线沙箱中进行：用进程内 TestClient + 空Turnstile 覆盖与临时数据库完成注册/登录/
    选课/知识点/图谱/资源生成全链路断言，不触碰生产数据库。
- **对应提交：** `feat: keep a single xiaolian chat page`、`feat: lay out the knowledge galaxy as a force-directed mesh`、
  `feat: add computer network and data structure courses`、`fix: source workspace knowledge points from the active course`、
  `feat: visualize per-knowledge-point mastery on the growth route`
- **修改文件与资源：**
  - 后端：`app/core/seed.py`、`app/api/routes/knowledge.py`、`app/knowledge/materials/course-net/*`（5 篇）、
    `app/knowledge/materials/course-ds/*`（5 篇）、`tests/test_catalog_seed.py`
  - 前端：`src/components/knowledge/{forceMesh,KnowledgeGalaxy}`、`src/components/diagnosis/MasteryRadar`、
    `src/components/workshop/{useKnowledgePointOptions,ResourceGenerator,workshopPresentation}`、
    `src/components/exam/{ExamGenerator,QuestionBank}`、`src/pages/{MyLearningPage,PlaceholderPages}`、
    `src/router/routeManifest`、`src/lib/educationApi.ts`、`src/components/layout/LearningRail.tsx`、
    删除 `src/pages/AgentPage*`
- **验证结果：**
  - `pnpm check`：通过；`npx vitest run`：73 文件 241 项测试全部通过；`pnpm build`：成功；
    `uv run pytest`：后端 362 项测试全部通过。
  - 浏览器实测（临时后端 8001 + 全新数据库）：注册选课页显示三门学科；数据结构课程知识空间
    呈现网状图（31 节点/54 边量级）；学习工坊知识点下拉跟随课程（"线性表 · 难度 2"）并成功生成
    「线性表 · 学习单」；主导航激活态在暗色主题下协调。
- **负责人：** EducationMind 项目组

### 3.13 Vaptcha Fallback Captcha

- **时间：** 2026-08-29
- **状态：** 已完成
- **阶段目标：** 定位注册/登录"verification service is temporarily unavailable"的根因，并按部署决策引入
  国内 Vaptcha 人机验证作为 Cloudflare Turnstile 不可用时的自动兜底。
- **根因定位：**
  - 后端 `TurnstileVerifier` 调用 `challenges.cloudflare.com/turnstile/v0/siteverify`；在本机实测 DNS 正常、
    但 httpx 连接被直接拒绝（`WinError 10061 目标计算机积极拒绝`），curl 报 `CRYPT_E_REVOCATION_OFFLINE`，
    即国内网络到 Cloudflare 边缘的可达性间歇中断；httpx 异常被统一转成"验证服务暂不可用"。
  - 脆弱点有两处：后端二次校验与前端 widget 脚本同源，浏览器加载不到组件时登录按钮永久禁用。
- **实际完成：**
  - 后端新增 `app/auth/captcha.py`：`VaptchaVerifier`（`api.vaptcha.com/verify`，成功码 `0103`，
    携带 vid/secretkey/token/ip）、`verify_captcha` 按 `captcha_provider` 分发校验、`captcha_chain`
    依据 `EDUCATION_CAPTCHA_MODE`（auto/turnstile/vaptcha/off，默认 auto）生成优先级链。
  - `/api/public/config` 下发 `captcha_chain` 与 `vaptcha_vid`；注册/登录载荷新增 `captcha_provider`，
    后端分别调用 Siteverify 或 Vaptcha 校验；未配置任何 provider 时保持"诚实关闭"不校验。
  - 前端新增 `CaptchaPanel`：按链渲染 Turnstile，脚本加载失败立即切换 Vaptcha，8 秒未出票也自动切换
    （已出票则不切换），切换时展示"Cloudflare 验证暂不可用，已切换到 Vaptcha"提示；
    凭据未就绪时提交按钮保持禁用。`VaptchaWidget` 封装 v3.js（vid/type/scene/container、
    pass 事件、getToken、refresh/destroy）。
  - 环境变量：`EDUCATION_VAPTCHA_VID` / `EDUCATION_VAPTCHA_KEY`（均配置才入链）、
    `EDUCATION_CAPTCHA_MODE`；README 补充接入说明，`.env` 留有占位待部署方填入密钥。
- **关键决策：**
  - 兜底切换放在前端：Turnstile 与 Vaptcha 的 token 互不相通，只有前端能感知"组件加载失败/未出票"
    并改用另一 provider 重新取票；后端只按请求声明的 provider 校验对应凭证，不猜测。
  - Vaptcha 选用其免费策略（注册即用、无验证量限制），与项目"免费、国内可达"的部署诉求一致。
  - 超时兜底设 8 秒：覆盖脚本慢加载，同时避免用户明显感知等待。
- **对应提交：** `feat: fall back to vaptcha when cloudflare turnstile is unreachable`
- **修改文件与资源：**
  - 后端：`app/auth/captcha.py`（新增）、`app/api/routes/{auth,public}.py`、`app/auth/schemas.py`、
    `app/core/config.py`、`tests/test_captcha_chain.py`（新增 7 项）
  - 前端：`src/auth/{CaptchaPanel,VaptchaWidget,CaptchaPanel.test}.tsx`（新增/含 6 项组件测试）、
    `src/auth/{AuthScreen,AuthProvider,TurnstileWidget,authApi}`、`package.json`（新增
    @testing-library/react、@testing-library/dom、jsdom 开发依赖）、`README.md`
- **验证结果：**
  - `pnpm check`：通过；`npx vitest run`：74 文件 247 项测试全部通过；`pnpm build`：成功；
    `uv run pytest`：后端 369 项测试全部通过。
  - 浏览器实测：双 provider 链下 Turnstile 组件正常渲染（可达性间歇，正常路径不受影响）；
    将后端切换为 vaptcha-only 链后，`/api/public/config` 下发 `["vaptcha"]`，登录页正确渲染
    Vaptcha 容器并在未出票时保持提交禁用；超时/加载失败/出票不切换三类降级路径由组件测试覆盖。
- **负责人：** EducationMind 项目组

### 3.14 Workspace Component Architecture

- **时间：** 2026-08-29
- **状态：** 已完成
- **阶段目标：** 按"主界面极简 + 能力完整 + 功能组件化 + 按需展开"重构学习工作台：
  历史记录、学习产物、学习上下文三类语义独立的抽屉替代常驻区块；
  禁止删除任何有效功能，低频/辅助/证据/产物类能力全部按需调用。
- **实际完成：**
  - **Header 重设计**（`WorkbenchTaskHeader`）：左侧返回 + 任务名 + 类型/时长 chips，
    右侧桌面端"历史/学习产物/学习上下文"三个 icon+tooltip 入口，移动端收敛为 ··· 菜单
    （390px 下不出现四个文字按钮）；阶段进度轨与诚实说明保留。
  - **历史记录抽屉**（`WorkspaceHistoryPanel`）：五类分区——对话（后端无持久化会话 API，
    如实显示"当前版本尚未提供可恢复的云端对话历史"，不伪造本地假历史）、学习行为
    （真实 LearningEvidence 事件化："开始学习/完成练习评价 · 知识点"，展开可看时间/来源/会话/掌握变化，
    不显示原始 payload）、练习（本次会话服务端评价含 masteryBefore→After/置信度/重规划状态，
    云端证据单独列出）、复述（明确标记"本地复述记录 · 刷新后清空，不代表云端长期记忆"）、
    任务历史（当前 Current Plan 任务列表）。
  - **学习产物抽屉**（`WorkspaceArtifactsPanel`）：统一 `ArtifactCard` 外壳（类型/标题/产生时间/
    关联知识点/内容/操作），覆盖知识总结、诊断重点、练习结果、复述结果、来源引用与生成资源入口；
    支持当前任务/当前知识点/本次会话三种范围切换（展示层过滤）。
  - **学习上下文抽屉**（`WorkspaceContextPanel`）：五个关键字段（课程/知识点/任务/计划位置/诊断），
    评价证据面板（计数 + 最近 5 条 + 折叠的全部证据），技术详情默认折叠
    （Agent/Tool 执行记录、Provider/Model、语音归属 Genie-TTS/GPT-SoVITS），普通学习者默认不可见。
  - **回答内收纳**：`TutorExplanationCard` 只保留"课程来源 · N"按钮打开来源抽屉；
    AgentToolTrace、Provider 行与长语音归属声明从消息流移入上下文抽屉技术详情。
  - **主区减法**：移除常驻的"小涟如何了解你的学习情况"大区块（能力由上下文抽屉承载）；
    删除被取代的 `LearningArtifactPanel`、`EvidenceInsightCard`。
  - **移动端**：`WorkbenchSidePanel` 在窄视口变为底部 Bottom Sheet（86dvh 上限），历史/产物/上下文
    分别为独立 Sheet，主聊天区保持最高优先级；抽屉层级提升至固定顶栏之上。
- **关键决策：**
  - 三类抽屉语义严格分离：History=过去发生了什么、Artifacts=当前学习产生了什么、Context=小涟现在依据什么。
  - 复用优先：抽屉壳复用 `WorkbenchSidePanel`，Trace/来源/证据过滤复用 `AgentToolTrace`、
    `SourceReferences`、`filterLearningEvidence`，不新造第二套组件；组件均为 props 驱动的
    presentation component，数据编排在页面与既有 hook/store。
  - 数据诚实边界：无后端持久化 API 的能力（对话恢复、复述云存储）如实标注，不声称云端长期记忆。
- **对应提交：** `feat: componentize the learning workspace with history, artifacts and context drawers`
- **修改文件与资源：**
  - 新增：`src/components/workspace/{WorkspaceHistoryPanel,WorkspaceArtifactsPanel,WorkspaceContextPanel}` 及测试
  - 修改：`WorkbenchTaskHeader`、`WorkbenchSidePanel`（Bottom Sheet + z 序）、`SpaceTutor`、
    `TutorExplanationCard`、`LearningSpacePage`（编排重排）、`src/components/index.ts`
  - 删除：`LearningArtifactPanel`、`EvidenceInsightCard`（能力已由抽屉承载）
- **验证结果：**
  - `pnpm check`：通过；`npx vitest run`：77 文件 262 项测试全部通过（新增 13 项工作台组件测试）；
    `pnpm build`：成功；`uv run pytest`：后端 369 项全部通过。
  - 浏览器实测（真实注册→选课→生成路线→进入工作台）：首屏仅 Header + 对话流 + 练习卡；
    历史抽屉显示真实学习证据事件；上下文抽屉五字段与证据面板正确；产物抽屉范围切换正常；
    390px 下 ··· 菜单与 Bottom Sheet 正常，Esc 关闭抽屉正常。
- **负责人：** EducationMind 项目组

### 3.15 MiniMax Voice & Compact Workspace

- **时间：** 2026-08-29
- **状态：** 已完成
- **阶段目标：** 按部署决策以 MiniMax 开放平台 TTS 替换既有语音输出方案；压缩工作台 Header
  让对话区回到视觉主体；昔涟 Live2D 模型移至对话区右侧悬浮。
- **实际完成：**
  - **MiniMax 语音输出**：新增 `app/voice/minimax.py`（T2A v2 接口，hex 解码 MP3，
    `base_resp.status_code==0` 判成功，网络/业务错误分别可读），`create_voice_provider` 与
    `/api/voice` 路由中 MiniMax 优先于账号级 TTS profile 与本地运行时；`/api/voice/status`
    配置后返回 `provider=minimax`。配置项：`EDUCATION_MINIMAX_API_KEY / _GROUP_ID /
    _MODEL / _VOICE_ID / _TIMEOUT`（key 只存服务端，前端继续消费 `/api/voice/synthesize`）。
  - **移除 Genie-TTS 嵌入式启动**：`create_app` 不再在 lifespan 启动 Genie 运行时
    （启动更快、不再出现 CN_HuBERT 加载报错）；相关生命周期测试随能力一并移除，
    genie 代码文件保留但不再是生产路径。前端语音类型与归属标签适配 `minimax`。
  - **Header 单行紧凑**：返回 + 任务名 + 类型/时长 chips + 六步阶段轨 + 抽屉 icons + 任务序号
    合并为一行（阶段轨可横向滚动，说明文字并入阶段 tooltip），工作台首屏高度显著下降。
  - **Live2D 悬浮陪伴**：全尺寸昔涟模型固定悬浮于对话区右下角（xl 及以上屏幕显示，
    pointer-events-none 不遮挡交互），runtime/thinking 与语音口型状态由页面上抛联动；
    对话区因 Header 压缩与模型外移获得更大空间。
- **关键决策：**
  - MiniMax 走后端代理而非浏览器直连：密钥不暴露给前端，且与现有
    `/api/voice/synthesize` blob 播放链路完全兼容，前端仅需类型与文案适配。
  - Genie 代码文件本轮保留（非生产路径），避免一次性删除 16 处引用带来的回归风险；
    后续可单独清理。
- **对应提交：** `feat: minimax voice output, compact workbench header and floating live2d`
- **修改文件与资源：**
  - 后端：`app/voice/minimax.py`（新增）、`app/voice/{provider,status,models}.py`、
    `app/api/routes/voice.py`、`app/core/config.py`、`app/main.py`、
    `tests/test_minimax_voice.py`（新增 4 项）、删除 `tests/test_genie_embedded_api.py`
  - 前端：`src/lib/voiceApi.ts`、`VoiceAttributionNotice`、`SpaceTutor`（speaking 上抛）、
    `WorkbenchTaskHeader`（单行重构）、`LearningSpacePage`（悬浮角色）
- **验证结果：**
  - `pnpm check`：通过；`npx vitest run`：77 文件 262 项测试全部通过；`pnpm build`：成功；
    `uv run pytest`：后端 365 项全部通过（含 MiniMax 4 项）。
  - 浏览器实测：单行 Header 正确渲染；昔涟 Live2D 全尺寸悬浮于右下角；对话区占屏比例明显提升。
    MiniMax 真实合成需部署方填入 API Key 后在设置中验证。
- **负责人：** EducationMind 项目组

## 4. 问题追踪表

| 编号 | 日期 | 问题 | 状态 | 处理记录 |
| --- | --- | --- | --- | --- |
| UI8-01 | 2026-08-23 | 旧小涟状态同时表达运行过程和陪伴语气 | 已解决 | Zustand 中拆分 Runtime State 与 Companion State，在角色组件边界映射展示资源 |
| UI8-02 | 2026-08-23 | 任务入口直接启动，缺少基于真实数据的学习准备 | 已解决 | 使用 LearningEntryDialog 包装所有页面级既有任务启动流程 |
| UI8-03 | 2026-08-23 | 可用计划任务图标可能被理解为已完成 | 已解决 | Today's Journey 使用中性圆形标识可用任务，只为真实完成状态保留完成语义 |
| UI8-04 | 2026-08-23 | 学习准备阶段的数据错误与确认状态边界不够清晰 | 已解决 | 拆分 Diagnosis/Evidence 错误，并在准备数据加载时禁用开始确认 |
| UI8-05 | 2026-08-23 | 重规划后原任务不在 Current Plan 时页面无法继续 | 已解决 | 已有可信复述结果时，Reflection 页面回落到当前计划排序后的首个真实任务，同时保持新复述提交关闭 |
| HD-01 | 2026-08-25 | 默认开发注入在 Windows 中文及空格路径下触发虚拟模块 500 | 已解决 | Design Mode 与监控脚本改为显式环境变量启用，默认插件列表只保留 React |
| HD-02 | 2026-08-25 | 尚无 Current Plan 时正常 404 被共享拦截器输出为错误 | 已解决 | 仅在 Current Plan 调用边界接受 404 并返回 null，保留后端契约 |
| HD-03 | 2026-08-25 | 生产入口脚本 694.25 kB 并触发大包提示 | 已解决 | 非首页路由懒加载并按职责拆分第三方依赖，入口业务脚本降至 85.86 kB |
| HD-04 | 2026-08-25 | 390 px 首页主操作与固定底部导航相交 | 已解决 | 收紧移动端 Hero 尺寸、间距与按钮水平内边距，并完成真实视口测量 |
| HD-05 | 2026-08-25 | 项目自有 UTC 时间调用产生大批 Python 弃用警告 | 已解决 | 统一使用保持 naive UTC 数据库契约的共享时钟函数 |
| HD-06 | 2026-08-25 | Reflection 空状态缺少稳定的页面一级标题 | 已解决 | 在状态内容之外增加固定页面标题与真实数据边界说明 |
| UI9-01 | 2026-08-29 | 登录入口信息层级分散，缺少统一品牌焦点 | 已解决 | 采用品牌说明区与聚焦认证卡片的双栏入口，移动端收敛为紧凑布局 |
| UI9-02 | 2026-08-29 | 学习空间背景、导航和内容容器的视觉层级不统一 | 已解决 | 统一使用项目背景资源，收敛 AppShell、主导航、顶部陪伴入口和内容间距 |
| UI9-03 | 2026-08-29 | 窄视口认证卡片存在宽度约束风险 | 已解决 | 增加 viewport-clamped 宽度规则，并通过组件测试和浏览器 DOM 测量确认无实际横向溢出 |
| UI9-04 | 2026-08-29 | 首页缺少清晰的下一步学习行动和真实摘要 | 已解决 | 将主行动改为“继续今天的学习”，摘要只读取真实计划与学习证据，缺失时呈现空状态 |
| UI9-05 | 2026-08-29 | 黑夜主题下设置、星图、工坊、我的学习、诊断、考试中心多处面板呈低对比灰块，文字不可读 | 已解决 | `theme.css` 暗色重映射按实际用法穷举补全（全部 `bg-white/*` 档位、浅色 `-50/-100` 底色、配套深色文字、白色渐变 stops、浅紫边框），星图颜色改为主题变量驱动 |
| HD-07 | 2026-08-29 | 仓库残留未被引用的示例页、占位组件、shadcn 基元与十余项未使用依赖，另有本地日志、缓存与过期备份 | 已解决 | 删除死代码与未用依赖，清理 `.logs/`、`.tmp/`、`.pytest_cache/`、`__pycache__/` 与过期 `.bak` 备份；保留构建产物与运行数据库 |
| UI9-06 | 2026-08-29 | 学习工作台首屏被标题区、任务横幅与两条步骤条四层堆叠占据，信息重复、核心工作区被挤出首屏 | 已解决 | 收敛为单个紧凑任务头（任务 chips + 单条六步进度轨），精简学习单元面板，删除三个被取代的组件；桌面与窄视口实测核心工作区回到首屏 |
| UI9-07 | 2026-08-29 | 工作台左右两栏常驻的课前引导与学习产物仍显臃肿 | 已解决 | 参考 Codex 式布局改为中央单栏对话流，课前引导与学习产物改为任务头开关唤起的右侧滑出面板，删除常驻学习单元面板 |
| UI9-08 | 2026-08-29 | 对话仍包在玻璃面板容器内，与参考站"页面即对话"的形态有差距 | 已解决 | 去容器化并改为页面级滚动，助手气泡轻量化，输入区改为底部悬浮玻璃胶囊并避开移动端导航 |
| UI9-09 | 2026-08-29 | 存在 /agent 与 /xiaolian 两个聊天页面 | 已解决 | 删除 /agent 路由与包装页，/xiaolian 成为唯一聊天入口，关于页同步移除入口 |
| HD-08 | 2026-08-29 | 资源生成/组卷/题库的知识点列表硬编码为操作系统五项，切换学科后错配 | 已解决 | 后端新增课程知识点列表接口，前端统一走 useKnowledgePointOptions 按当前课程读取，含加载与错误态 |
| KB-01 | 2026-08-29 | 知识库仅有一门操作系统课程，学科选择单一 | 已解决 | 新增计算机网络与数据结构与算法两门课程、10 个知识点与 10 篇分章节材料，注册选课自动展示 |
| HD-09 | 2026-08-29 | 国内网络到 Cloudflare Siteverify 间歇中断，注册登录报"验证服务暂不可用"；前端组件加载失败时登录被锁死 | 已解决 | 引入 Vaptcha 兜底链：后端按 captcha_provider 分发校验，前端 CaptchaPanel 在脚本加载失败或 8 秒未出票时自动切换 Vaptcha 并提示；EDUCATION_CAPTCHA_MODE 可强制单源或关闭 |
| HD-10 | 2026-08-29 | 部署方把 Vaptcha 密钥填入仓库根 `.env`，但后端实际读取 `apps/api/.env`，兜底未生效；旧后端进程未重启也导致前后端验证状态不一致 | 已解决 | 密钥写入生效的 `apps/api/.env` 并重启后端，config 下发 `["turnstile","vaptcha"]` 双源链；README 明确配置文件位置与重启要求；人机验证错误详情映射为中文提示；全部 provider 加载失败时展示内联重试入口 |
| UI9-10 | 2026-08-29 | 工作台缺少统一历史记录入口，证据/产物/技术详情常驻挤占主学习区 | 已解决 | 建立历史/产物/上下文三个语义独立的按需抽屉（移动端 Bottom Sheet），Header icon 化入口 + 移动端 ··· 菜单；主区仅保留对话流与练习卡，功能零删除 |
| HD-11 | 2026-08-29 | Genie-TTS 嵌入式运行时启动慢且在模型缺失时报错；语音输出需切换到 MiniMax 开放平台 | 已解决 | 新增 MiniMax TTS provider 并置于输出链最高优先级，移除 Genie lifespan 启动；配置 EDUCATION_MINIMAX_API_KEY/_GROUP_ID 后自动接管语音输出，未配置时诚实降级 |
| HD-12 | 2026-08-29 | MiniMax 密钥配置后语音仍不可用：运行中的后端进程未重启（配置在启动时读取，`get_settings` 带缓存），且 MiniMax 控制台的 UID 即接口所需的 GroupId | 已解决 | 确认 `apps/api/.env` 的四项 MiniMax 配置解析正常后重启后端，`/api/voice/status` 返回 `provider=minimax`；README 记录"UID 即 GroupId、配置后必须重启"要点 |
| HD-13 | 2026-08-29 | Turnstile 组件加载成功并出票后，后端向 Cloudflare Siteverify 校验时网络失败，前端不会切换 Vaptcha，登录仍报 400 | 已解决 | AuthProvider 结构化识别"校验服务暂不可用"响应，AuthScreen 自动强制切换到 Vaptcha 并提示重新验证提交；"重新加载验证"同时清空过期的切换提示状态 |
| UI9-11 | 2026-08-29 | 工作台 Header 双行布局过高，对话区显得偏小；昔涟 Live2D 仅以小图标出现在对话头部 | 已解决 | Header 收敛为单行（标题+chips+阶段轨+icons），全尺寸昔涟 Live2D 悬浮于对话区右下角并联动运行/口型状态 |

## 5. 节点记录

| 日期 | 节点 | 依据 |
| --- | --- | --- |
| 2026-08-19 | 真实学习任务入口与多 Agent 学习体验形成 | Git 历史与 Phase 3 文档 |
| 2026-08-20 | 课程知识检索、动态重规划、Tools/MCP 能力形成 | Git 历史 |
| 2026-08-22 | Learning Reflection Loop 与 Xiaolian Memory Experience 完成 | Git 提交 `92b141a` |
| 2026-08-23 | UI-8 Xiaolian Companion Flow 启动 | 本阶段设计与实施计划 |
| 2026-08-23 | UI-8 陪伴流程、学习准备与下一任务引导完成 | 源码、测试与提交前验证记录 |
| 2026-08-25 | Product Hardening 完成 | 前后端测试、生产构建与 30 场景浏览器巡检记录 |
| 2026-08-29 | Learning Space Layout Refresh 完成 | 前后端测试、生产构建、桌面/移动端布局检查与 `main` 远端推送记录 |
| 2026-08-29 | 工作区清理与黑夜主题可读性修复完成 | 前后端测试、生产构建与逐页浏览器巡检记录 |
| 2026-08-29 | 紧凑学习工作台完成 | 前端测试、生产构建与桌面/窄视口浏览器实测记录 |
| 2026-08-29 | Codex 式单栏工作台布局完成 | 前端测试、生产构建与桌面/窄视口滑出面板实测记录 |
| 2026-08-29 | 参考站对齐的页面级对话完成 | 前端测试、生产构建与真实对话/窄视口实测记录 |
| 2026-08-29 | V2 视觉升级与知识库扩充完成 | 前后端测试、生产构建、网状图/多学科/画像雷达浏览器实测记录 |
| 2026-08-29 | Vaptcha 兜底人机验证完成 | 前后端测试、生产构建与降级链浏览器实测记录 |
| 2026-08-29 | 验证配置踩坑修复（配置文件位置/降级 UX）完成 | 双源链 config 实测、前端 249 项测试与生产构建记录 |
| 2026-08-29 | 工作台组件化架构与历史记录体系完成 | 前后端测试、生产构建与桌面/移动端抽屉实测记录 |
| 2026-08-29 | MiniMax 语音输出与紧凑工作台完成 | 前后端测试、生产构建与浏览器实测记录 |
| 2026-08-30 | 人机验证后端校验失败自动切换 Vaptcha 完成 | 前端测试、生产构建与登录页降级实测记录 |
| 2026-08-30 | GraphRAG 与全站体验收敛完成 | 真实图数据稳定性回归、对话持久化、云端能力与关键页面测试记录 |

## 6. 团队分工与贡献

| 角色 | 贡献 |
| --- | --- |
| EducationMind 项目组 | 产品目标、学习体验与数据可信边界 |
| 前端开发 | React 组件、路由集成、前端状态与测试 |
| 后端与领域实现 | 既有 Profile、Diagnosis、Plan、Evidence、Knowledge 和评价数据来源 |

## 7. 资源与成果清单

- `README.md`：项目能力与运行说明
- `docs/architecture.md`：系统架构与数据边界
- `docs/superpowers/specs/`：阶段设计说明
- `docs/superpowers/plans/`：阶段实施计划
- `docs/创新赛道——开发日志参考模板.docx`：开发日志参考模板
- `docs/EducationMind开发日志.md`：持续维护的开发日志
- `public/brand/learning-space-background.png`：学习空间统一背景资源

## 8. 经费使用记录

当前仓库没有可核验的经费数据，本节暂不填写金额。

## 9. 变更记录

| 日期 | 版本 | 变更 |
| --- | --- | --- |
| 2026-08-23 | 1.0 | 按参考模板建立开发日志，补录已完成阶段并登记 UI-8 |
| 2026-08-23 | 1.1 | 完成 UI-8，补录真实文件、数据来源、路由、问题处理与 18 文件 76 测试验证结果 |
| 2026-08-23 | 1.2 | 完成 UI-8 提交前评审修复，更新为 20 文件 82 测试并补录错误隔离、诊断重点和重规划续接边界 |
| 2026-08-23 | 1.3 | 补齐 Reflection 页面级重规划续接，更新为 21 个测试文件、83 项测试 |
| 2026-08-25 | 1.4 | 完成 Product Hardening，补录运行稳定性、性能、移动端、UTC 时间与语义修复 |
| 2026-08-29 | 1.5 | 完成 Learning Space Layout Refresh，补录参考布局、背景资源、认证入口、响应式壳层、真实空状态、验证结果与 main 推送 |
| 2026-08-29 | 1.6 | 完成工作区清理与黑夜主题可读性修复，补录死代码/依赖清理、暗色重映射补全、星图主题化与逐页巡检结果 |
| 2026-08-29 | 1.7 | 完成紧凑学习工作台重构，补录任务头收敛、学习单元精简、组件删除与双视口实测结果 |
| 2026-08-29 | 1.8 | 完成 Codex 式单栏工作台布局，补录滑出面板、任务头开关、常驻左栏删除与实测结果 |
| 2026-08-29 | 1.9 | 完成参考站对齐的页面级对话，补录去容器化、悬浮输入区、气泡轻量化与真实对话实测 |
| 2026-08-29 | 2.0 | 完成 V2 视觉升级与知识库扩充：聊天页合一、知识图谱网状化、两门新学科、知识点数据源统一与掌握度雷达 |
| 2026-08-29 | 2.1 | 完成 Vaptcha 兜底人机验证：定位 Cloudflare 可达性根因，新增 provider 分发校验、前端自动降级与双源组件测试 |
| 2026-08-29 | 2.2 | 完成工作台组件化架构：历史/产物/上下文三抽屉、Header icon 化与移动端 ··· 菜单、回答内来源收纳与运行详情折叠，功能零删除 |
| 2026-08-29 | 2.3 | 完成 MiniMax 语音输出替换与紧凑工作台：MiniMax provider 最高优先级、Genie 启动移除、Header 单行化与 Live2D 右下悬浮 |
| 2026-08-30 | 2.4 | 修复真实知识图谱节点展开后的非有限坐标；升级为课程约束 GraphRAG；新增对话历史与长期记忆、MiniMax 图文并行生成、富文本预览与 AI 优化、AnySearch、六维画像与 AI 总结、初始化设置；彻底移除旧本地/账号 TTS 运行链与浏览器朗读回退 |

## 10. 附件与参考链接

- UI-8 设计：`docs/superpowers/specs/2026-08-23-educationmind-ui-8-design.md`
- UI-8 实施计划：`docs/superpowers/plans/2026-08-23-educationmind-ui-8.md`
- Product Hardening 设计：`docs/superpowers/specs/2026-08-24-educationmind-product-hardening-design.md`
- Product Hardening 实施计划：`docs/superpowers/plans/2026-08-24-educationmind-product-hardening.md`
- Learning Space Layout Refresh 设计：`docs/superpowers/specs/2026-08-29-learning-space-layout-design.md`
- Learning Space Layout Refresh 实施计划：`docs/superpowers/plans/2026-08-29-learning-space-layout-refresh.md`
- GraphRAG 学习体验设计：`docs/superpowers/specs/2026-08-30-graphrag-learning-experience-design.md`
- GraphRAG 学习体验实施计划：`docs/superpowers/plans/2026-08-30-graphrag-learning-experience.md`
- 参考布局：<http://122.51.33.232>
- 开发日志参考模板：`docs/创新赛道——开发日志参考模板.docx`
