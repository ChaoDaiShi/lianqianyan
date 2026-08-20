# EducationMind 星海学院 UI 重构设计

**日期：** 2026-08-20  
**范围：** 仅 React/Vite 前端表现层  
**产品定位：** 忆涟千言—教是陪伴学习者成长的 AI 学姐，而不是后台管理系统。

## 1. 设计目标

将现有左侧后台菜单、白色卡片和蓝色管理台视觉，重构为温柔、梦幻、可信的 AI 学习空间。产品语言围绕“星海、记忆、知识流、未来学院、成长陪伴”展开，同时保持真实学习数据的可读性与现有 API 行为。

不修改后端、数据库、领域模型、API 契约、Agent/MCP 能力或学习业务逻辑。所有 Profile、Diagnosis、Current Plan、Knowledge、Tutor、Evidence 与 Tool Catalog 数据继续来自现有接口。

## 2. 设计方向

采用“星海学院工作台”：

- 浅星云白紫背景，而非纯白后台画布。
- 梦幻紫 `#8B7CF6` 为主色，星空蓝 `#6CA8FF` 为信息色，少女粉 `#FF9FCB` 为陪伴强调。
- 半透明玻璃表面、柔和紫色描边、分层光晕和少量知识粒子。
- 角色感来自小涟头像、状态、文案和陪伴位置；不做 Live2D，不依赖未经确认的角色图片。
- 游戏化来自任务轨迹、星图、等级和状态节点，而非复杂动画或虚构奖励数值。

## 3. Design System

在 `src/design/` 建立集中设计层：

- `tokens.ts`：颜色、圆角、阴影、间距、动效时长。
- `theme.css`：CSS variables、星云背景、玻璃表面、光晕、滚动条和 reduced-motion。
- `motion.ts`：页面进入、卡片浮现、hover 与陪伴状态的 framer-motion presets。
- `index.ts`：统一导出。

视觉 tokens：

- Primary: `#8B7CF6`
- Secondary: `#6CA8FF`
- Accent: `#FF9FCB`
- Ink: 深靛紫，正文不使用冷硬纯黑。
- Background: 白紫浅星云多层渐变。
- Glass: 半透明白底 + 紫色低透明边框 + backdrop blur。
- Radius: 大面板 28px，普通面板 20px，按钮/标签按语义使用 14px 或 full。
- Motion: 180–420ms；只使用 opacity、transform、filter 等低成本属性。

新增 `framer-motion`，不引入大型 UI 框架。

## 4. 应用框架

`AppShell` 重构为 AI 学习空间：

- 顶部 `TopCompanionBar`：产品 Logo、小涟在线状态、设置入口。
- 桌面 `LearningRail`：窄幅学习星轨，不是传统 Sidebar。
- 移动端：底部学习星轨。
- 主内容：居中、宽松、可滚动的学习场景。
- 全局小涟入口：角色头像式悬浮入口，保留既有前端交互边界。

核心星轨入口只有：

1. 首页
2. 我的学习
3. 学习诊断
4. 知识空间
5. 学习档案

学习空间由任务进入；小涟通过顶部状态和悬浮入口持续可达。设置仍在顶部入口保留。

## 5. 素材边界

建立 `src/assets/xiaolian/manifest.ts` 管理 avatar、background、decoration、empty-state。

仓库当前没有可确认的小涟角色图片，因此首版使用原创 CSS/SVG 角色徽记与装饰，不拉取远程素材，不散落硬编码图片路径。未来接入正式素材时只替换 manifest 导出。

## 6. 共享组件

新增小而清晰的产品组件：

- `GlassPanel`：统一玻璃表面。
- `NebulaBackground`：背景光晕与知识粒子。
- `PageTransition`：页面进入动效。
- `LearningRail`：桌面/移动星轨导航。
- `TopCompanionBar`：品牌与小涟状态。
- `GrowthMetric`：成长指标，不使用后台 KPI 卡样式。
- `QuestCard`：游戏任务式计划任务。
- `KnowledgeStarMap`：诊断知识星图。
- `XiaolianPortrait`：统一角色视觉。
- `XiaolianAssistant`：统一小涟交互表面与状态。

