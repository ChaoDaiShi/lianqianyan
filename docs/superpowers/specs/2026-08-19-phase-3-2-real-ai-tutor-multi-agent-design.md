# EducationMind Phase 3-2 — Real AI Tutor & Multi-Agent Orchestration

## Goal

将现有“Tutor 调用多个学习服务”的能力升级为轻量、透明、确定性可测试的教育智能体编排，同时保留 Phase 3-1 的真实学习状态链路、旧 Tutor API 和稳定比赛 Seed。

## Scope and constraints

- 不引入 LangGraph、CrewAI、AutoGen 或其他重型 Agent Framework。
- 不修改数据库 Schema，不新增 Conversation Memory、Message Bus、Agent Registry 或 Tool Calling。
- 不实现 MCP Runtime、MCP Tools、RAG、Vector DB、Knowledge Graph、Dynamic Replanning、Digital Human、TTS、支付、会员、订单或教师后台。
- Agent 只能包装既有领域服务；不能复制 mastery、weak-point、priority、planner 或 evaluation 算法。
- Mastery 只能由 `PracticeEvaluationService` 更新；Assessment Agent 只读并解释。
- Planner 普通问答只读 Current Plan；只有用户明确要求生成或重新生成时才写入新 Plan。
- API Key 只从 `EDUCATION_LLM_API_KEY` 环境变量读取，不硬编码、不提交 `.env`、不输出完整 Key。
- 多 Agent 协作最多进行一次 LLM Provider 调用：Diagnosis、Planner 使用结构化服务，Tutor 负责最终表达。
- 只有真实执行的 Agent 才进入 `agent_trace`。

## Architecture

```text
Learner State Layer
  Mastery / Profile / Diagnosis / StudyPlan / Evidence
                       │
                       ▼
Education Agent Layer
  DiagnosisAgent · PlannerAgent · TutorAgent · AssessmentAgent
                       │
                       ▼
EducationAgentOrchestrator
  deterministic capability routing + explicit DAG orchestration
                       │
                       ▼
Web
  XiaolianPage · LearningSpace Tutor · capability cards · trace
```

### Agent capability boundaries

`DiagnosisAgent` 包装 `LearnerProfileService` 与 `DiagnosisService`，返回真实 Profile/Diagnosis 的结构化摘要，包括 `primary_focus`、priority interventions、strengths 和 unassessed points。

`PlannerAgent` 包装 `StudyPlanApplicationService`。普通“今天学什么”“下一步做什么”使用 `get_current()` 或共享 Context 解释已有计划；只有明确“生成/重新生成计划”意图才调用 `generate_plan()`。生成动作由 Orchestrator 根据确定性意图决定，而不是由 LLM 或 Agent 自主触发。

`TutorAgent` 包装现有 `TutorService`，复用 `TutorContextBuilder`、`TutorPromptBuilder` 和 Provider fallback。它不重建学习状态算法。多 Agent 场景下，Diagnosis 和 Planner 的结构化结果作为同一次 Tutor 请求的附加表达上下文，Tutor 只发起一次 Provider 调用。

`AssessmentAgent` 读取最近的 `LearningEvidence`，并解释 `is_correct`、score、difficulty、mastery_before、mastery_after、confidence 和 evidence count 等真实数据。它不调用 Mastery projection，不提交事务，不修改 Profile 或 Mastery。

## Protocol

集中定义在 `apps/api/app/agents/base.py`：

- `AgentCapability`: `diagnosis | planning | tutoring | assessment`
- `AgentRequest`: `learner_id`、`course_id`、`message`、可选 `capability`
- `AgentTraceItem`: `agent`、`label`、`status`
- `AgentResult`: `agent`、`success`、`summary`、`data`、`suggested_actions`、`context_used`
- `ProviderMetadata`: `provider`、`response_mode`

`data` 保存服务产生的结构化领域数据；`summary` 是 Agent 层面可读摘要。LLM 不负责返回协议 JSON，系统确定性生成 `context_used`、`suggested_actions` 和 `agent_trace`。

## Router

Router 位于 `apps/api/app/agents/router.py`，显式 capability 优先；未指定时按确定性关键词匹配：

- 诊断：`掌握`、`薄弱`、`学得怎么样`、`哪里不会`、`水平`
- 规划：`今天学什么`、`计划`、`路线`、`下一步`、`安排`
- 评估：`为什么这题错了`、`这次练习怎么样`、`分析我的答案`、`分析一下我刚才的练习`
- 辅导：知识解释、概念问答和其他普通问题
- 无法判断：默认 `tutoring`

“我现在最应该学什么，为什么？”识别为协作型规划请求，进入 `diagnosis → planning → tutoring` DAG，而不是仅执行 Planner。

## Orchestrator data flow

### Single capability

```text
AgentRequest → Router → selected Agent → AgentResult → unified response
```

### Collaborative planning

```text
AgentRequest
  → DiagnosisAgent (real profile + diagnosis)
  → PlannerAgent (current plan read)
  → TutorAgent (one provider call for final expression)
  → unified response + actual trace
```

Diagnosis 和 Planner 执行失败时，Orchestrator 不伪造 trace；已完成的 Agent 保留在 trace 中，后续依赖它的节点停止或转为诚实 fallback。Tutor Provider 失败时仍使用现有 TutorService 确定性 fallback，并将 `response_mode` 标记为 `fallback`。

