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

## 5. 节点记录

| 日期 | 节点 | 依据 |
| --- | --- | --- |
| 2026-08-19 | 真实学习任务入口与多 Agent 学习体验形成 | Git 历史与 Phase 3 文档 |
| 2026-08-20 | 课程知识检索、动态重规划、Tools/MCP 能力形成 | Git 历史 |
| 2026-08-22 | Learning Reflection Loop 与 Xiaolian Memory Experience 完成 | Git 提交 `92b141a` |
| 2026-08-23 | UI-8 Xiaolian Companion Flow 启动 | 本阶段设计与实施计划 |
| 2026-08-23 | UI-8 陪伴流程、学习准备与下一任务引导完成 | 源码、测试与提交前验证记录 |
| 2026-08-25 | Product Hardening 完成 | 前后端测试、生产构建与 30 场景浏览器巡检记录 |

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

## 10. 附件与参考链接

- UI-8 设计：`docs/superpowers/specs/2026-08-23-educationmind-ui-8-design.md`
- UI-8 实施计划：`docs/superpowers/plans/2026-08-23-educationmind-ui-8.md`
- Product Hardening 设计：`docs/superpowers/specs/2026-08-24-educationmind-product-hardening-design.md`
- Product Hardening 实施计划：`docs/superpowers/plans/2026-08-24-educationmind-product-hardening.md`
- 开发日志参考模板：`docs/创新赛道——开发日志参考模板.docx`
