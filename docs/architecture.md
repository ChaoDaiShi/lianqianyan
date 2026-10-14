# 涟千言架构文档

## 总体架构

```text
                          涟千言
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

## 核心证据流

以下按当前源码调用关系描述系统结构，不代表本轮运行验收：

```text
普通练习：POST /api/practice/evaluate
  → PracticeSubmissionRequest
  → PracticeEvaluationService.evaluate_catalog_question（服务端查题并评分）
考试：完成自动评分或人工批阅
  → LearningEvidence（评价事实）
                         │
                         ├→ MasteryProjectionService
                         │    → MasteryUpdatePolicy → MasteryRecord
                         │    → LearnerProfile → Diagnosis → Education Web
                         │
                         └→ AdaptiveLearningService._verified_assessment
                              → _derive_state → LEAP overview / session state
                              → AdaptiveKnowledgeState（可滞后的缓存行）
```

`LearningEvidence` 是共享学习事实入口。`learning_started` 表示行为，不改变全局掌握度；
`practice_answer_evaluated` 与 `exam_answer_evaluated` 表示评价事实。普通练习的当前公共
路由只接收答案选项，由服务端题库评分后写入证据，再执行全局投影。LEAP 自身的诊断、探测、
训练、独立作答与复测也会产生学习证据。

## 练习评分、证据属性与双投影

当前普通练习入口是 `POST /api/practice/evaluate`。路由接收 `PracticeSubmissionRequest`，
该类型只允许学习者、课程、知识点、题目、选项和可选会话标识，且禁止额外字段。服务
`evaluate_catalog_question` 从课程题库取题并校验选项，以题库正确选项计算 `is_correct` 和
`score`，再记录 `grading_source=server`、评分及题目版本。新普通练习证据标记
`counts_for_mastery=true`、`independent=false`、`hint_used=false`：它可参与掌握估计，
但不是一次独立验证。相同题目版本会复用已保存的评价收据。

| 事实或状态 | 来源与含义 | 当前处理 |
| --- | --- | --- |
| 行为证据 | `evidence_type=learning_started`；用户开始学习的事件，不含已评分结果 | `MasteryProjectionService` 不更新掌握记录；LEAP 也不会将其当作评价分数 |
| 评价证据 | `practice_answer_evaluated` 或 `exam_answer_evaluated`，通常含 `score`、`is_correct`、`difficulty` | 是否进入投影还要按各自资格规则判断 |
| 评分来源与版本 | 存在 `LearningEvidence.payload` 中的 `grading_source`、`grading_version`、`question_version` | 说明评分者和题目版本；不能仅因存在一条证据就推定它由当前评分规则核验 |
| 掌握计入与提示 | payload 中的 `counts_for_mastery`、`hint_used` | 表明应用服务的计入意图，LEAP 重放与投影调用会按这些标记筛选；全局投影器本身按证据类型处理，由应用服务决定是否调用。提示训练或复习不等同新的独立验证 |
| 独立作答 | payload 中的 `independent` | 描述本次作答属性；普通练习为 `false`，无提示独立测验才可为 `true` |

全局画像与 LEAP 读取同一套学习事实，但使用不同投影规则和历史纳入范围：

| 对照项 | 全局掌握投影 | LEAP 试点教学状态 |
| --- | --- | --- |
| 主要实现 | `MasteryProjectionService.project`、`EvidenceClassifier`、`MasteryUpdatePolicy` | `AdaptiveLearningService._verified_assessment`、`_derive_state` |
| 输入与更新 | 行为证据不改变掌握值；评价类型按确定性步长策略增量更新 `MasteryRecord` | 按学习者、课程与知识点读取 `LearningEvidence`，按时间重放符合资格的评价并按题目版本去重 |
| 主要规则 | 当前 `STEP=0.05`；正确性、难度和得分决定变化幅度；confidence 按证据数饱和 | 初值 `0.5`，固定规则参数 `slip=0.1`、`guess=0.2`、`transition=0.08`；`M` 为掌握估计，`U=1/√(n+1)`，`Q` 为误解候选权重 |
| 当前限制 | 增量掌握记录可保留历史贡献；其历史分数不因新版评分入口而自动重新验证 | 接受带服务端评分和掌握标记的评价、符合来源条件的考试评价，并兼容带会话的旧 LEAP 诊断/探测/复测事件；跳过提示或明确不计掌握的记录 |
| 可表达的事实 | 跨学习活动的课程掌握估计 | 面向当前试点教学的 M/U/Q 状态，不是独立评分来源；当前模型版本标记为 `uncalibrated`，固定参数不是训练或校准结果，Q 也不是校准概率 |

普通练习和完成评分的考试可以进入 LEAP 重放状态；普通练习仍标记为非独立评价。`GET
/api/adaptive/overview` 的课程状态通过 `_states_for_course` 和 `_derive_state` 从证据派生；会话
列表与会话读取也由 `_public` 重新派生其 `state`。`AdaptiveKnowledgeState` 保存计算结果的
缓存，LEAP 操作可通过 `_sync_state_cache` 刷新；普通练习或考试写入证据时不保证同步该缓存，
因此当前公开读取以实时派生结果为准。首页和其他消费端应使用 API 返回状态，不直接把缓存表
当作学习事实。

旧 `PracticeEvaluateRequest` 和服务方法 `PracticeEvaluationService.evaluate` 仍保留在代码中，
但当前练习 HTTP 路由使用 `PracticeSubmissionRequest` 与
`evaluate_catalog_question`；当前应用源码调用关系中未发现旧 `evaluate` 的公共路由或其他业务
调用点。旧 DTO 因此是内部遗留接口，不是当前公共评分协议。历史上由客户端提供分数的证据不会
因新版上线而自动按题库重评：全局增量 `MasteryRecord` 可能保留此前贡献；LEAP 的当前重放会
按 `_verified_assessment` 的来源与字段规则筛选，不会把缺少新版服务端评分标记的普通旧记录
补写为服务端验证结果。两种状态的数值不要求相等；课程掌握值、LEAP 估计和本次实测成绩应
分别解释。

考试域位于 `apps/api/app/exams/`，通过安全白名单定义作答形态与评分策略。试卷发布后
题目结构锁定；学生作答接口与命题接口分离，交卷前不返回参考答案和解析。考试 Analytics
作为只读聚合接入学习档案，缺失数据保持 `null`，不会伪造成 0 分。

浏览器语音位于 `src/components/digital-human/`。识别和合成都需要用户显式触发；前端只把
最终识别文本填入输入框，仍由用户确认后发送或交卷。本站 API 不接收麦克风音频，浏览器
是否调用厂商在线语音服务取决于具体实现。

涟千言区别于普通 AI 教育聊天机器人的核心：**页面只是表现层，
Learning Evidence 才是核心数据。**