### Assessment

```text
PracticeEvaluationService → LearningEvidence + Mastery projection
                                      │
AgentRequest → AssessmentAgent reads recent evidence → explanation
```

最近 Evidence 的 payload 扩展只用于请求级上下文展示，不增加表字段。

## LLM Provider

保留 `BaseLLMProvider.chat(messages, **kwargs) -> LLMResult` 兼容契约。新增 `OpenAICompatibleProvider`，使用已有 `httpx`，集中处理 base URL 是否带 `/v1`，请求 `POST /v1/chat/completions`，解析 `choices[0].message.content`。

配置字段：

- `EDUCATION_LLM_BASE_URL`
- `EDUCATION_LLM_API_KEY`
- `EDUCATION_LLM_MODEL`
- `EDUCATION_LLM_TIMEOUT`

四项配置完整时选择 `openai_compatible`；否则选择 `mock`。Provider 统一识别并转化 timeout、401、403、429、5xx、invalid JSON、empty choices 等失败为异常，由 TutorService fallback 接管。异常日志只记录 provider、model、latency 或 error type，不记录 API Key。

新 API 语义：

- Provider 成功：`provider = mock|openai_compatible`，`response_mode = provider`
- Provider 失败并由 Tutor fallback：`response_mode = fallback`

旧 `/api/tutor/chat` 保留 `source: llm|fallback` 兼容字段；新 Web 入口使用新 metadata，不再把 Mock Provider 表示为真实外部 LLM。

Prompt 集中说明“小涟”身份、温和清晰的教育风格、理解优先和 Context grounding。学生状态只能来自 Context；缺少信息时明确说明“目前还没有足够记录判断……”，不得编造掌握度、时长、错误次数、计划或成绩。

## API

新增 `POST /api/agents/chat`：

```json
{
  "learner_id": "demo-user-001",
  "course_id": "course-os",
  "message": "我现在最应该学什么，为什么？",
  "capability": null
}
```

响应：

```json
{
  "answer": "根据当前诊断……",
  "selected_capability": "planning",
  "provider": "mock",
  "response_mode": "provider",
  "context_used": ["profile", "diagnosis", "study_plan", "evidence"],
  "suggested_actions": [
    {"type": "open_diagnosis", "label": "查看学习诊断"}
  ],
  "agent_trace": [
    {"agent": "diagnosis", "label": "学习诊断", "status": "completed"},
    {"agent": "planning", "label": "学习规划", "status": "completed"},
    {"agent": "tutoring", "label": "小涟辅导", "status": "completed"}
  ]
}
```

Suggested action 第一版以 typed `type + label` 返回，前端只支持导航或展示，不直接执行数据库写操作。保留 `POST /api/tutor/chat`，旧响应结构继续可用。

## Web changes

`XiaolianPage` 升级为“小涟 · 智能学习中枢”，保留单页面聊天；新增四个 capability cards，点击后预填 capability，不拆分页面。回复下方仅在有真实 trace 时显示“本次由：学习诊断 → 学习规划 → 小涟辅导协同完成”。同时展示 provider/fallback 状态、上下文标签和 typed suggested actions。

`SpaceTutor` 切换到 `/api/agents/chat`：普通知识问题自动 tutoring；掌握度问题自动 diagnosis；下一步学习问题自动 planning。保持现有学习空间布局和当前任务上下文，不新增第二套 Tutor 服务。

首页 `CapabilitiesCard` 扩展为诊断、规划、辅导、评估四项，并明确文案“基于同一份学习状态协同工作”，不宣传未经实现的自主 Agent Swarm。

## Testing strategy

后端新增测试且保留全部旧 Tutor 测试：

1. Router：诊断、规划、评估、辅导和未知输入。
2. Agents：Diagnosis/Planner/Tutor 复用既有服务；Assessment 不修改 Mastery。
3. Orchestrator：单 Agent、协作 DAG、trace 顺序、失败 fallback、无循环、实际执行 Agent 才入 trace、普通 Planner 不生成 Plan。
4. Provider mocked HTTP integration：200、401、429、500、timeout、invalid JSON、empty choices；断言异常输出不含 API Key。
5. API：200、空 message 422、自动路由、显式 capability、协作 trace、provider metadata。

前端运行 `pnpm check` 与 `pnpm build`。

真实浏览器 E2E 启动 FastAPI 和 Vite，验证：

- `/xiaolian` 协作问题调用 `/api/agents/chat`，trace 至少 diagnosis/planning/tutoring。
- 死锁解释只执行 tutoring，不伪造 Planner。
- `/space` 掌握度问题选择 diagnosis。
- 练习后“分析一下我刚才的练习”选择 assessment 并读取真实 Evidence。
- Console 无业务错误。

若环境存在四项真实 LLM 配置，额外执行一次真实请求并只报告 provider、model、HTTP success 和 latency；否则报告真实配置不存在，并以 mocked HTTP integration tests 作为 Provider 验证证据。

## Non-goals

本阶段完成后停止，不进入 Phase 3-3。明确未实现：MCP、RAG、Knowledge Graph、Dynamic Replanning、Conversation Memory、Digital Human、TTS 以及所有比赛无关商业功能。
