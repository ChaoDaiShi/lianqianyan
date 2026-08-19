# 忆涟千言—教 · EducationMind

> 基于学习画像、学习证据与动态学习规划的 **个性化 AI 学习伙伴**。

「忆涟千言—教」不是普通 AI 聊天机器人。核心目标是把“学生现在会什么、不会什么、
接下来应该学什么”持续地判断出来，并形成完整学习闭环：

```text
学习目标 → 学习诊断 → 学习画像 → 个性化学习规划 → 学习执行
   → 练习 / 提问 / 复述 / 测评 → 生成学习证据 → 更新掌握度 → 动态调整学习计划
```

> **页面只是学习过程的表现层，Learning Evidence 才是 EducationMind 的核心数据。**

---

## 产品定位

- 用户对外只看到一个 AI：**小涟**（Education Agent）。
- 逻辑能力划分为 Profile / Diagnosis / Planner / Tutor / Practice / Assessment / Memory / Resource。
- 第一阶段这些实现为 **Service / Skill**，而不是多个真正运行的 Agent。

---

## 核心学习闭环

```text
Learning Action（学习行为）
   ↓
LearningEvidence（学习证据）← 核心数据
   ↓
MasteryProjection
   ↓
MasteryRecord
   ↓
LearnerProfile（学习画像 · Derived Read Model）
   ↓
Diagnosis（学习诊断）
   ↓
Education Web
```

学习证据来源：学习知识点、回答问题、完成练习、提交考试、产生错题、向 AI 提问、
完成费曼复述、完成代码任务、完成交互学习活动。

---

## 技术架构

```text
                       EducationMind
                            │
            ┌───────────────┼───────────────┐
            │               │               │
           Web             API          MCP Server *
            │               │               │
            └───────────────┼───────────────┘
                            ↓
                    Education Domain
                            │
        ┌───────────────────┼────────────────────┐
        │          │        │        │           │
     Profile    Diagnosis  Planner   Tutor    Assessment
        │          │        │        │           │
        └───────────────────┼────────────────────┘
                            ↓
                     Learning Evidence
```

| 边界 | 位置 | 技术 |
| --- | --- | --- |
| Web UI | `src/` | React 18 + TypeScript + Vite + React Router（hash）+ Zustand + Tailwind + Lucide |
| Education API | `apps/api/` | Python + FastAPI + Pydantic + SQLAlchemy（uv） |
| Education Domain | `src/domain`（TS）· `apps/api/app/domain`（Python） | 双实现、契约一致 |
| MCP Server | `mcp/server/` | **本轮仅架构预留** |

数据库第一阶段 SQLite，保持迁移能力（SQLAlchemy 统一抽象，未来 PostgreSQL/MySQL
仅改 `EDUCATION_DATABASE_URL`）。AI 层保留统一 LLM Provider 抽象（支持未来
OpenAI-compatible / DeepSeek / Qwen）。

---

## 项目目录

```text
├── src/                      # Web 前端（React Workspace 本体）
│   ├── domain/               # 领域模型（TS）
│   ├── mock/                 # 集中 Mock 数据（Single Source of Truth）
│   ├── store/                # Zustand 状态（小涟面板）
│   ├── lib/                  # api 客户端 + 服务 + 工具
│   ├── components/           # 侧边栏 / 卡片 / 小涟面板 / 占位页
│   └── pages/                # 路由页面
├── apps/api/                 # FastAPI 后端（Education API）
├── packages/                 # 共享包（预留）
├── mcp/server/               # MCP 架构预留（README + 接口设计）
├── docs/                     # 架构文档
└── README.md
```

---

## 快速启动

### Frontend（Web）

依赖与命令使用 **pnpm**：

```bash
pnpm install
pnpm dev              # 开发服务器（默认地址见终端输出）
pnpm build            # 生产构建
pnpm check            # 质量门禁：tsc 类型检查 + eslint
```

默认首页 `/#/` 即**学习首页**（忆涟千言—教 教育工作台）。

### Backend（API）

依赖与虚拟环境使用 **uv**：

```bash
cd apps/api
uv sync                    # 安装依赖
uv run uvicorn app.main:app --reload --port 8000
```

