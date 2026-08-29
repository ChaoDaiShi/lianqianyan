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

## 10. 附件与参考链接

- UI-8 设计：`docs/superpowers/specs/2026-08-23-educationmind-ui-8-design.md`
- UI-8 实施计划：`docs/superpowers/plans/2026-08-23-educationmind-ui-8.md`
- Product Hardening 设计：`docs/superpowers/specs/2026-08-24-educationmind-product-hardening-design.md`
- Product Hardening 实施计划：`docs/superpowers/plans/2026-08-24-educationmind-product-hardening.md`
- Learning Space Layout Refresh 设计：`docs/superpowers/specs/2026-08-29-learning-space-layout-design.md`
- Learning Space Layout Refresh 实施计划：`docs/superpowers/plans/2026-08-29-learning-space-layout-refresh.md`
- 参考布局：<http://122.51.33.232>
- 开发日志参考模板：`docs/创新赛道——开发日志参考模板.docx`
