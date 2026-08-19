# EducationMind 架构文档

## 总体架构

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

`*` MCP Server 本轮仅架构预留（见 `mcp/server/`）。

## 三个边界

- **Web UI**：`src/`（React 前端，React Router hash 模式）。
- **Education API**：`apps/api/`（FastAPI）。
- **Education Domain**：`src/domain`（TS）、`apps/api/app/domain`（Python）。

原则：**Education Domain 不允许依赖具体 Web 页面；Learning Evidence 是核心数据。**

## 关于共享包（packages/）

当前工具链（单一 Vite 工程 + 独立 Python 包）不便于直接共享 TypeScript/Python
package，故本轮采用**双实现 + 契约一致**策略：

- TS 版领域类型在 `src/domain`（Web 使用）。
- Python 版领域模型在 `apps/api/app/domain`（API 使用）。
- 两者字段/名词保持一致，信息来源见各自文件与本文档。

未来若引入 monorepo 工具链（如 pnpm workspace + uv workspace），
可将领域模型收敛为 `packages/domain` 共享包——本轮不做转换，仅预留目录。

## 核心闭环

当前已跑通的真实链路：

```text
Learning Action（学习行为：开始学习 / 练习评价）
   ↓
LearningEvidence（学习证据）← 核心数据
   ↓
MasteryProjection
   ↓
MasteryRecord
   ↓
LearnerProfile（Derived Read Model，请求时聚合）
   ↓
Diagnosis（确定性规则）
   ↓
Education Web（/diagnosis 与首页「需要重点关注」）
```

> `learning_started` 仅为行为证据，不改掌握度；只有 `practice_answer_evaluated`
> 这类评价证据才投影更新 MasteryRecord，且「证据 + 掌握度更新」在同一业务事务内提交。

「忆涟千言—教」区别于普通 AI 教育聊天机器人的核心：**页面只是表现层，
Learning Evidence 才是核心数据。**