交互式文档：`http://localhost:8000/docs`

```bash
uv run pytest              # 运行测试（至少覆盖 /api/health）
```

---

## 当前已实现功能（第一阶段）

> **可信性原则**：EducationMind 严格区分「尚未评估」与「真实薄弱」——
> `mastery=0 且 evidence=0 ≠ 学生完全不会`，而是 **UNASSESSED（尚未评估）**。
> 这是前后端共同遵守的可信性原则，绝不把「未知」伪装成「0 分」或「薄弱」。

- **教育 Web Workspace**：左侧教育工作台导航 + 学习首页完整实现。
- **学习首页**：问候区、学习数据卡片、当前学习计划、今日学习任务、
  真实「需要重点关注 + 小涟建议」、个性化学习路径（七阶段：学→问→探→练→诊→述→测）。
- **全局小涟**：右下角悬浮 AI 入口 + 右侧 Assistant 面板（Mock 回复 / 仅 UI）。
- **集中 Mock 数据**：`src/mock/` 为唯一演示数据来源。
- **领域模型基础类型**：TS（`src/domain`）与 Python（`apps/api/app/domain`）。
- **学习证据真实链路（已打通）**：首页「继续学习 / 开始这段学习」→ 前端 `startLearning()`
   经 Vite 代理 → `POST /api/learning/start` → `LearningEvidenceService`/`Repository` → 持久化
   SQLite（`learning_started` 作为行为证据**真实落盘**：该路由作为写操作业务事务边界统一提交，
   只记录行为、不改掌握度）→ 返回 evidence id → 跳转学习空间并提示「小涟已记录本次学习开始」。
- **掌握度投影（Phase 2B）**：真实链路从「学习行为 → LearningEvidence」升级为
  「学习行为 → LearningEvidence → **Mastery Projection** → MasteryRecord」：
  - `learning_started` 只是**行为证据**，不改变掌握度；
  - `practice_answer_evaluated` 属于**评价证据**，可影响掌握度（仅这类证据计入
    assessment `evidence_count`）；
  - `/space` 提供「PV 操作 · 快速练习」真实练习，提交后调用
    `POST /api/practice/evaluate`，由 `MasteryProjectionService` + `MasteryUpdatePolicy`
    计算新掌握度并持久化到 SQLite，前端展示 before → after 与置信度；
  - `GET /api/profile/mastery/{kp}` 读取真实掌握状态；Demo 初始 `demo-user-001 + kp-pv`
    掌握度 `0.58` 通过 Seed 建立。
  - **当前算法仅为基础、确定性 Mastery Update Policy**（非 AI Knowledge Tracing / BKT / DKT）。
- **学习诊断（Phase 2C）**：真实链路从「MasteryRecord」升级为
  「MasteryRecord + KnowledgePoint → **LearnerProfile**（Derived Read Model）→ **Diagnosis**」：
  - `LearnerProfile` 是**请求时动态计算**的投影（Derived Read Model），**Source of Truth 是
    MasteryRecord**，避免状态漂移；`GET /api/profile/{learner_id}?course_id=course-os`。
  - `DiagnosisService` 由确定性 `KnowledgeDiagnosisPolicy` + `PriorityPolicy` 生成结构化诊断
    （**不使用 LLM** 判断学生能力状态）；`GET /api/diagnosis/{learner_id}?course_id=course-os`。
  - **严格区分「尚未评估」与「薄弱」**：`evidence_count=0` 判 `UNASSESSED`，绝不会判为 `WEAK`；
    证据不足判 `INSUFFICIENT_EVIDENCE`。只有足够有效 assessment evidence 才判定
    WEAK / DEVELOPING / PROFICIENT / MASTERED（阈值集中在 `DiagnosisThresholds`）。
  - `primary_focus` 来自最高可信 `priority_score`（`priority=(1-mastery)×confidence`）；
    未评估知识点不会成为高优先级弱点。
  - `overall_mastery` 只聚合有足够证据的知识点（confidence 加权），UNASSESSED 不作为 0 拉低平均；
    数据不足时返回 `null`。
  - 前端 `/#/diagnosis` 升级为**真实学习诊断页**（状态概览 / 重点关注 / 知识点列表 / 尚未评估 /
    小涟建议，含 loading / error / empty 状态）。
  - 首页「需要重点关注」**完全由真实 Diagnosis 驱动**：展示 `priority_interventions` Top 3
    （顺序沿用后端 `priority_score DESC`，前端不重排、不新造排序）；小涟建议由结构化
    `primary_focus` 确定性生成（不调用 LLM）。严格处理 loading / ready / error / empty 四种状态：
    **API 失败时不回退 Mock 薄弱点冒充真实诊断**，改为展示「暂时无法读取最新学习诊断 + 重新加载」；
    未评估知识点显示「尚未评估 / --」，**绝不显示 0%**。首页只消费 `DiagnosisResult`，
    **不在前端重新诊断**（无 `if (mastery < 0.5) weakPoints.push(...)` 之类逻辑），
    也不突出工程 priority 数值（面向学生显示「优先关注 / 建议优先巩固」）。
  - Demo：`course-os` 五知识点 Seed（进程基础/进程同步/PV 操作/死锁/进程调度），
    Demo Baseline（MasteryRecord）与真实 LearningEvidence 语义分离，不伪造历史行为。