`XiaolianAssistant` 支持 UI 状态：`idle | thinking | answering | happy | encourage`。它不增加 Agent 能力，不建立会话记忆，不实现 Live2D。

## 7. 页面设计

### 首页

第一屏是 AI 学习驾驶舱：

- 左侧：欢迎语、课程、当前学习目标、掌握度、今日建议和继续学习动作。
- 右侧：小涟角色区域、星空光晕和知识粒子。
- 数据继续来自 Profile、Diagnosis 和 Current Plan。

成长面板展示：

- 综合掌握度：真实 `overallMastery`。
- 学习可信度：真实 `overallConfidence`。
- 当前阶段：由真实 Diagnosis/Profile 确定性映射。
- 成长记录：现有 API 没有 streak，不伪造连续天数；显示“成长记录持续积累中”及真实证据/覆盖信息。

今日任务使用 `QuestCard`：

- 标题、时间来自真实 plan task。
- 难度由 action type 确定性映射。
- 奖励文案只承诺“完成后形成学习证据并更新状态”，不虚构积分或提升值。

### 学习诊断

改为“学习体检报告”：

- 小涟分析使用现有前端确定性文案函数和真实 Diagnosis。
- `KnowledgeStarMap` 以节点和轨迹展示知识点。
- 状态色：未评估灰银、薄弱红紫、发展中蓝、熟练蓝金、掌握金。
- 所有节点保留证据、可信度和掌握度信息。
- `UNASSESSED`/`INSUFFICIENT_EVIDENCE` 不显示 0%，不被表现为薄弱。

### 学习空间

桌面三栏任务场景：

- 左：当前知识点、任务类型、时间、状态和目标。
- 中：真实课程内容、关键理解、练习与重规划反馈。
- 右：小涟陪伴 Tutor。

移动端按任务、内容、小涟、练习顺序堆叠。所有现有 hooks、练习写入、Profile/Diagnosis/Plan 刷新保持不变。

### 我的学习

改为“成长路线”：

- 当前计划元数据成为路线概览。
- 任务成为星轨关卡。
- 显式生成/重新规划按钮与事务语义保持不变。

### 学习档案

改为“成长记忆”：

- Profile/Diagnosis/Current Plan/Recent Evidence 继续真实聚合。
- 采用记忆片段、成长轨迹和星点分布，不使用后台报表布局。

### 知识空间与设置

占位页面纳入相同设计语言，但不新增不存在的课程、搜索或管理功能。

## 8. 数据与错误状态

- API 契约和 `educationApi.ts` 业务映射不变。
- loading：柔和骨架和小涟 `thinking`。
- error：玻璃错误面板与原有重试。
- empty：小涟空状态，不回退 Mock learner state。
- Agent trace、Tool Catalog 与 Sources 保留真实数据和语义。
- 全局旧 Mock 小涟入口只作为 UI 演示边界；正式 Tutor 页面/学习空间仍调用真实 Agent API。重构时不宣称它具备后端记忆能力。

## 9. 响应式与无障碍

- 桌面学习星轨在窄屏转为底部导航。
- 主页面不产生 body 横向滚动。
- 星图在移动端切换为轨迹式节点列表。
- 保留按钮语义、aria-label、键盘 focus 和足够对比度。
- 尊重 `prefers-reduced-motion`。

## 10. 验证标准

- 只修改前端、前端配置与本设计文档；不修改 `apps/api/`、数据库或后端文档。
- `pnpm check` 通过。
- `pnpm build` 通过。
- 实际启动应用，验证首页、Diagnosis、Learning Space、My Learning、Archive。
- 有浏览器驱动时获取桌面和窄屏截图并检查溢出；无驱动时不为此新增 Playwright，必须如实报告。
- 最终报告修改文件、UI 架构、截图验证、门禁结果与 `git status`。
