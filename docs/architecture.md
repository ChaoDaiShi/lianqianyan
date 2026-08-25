# EducationMind 架构文档

## 总体架构

```text
                       EducationMind
                            │
            ┌───────────────┼───────────────┐
            │               │               │
           Web             API          MCP Server
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

MCP Server 已使用官方 Python SDK 提供 stdio transport。内部 Agent 与 MCP Client 共享 `EducationToolRegistry`，并通过同一组 Education Tools 直接调用既有 Application Service；MCP 层不通过 HTTP 自调用，也不复制业务规则。

```text
Internal Agent → EducationToolRegistry → Application Service
MCP Client → MCP Tool → EducationToolRegistry → Application Service
```

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
Learning Action（开始学习 / 练习评价 / 已评分考试答案）
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

> `learning_started` 仅为行为证据，不改掌握度；`practice_answer_evaluated` 与
> `exam_answer_evaluated` 是当前会投影更新 MasteryRecord 的评价证据。考试答案只有在
> 自动评分完成或人工批阅完成后才进入投影，并通过答案上的 `evidence_id` 保证不重复投影。

考试域位于 `apps/api/app/exams/`，通过安全白名单定义作答形态与评分策略。试卷发布后
题目结构锁定；学生作答接口与命题接口分离，交卷前不返回参考答案和解析。考试 Analytics
作为只读聚合接入学习档案，缺失数据保持 `null`，不会伪造成 0 分。

浏览器语音位于 `src/components/digital-human/`。识别和合成都需要用户显式触发；前端只把
最终识别文本填入输入框，仍由用户确认后发送或交卷。本站 API 不接收麦克风音频，浏览器
是否调用厂商在线语音服务取决于具体实现。

「忆涟千言—教」区别于普通 AI 教育聊天机器人的核心：**页面只是表现层，
Learning Evidence 才是核心数据。**