- **诊断驱动学习计划（Phase 2D）**：真实链路从「Diagnosis」升级为
  「Diagnosis → **StudyPlanner** → **StudyPlanDraft** → **StudyPlanPersistence** →
  SQLite（Plan + Tasks 同一事务）」：
  - **Planner 确定性规划**（`StudyPlannerService` + `StudyPlannerPolicy`）：
    输入必须是结构化 DiagnosisResult（绝不自行读 Mastery 再判断）；状态 → 动作映射
    （UNASSESSED/INSUFFICIENT_EVIDENCE → ASSESS，**未知 ≠ 薄弱，绝不 REMEDIATE**；
    WEAK → REMEDIATE；DEVELOPING → STRENGTHEN；PROFICIENT → REVIEW；MASTERED 不进入
    短期计划）；Action Tier（REMEDIATE < ASSESS < STRENGTHEN < REVIEW）+ primary_focus
    优先 + priority_score 降序 + 稳定序排序；MAX_TASKS=3；时长集中配置（15/35/25/15 min）。
    相同 Diagnosis 输入 → 相同 Plan（确定性，无 LLM）。
  - **计划持久化**（`StudyPlanPersistenceService`）：`POST /api/plans/generate` 显式生成
    并落库（客户端只提交 learner_id/course_id，Diagnosis/Tasks 全部服务端生成）；
    Plan + N Tasks 同一事务，任何失败全回滚（绝不半成功）；Empty Plan
    （全部 MASTERED → `tasks=[]` + `NO_IMMEDIATE_INTERVENTION`）是合法规划结果。
  - **计划读取**：`GET /api/plans/{plan_id}` 返回完整 Plan + 按 order 排序的 Tasks
    （不存在 → 404）；`GET /api/plans?learner_id=&course_id=` 返回 Plan History
    摘要（generated_at DESC 最新在前，含 task_count，不展开全部 Tasks）。
    读取无副作用（不自动生成/不 refresh Diagnosis/不 supersede/不写 DB）。
  - **Provenance**：strategy / generated_at / source_diagnosis_generated_at /
    reason_codes / action_type / source_status / source_priority_score / priority /
    order / draft_key 全部持久化，未来 Mastery 变化后仍可解释旧计划为何这样生成。
  - **当前计划（Phase 3-1）**：正式实现 Active 唯一性 —— `POST /api/plans/generate`
    在**同一事务**内先 supersede 旧 ACTIVE 再落新计划，任意时刻至多一个 ACTIVE；
    `GET /api/plans/current?learner_id=&course_id=` 读取当前 ACTIVE 计划（完整
    Plan + Tasks；无 → 404，GET 绝不自动生成）。Web 侧 `/#/my-learning` 展示
    **当前计划**（任务 Timeline + 「重新规划」按钮 + 历史计划列表，历史计划标记
    superseded 不可再开始学习）；首页「今日学习计划」、`/#/space`、`/#/archive`
    全部读取 current 语义。「重新规划」= 显式重新生成（自动 supersede 旧计划），
    **不是**自动/定时 Dynamic Replanning。
- **学习上下文驱动 AI Tutor（Phase 3-0）**：真实链路从「Diagnosis/Plan」升级为
  「学生提问 → **TutorContextBuilder**（Profile / Diagnosis / StudyPlan / 最近证据，
  全部复用既有服务，禁止重复计算）→ **集中 Prompt** → **LLM Provider 抽象** →
  个性化回答」：
  - `POST /api/tutor/chat`（learner_id / course_id / message）→ `TutorResponse`
    （answer / **context_used** 解释能力 / suggested_actions / source）。
  - **LLM Provider 抽象**：复用 `BaseLLMProvider`，当前默认 `MockTutorProvider`
    （接口真实、确定性、上下文感知；无真实 API Key 时不绑定 OpenAI）；
    LLM 失败 → **确定性 fallback**（`source="fallback"` 诚实标记，不伪装 LLM）。
  - **请求级上下文**：不保存聊天历史、不建 Conversation 表（Memory System 未来接入）。
  - Web `/#/xiaolian`：小涟聊天窗口（loading / error / 上下文徽章 / 建议动作 /
    三个演示问题）。Demo：死锁问题引用诊断、今天学什么引用计划、PV 问题引用画像。
- **FastAPI 最小骨架**：`/api/health` + 各业务路由占位 + 健康测试。
- **统一 LLM Provider 抽象**（接口真实；当前演示使用 Mock Provider）。
- **MCP 架构预留**：目录 + README + Tool 接口设计（不实现假工具）。

---

## 未实现（明确不在本轮范围）

以下能力当前**尚未实现**，不提前宣传：

- 自动 / 定时 **Dynamic Replanning**（当前「重新规划」为显式触发：
  `POST /api/plans/generate` 自动 supersede 旧计划；时间轴 / deadline 驱动的
  自动重规划尚未实现）
- 历史计划**详情展开**（`/#/my-learning` 已展示历史计划列表与 superseded 状态，
  点击查看某份旧计划的完整 Tasks 属后续）
- 完整学习空间（当前 `/space` 提供当前计划任务 + 学习内容 + 快速练习 + 小涟助手，
  更多练习题型待后续阶段）
- **AI Tutor 已具备基础（Phase 3-0）**：已支持「学习上下文驱动 AI Tutor」
  （Profile/Diagnosis/Plan 上下文 + 集中 Prompt + LLM Provider 抽象 + 确定性 fallback，
  见上文）；**尚未实现**：RAG / 记忆持久化（聊天历史）/ 真实 LLM API Key（当前 Mock）。
- AI 自动出题 / AI 判题
- 费曼复述 / 错题本
- 知识图谱 / RAG / 向量数据库
- MCP Runtime / MCP Tools / SDK / Multi-Agent Runtime
- 数字人 / TTS / 语音识别
- 复杂考试系统 / 网络搜索 / PDF 解析 / 管理后台

> **算法描述必须真实**：当前 Mastery 使用**确定性基础更新策略**
> （`MasteryUpdatePolicy`），Diagnosis 使用**可解释确定性规则**
> （`KnowledgeDiagnosisPolicy` + `PriorityPolicy`），LearnerProfile 是
> 基于 MasteryRecord 动态聚合的 **Derived Read Model**。本系统**不使用**
> AI Knowledge Tracing / BKT / DKT / LLM 诊断 / 智能精准画像算法。

---

## MCP 集成规划

MCP Server 未来把 EducationMind Domain Service 封装为标准 MCP Tools，供其他
Agent 系统接入。预计 Tool：`get_learner_profile`、`diagnose_learning_state`、
`generate_study_plan`、`get_current_study_plan`、`start_learning_session`、
`generate_practice`、`evaluate_answer`、`evaluate_feynman_explanation`、
`update_mastery`、`generate_learning_report`。

详见 `mcp/server/README.md` 与 `mcp/server/docs/tools.md`。

---

> **声明**：当前版本属于 EducationMind 第一阶段，**不宣称**已经实现完整学习画像、
> 多智能体或 MCP Runtime。

## License

MIT License
