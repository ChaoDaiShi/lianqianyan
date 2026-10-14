# 涟千言 Lian-LEAP 再次复审：多阶段并发修复与比赛冻结计划

> 执行状态：用户已授权实施，2026-10-14 完成 P0–P3。本轮采用 `gpt-6-luna / xhigh` 并发开发与静态审阅，运行检查集中在 P3。勾选任务已实际交付；测试、真实演示及剩余研究边界见文末执行记录。

**目标**：在当前已落地的服务端评分与 LEAP 闭环上，补齐首页主动推荐、学习状态解释和比赛证据材料，最后集中进行一次全量验收，形成可追溯的冻结候选。

**架构**：继续使用 LearningEvidence 作为学习事实入口，保留全局画像与 LEAP 估计两种投影。首页消费现有课程目录、LEAP 概览和全局诊断，按固定规则选择一个下一步；教学、独立验证和复测复用现有会话，不另建学习系统。

**技术栈**：React 18、TypeScript、Vite、React Router Hash、现有 Tailwind/UI 组件；FastAPI、SQLAlchemy、现有 Python 服务。前端包管理与命令只使用 pnpm，后端沿用仓库已有 uv 工作流。

配套交付：[真实演示与效果材料协议](2026-10-14-lian-leap-freeze-demo-protocol.md)。

## 0. 本次范围与优先约束

1. 初次交付只编写文档，未实施或测试。用户随后明确要求开始开发；本轮按下文执行，运行检查仍统一放在最终 P3。
2. 后续实施的 P0、P1、P2 只做源码阅读、契约核对和静态差异审阅；禁止各子任务自行运行专项测试、冒烟、全量测试、lint、type-check 或构建。必要的新断言可以编写，统一留到 P3 执行。
3. `AGENTS.md` 中的 `pnpm check` 纳入 P3 最终门禁。本计划是此次功能任务的分工与契约，不新增或替代 Agent 通用规则文件。
4. 用户已明确允许 `luna / xhigh` 子智能体；最大同时为主集成 I 加 A/B/C 三个子智能体。子智能体不继续派生，不自行切分支、提交、推送或部署。
5. 用户未授权防御性开发：不增加通用兜底、重试框架、异常吞噬、双写兼容层、通用审计平台或预防性重构。只修改本次确认的产品缺口，保留已经实现的评分及认证约束。
6. 保留当前工作台、昔涟视觉、数据库结构和课程范围；不增加产品 Agent、模型、强化学习、数据库重构或全课程扩展。
7. 本次不切换 `main`，不提交、推送、发布或改写旧验收文件。后续执行先检查当时工作树，保护同时存在的其他修改。

## 1. 基线纠偏：不能直接照旧报告重做

| 项目 | 本轮只读核查结果 |
| --- | --- |
| 用户报告基线 | `7cb0adde341c31e34d78adf635f2b7fd2b383296` |
| 本轮本地分支 | `main` |
| 本轮本地 HEAD | `a63da76880a631713baaaff158df1dec3dba28f4` |
| 后续相关提交 | `e6357c2` 统一可信证据和数据结构课程；`37bf72d` 集成证据驱动工作台与昔涟主题；`a63da76` 保存既有浏览器验收记录 |
| 初始工作树 | `git status --short` 无输出；本轮只新增计划文档 |
| 远端/CI | 本轮没有核查远端最新分支或运行 CI；不把本地 HEAD 称为已确认的远端最新状态 |
| 运行证据 | 用户报告的通过状态与 `docs/evidence/2026-10-14/` 是既有记录；不是本轮新运行结果 |

同日已有计划 `2026-10-14-evidence-knowledge-parallel-convergence.md` 的大量任务已经进入当前代码。该计划保留为历史依据；本计划只处理当前剩余问题，其早期分支名称、执行进度和测试安排不自动延用。

### 1.1 逐项复审结论

以下“源码已修复”仅指当前调用链具备相应实现，最终运行状态仍为 `NOT TESTED`。

| 报告问题 | 当前事实和定位 | 本次处理 |
| --- | --- | --- |
| P0 普通练习由客户端报分 | `apps/api/app/api/routes/practice.py:45` 使用 `PracticeSubmissionRequest`，调用 `evaluate_catalog_question`；`apps/api/app/domain/models.py:345` 禁止额外字段；`apps/api/app/services/practice_evaluation_service.py:93` 服务端取题评分 | 源码已修复；保留契约和已有回归，不再重做评分系统 |
| 旧 `PracticeEvaluateRequest` 仍存在 | `apps/api/app/domain/models.py:332`、旧 `PracticeEvaluationService.evaluate` 仍在；非测试调用链未发现调用者，MCP/Agent 未暴露这个评分入口 | 修正误导性的“客户端提供评价结果”注释；不因旧类型存在推定当前 HTTP 漏洞，不做顺手删除 |
| 两套 Mastery 来源不一致 | `apps/api/app/adaptive/service.py:1539` 按同一 LearningEvidence 流派生状态，普通练习/考试可进入；全局模型仍用 `mastery_update_policy.py` | 当前已共享事实，算法及历史范围仍不同；补充语义、来源与历史边界说明，不合并表、不强制数值相等 |
| BKT 参数被误当训练结果 | `adaptive/service.py:1512` 固定 slip/guess/transition；`adaptive/catalog.py:8` 已带 `uncalibrated` 模型版本 | 统一 UI、架构和答辩口径，不开展参数训练 |
| A–D 对照不构成严格实验 | `src/pages/AdaptiveLearningPage.tsx:97` 默认 D 且可自选；`OutcomeLabPage.tsx:244` 已注明非因果解释 | 保留描述性观察；修正“独立样本 N”单位歧义，另写未来研究条件 |
| 首页没有 LEAP 入口 | `HomeActionDeck.tsx:119`、`HomeEvidencePanel.tsx:138` 已有入口；`Home.tsx:47` 仅取会话，未按真实薄弱主题主动推荐 | 部分修复；新增首页单条推荐，复用概览和现有深链 |
| 学习入口分散 | 学习空间、档案、考试结果已有 LEAP 连接；`AdaptiveLearningPage` 完成区仍缺明确档案出口 | 最小补齐结果到档案的入口，保留现有并列学习流程 |
| Agent 主动启动 LEAP | 小涟有通用入口，`suggested_actions` 仍是文字标签，没有稳定 topic 导航契约 | 明确冻结后处理；本轮不做聊天意图识别或自动建会话 |
| 演示与效果证明不足 | 已有同日软件验收材料；没有本轮新候选的完整演示，也不能由这些材料推导真实学生效果 | 最终 P3 同一次验收采集真实链路，按配套演示协议留证 |

行号仅定位本次基线，后续以符号名为准。`AdaptiveOverview` 是报告中的概念名称；前端真实类型与函数为 `LeapOverview`、`fetchLeapOverview`。

## 2. 方案选择和完成边界

| 方案 | 工作量与效果 | 决定 |
| --- | --- | --- |
| 只改答辩材料 | 能纠正表述，但首页真实薄弱点仍缺少直接入口 | 不作为唯一交付 |
| 现有闭环上补入口、口径和证据 | 复用现有接口与规则，改动集中且能直接展示价值 | 本计划采用 |
| 统一全部掌握模型并加入随机实验/主动 Agent | 涉及数据语义、研究设计和更多产品流程，扩大冻结风险 | 留到冻结后独立任务 |

冻结交付必须能回答三件事：答案由谁评分；为什么选择这项教学行动；独立作答、延迟复测和规划发生了什么。即时独立通过只能证明本次任务通过，不能证明长期学会或优于普通 AI。

## 3. 阶段与真实并发关系

```text
P0：I 固定基线、接口、文件归属、验收范围
                     |
           +---------+---------+
           |         |         |
P1：       A         B         C       同时进行
       证据/模型    首页/深链   成效口径/演示材料
           |         |         |
           +---------+---------+
                     |
P2：I 接收与集成；A 复核事实映射；B 修自身接口问题；C 对齐演示步骤
                     |
P3：最终候选封定 → 前后端全量门禁并发 → 一次浏览器演示验收 → 冻结报告
```

| 阶段 | 输入 | 可同时进行的工作 | 退出条件 |
| --- | --- | --- | --- |
| P0 契约冻结 | 本报告、当前源码、工作树 | I 写契约；A/B/C 只读核查各域 | 所有公共字段、深链语义、文件 owner 明确；不运行测试 |
| P1 并发实现 | 第 4 节固定契约 | A/B/C 在独占文件工作；I 维护映射与协调 | 每条线交付完整 diff、依赖和静态审阅结果；标 `READY_FOR_INTEGRATION` |
| P2 集成收口 | 三条线交付 | I 合并接缝和 README；owner 各自修接缝；C 定稿讲解脚本 | 无契约差异、无重叠写入、无待实施项；最终测试列表一次定稿 |
| P3 最终全量测试与冻结 | 停止业务变更的同一候选 | 前端全套与后端全套可并行；I 记录结果 | 所有必要门禁与演示通过或真实标记未完成；无新功能插入 |

P1 的 A/B/C 不以彼此完成为前提；B 依赖的现有接口已经存在。A/B/C 写测试文件时只编写本次变化必要的断言，不执行。P2 不是隐藏的专项测试阶段。

### 3.1 文件独占表

| Owner | 可写文件 | 边界 |
| --- | --- | --- |
| I 主集成 | 本计划、`README.md`、最终 `docs/evidence/leap-freeze/<candidate>/` 记录 | 不代写正在由 owner 修改的文件；先交接再接管；不修改 AGENTS.md |
| A 证据与模型说明 | `docs/architecture.md`；`apps/api/app/domain/models.py` 中旧 `PracticeEvaluateRequest` 的说明文字 | 本轮默认无评分行为改动；服务端业务文件、现有评分测试只读 |
| B 首页与学习出口 | `src/pages/Home.tsx`、`src/components/home/HomeActionDeck.tsx`、新增 `src/components/home/HomeLeapRecommendation.tsx`、新增 `src/lib/leapRecommendation.ts`、`src/pages/AdaptiveLearningPage.tsx`；现有 `HomeActionDeck.test.tsx`、`HomeCompanionEntry.test.tsx`；新增 `src/lib/leapRecommendation.test.ts`、`src/components/home/HomeLeapRecommendation.test.tsx` | 不修改 API DTO、共享 `LeapEntryCard` 选择逻辑、全局主题或后端 |
| C 成效表述与演示材料 | `src/pages/OutcomeLabPage.tsx`、`src/pages/outcomePresentation.ts` 及现有对应测试；`src/components/adaptive/LeapEntryCard.tsx`、`LeapArchivePanel.tsx`、`LeapObservationPanel.tsx` 的说明文字；配套演示协议 | 不改上述共享组件的取数和会话选择；不改 B 的页面或训练算法 |

`src/lib/adaptiveApi.ts`、`src/lib/educationApi.ts`、`src/router/index.tsx`、`apps/api/app/adaptive/service.py`、公共题库、数据库模型结构与依赖锁文件为本轮冻结接口。本计划不要求修改它们。若发现一个会阻止本次目标的实际缺陷，由 I 明确新增任务与单一 owner，再继续；不得多人临时改同一共享文件。

### 3.2 交接记录固定内容

每条线交付时列出：实际修改文件、消费/产出的契约、静态审阅结论、写入但未运行的必要断言、需 I 集成的问题。状态只用 `READY_FOR_INTEGRATION`、`NEEDS_CHANGE` 或 `NOT_TESTED`，不得写“已通过”或填写推测测试数。

## 4. P0 固定契约

### 4.1 普通练习：保留已实现的答案提交协议

实际接口为 `GET /api/practice/questions` 和 `POST /api/practice/evaluate`。题目查询参数是 `learner_id/course_id/knowledge_point_id`。请求示例仅是结构示例，账号值必须来自当前认证上下文：

```json
{
  "learner_id": "当前已登录学习者ID",
  "course_id": "course-ds",
  "knowledge_point_id": "kp-linear-list",
  "question_id": "ds-linear-practice-02",
  "option_id": "用户实际选择的选项ID"
}
```

`session_id` 可选。当前题型是选择题，提交 `option_id` 就是提交答案，不必为了与报告示例一致再改成自由文本 `answer`。`is_correct/score/difficulty` 不能成为公共请求字段。

响应沿用 `evidence/mastery_before/mastery_after/confidence/evidence_count/replanning/is_correct/score/feedback/grading_version/already_recorded`。未作答目录不暴露答案；已作答结果用于恢复显示。同题同版本复用收据，不由新会话制造第二份有效证据。本计划不新增一套防重机制。

### 4.2 学习事实和两种状态

| 对象 | 含义 | 本轮说明要求 |
| --- | --- | --- |
| LearningEvidence | 学习行为或评价事实的记录；不是每一条都意味着已评分 | 分清行为、有效评价、独立评价以及旧记录 |
| MasteryRecord | 全局学习画像的增量掌握投影 | 当前为确定性步长策略；可能保留历史计入结果，不声称所有历史都经新版评分重验 |
| AdaptiveKnowledgeState / LEAP state | 从有效证据重放的试点教学状态/缓存，包含 M/U/Q | 已消费普通练习、考试和 LEAP 有效事件；不是一套孤立的 LEAP 答题来源 |
| 独立后测结果 | 本次无提示新题的实测得分 | 与模型掌握估计分别呈现，不能用估计上涨代替测验成绩 |

当前 `MasteryUpdatePolicy.STEP=0.05`，confidence 是按证据数的工程规则；LEAP 初始估计 0.5，slip=0.1、guess=0.2、transition=0.08，`U=1/√(n+1)`。两者均不是训练得到的参数。本轮不调参。

`AdaptiveKnowledgeState` 数据库行是缓存：普通练习/考试写入新证据后，不保证立即更新这张表；当前 session/list/overview 的公开读取路径通过 `_derive_state` 返回实时派生值。新首页必须消费 API 返回值，不直接读取缓存表，也不为本轮补一次全表同步或数据迁移。

新评分证据的事实字段沿用 `grading_source/grading_version/question_version/counts_for_mastery/independent/hint_used`。常规练习可计掌握，但 `independent=false`；提示训练与复习不充当新的独立验证。历史 LEAP/考试有已有兼容读取规则；不得补写 `grading_source=server` 把旧数据伪装为新验证。

公开口径固定为：“全局画像与 LEAP 教学状态使用同一学习事实体系，估计方法和历史纳入范围不同；分数不要求相等。课程掌握值、LEAP 估计和本次实测成绩分别说明。”

### 4.3 首页单推荐契约

复用 `fetchLeapCatalog()`、`fetchLeapOverview(learnerId, courseId)` 和 Home 已有 `useDiagnosis`。Home 用 overview 替换原先单独的 `fetchLeapSessions`；待复测面板直接使用 `overview.sessions`，不再额外请求一遍 sessions。

新文件 `src/lib/leapRecommendation.ts` 只做数据选择，不请求网络、不写本地存储、不创建会话。签名固定如下（这是待实施契约）：

```ts
import type { DiagnosisResult } from '@/domain';
import type { LeapCatalog, LeapOverview } from '@/lib/adaptiveApi';

export type LeapRecommendationKind =
  | 'retest' | 'resume' | 'repair' | 'diagnose' | 'course-entry';

export interface LeapRecommendation {
  kind: LeapRecommendationKind;
  title: string;
  reason: string;
  actionLabel: string;
  href: string;
  topicId: string | null;
  sessionId: string | null;
  evidenceCount: number | null;
}

export interface LeapRecommendationInput {
  courseId: string;
  catalog: LeapCatalog;
  overview: LeapOverview;
  diagnosis: DiagnosisResult | null;
  nowMs: number;
}

// 实现位置：src/lib/leapRecommendation.ts
// 导出函数：selectLeapRecommendation(input: LeapRecommendationInput): LeapRecommendation
```

固定选择顺序及可展示文案：

| 优先级 | 条件 | 目标与表述 |
| --- | --- | --- |
| 0 | 当前非 `course-ds` | 页面不请求 LEAP 个人数据；展示课程入口：“前往数据结构诊断”；不擅自替用户切课程 |
| 1 | completed 会话有 outcome、retestScore 为 null，且 retestDueAt 已到期 | 最早到期项；“这项学习已到复测时间”；`/adaptive?session=<id>&retest=1` |
| 2 | 有未完成会话 | `updatedAt` 最新的会话；“继续上次的针对性学习”；`/adaptive?session=<id>` |
| 3 | 每主题最新完成会话为无提示独立评价，目录匹配；未复测时 outcome 为 persisting；已复测时服务端 nextStep 仍指向本主题 | 取最近一项；未复测显示“上次独立验证仍需巩固”，已复测显示“按复测后的建议继续巩固”及真实 nextStep.reason；按钮“开始该主题的新学习”，`/adaptive?topic=<id>` |
| 4 | 全局 primaryFocus.status 为 weak，目录 knowledgePointId 匹配，overview 对应状态 evidenceCount > 0 | “建议核查并巩固：主题名”；依据真实诊断，不把知识点薄弱直接说成某误解已确诊 |
| 5 | 其余情况 | `/adaptive`；“做一次短诊断，确定下一步”；不默认认定用户链表薄弱 |

相同时间按会话 ID 排序，保证同一输入有确定结果。优先级 3 先按主题取最新会话，较新的修复/通过结果不能被更旧的失败会话覆盖。优先级 4 的多主题映射按目录顺序取首项；当前主知识点一一对应的主题不另外维护前端 ID 表。

执行期静态复核确认：完成延迟复测后，服务端更新 retestScore/nextStep，但保留原 probe 的 misconceptionStatus。因此优先级 3 对已复测会话使用服务端 nextStep 是否仍指向本主题作判断，不再读取旧 probe 状态，也不另设前端评分阈值。已通过并转向其他主题的会话不会被旧失败触发；未通过且需继续本主题的真实建议仍可呈现。

优先级 1/2 返回真实 sessionId，优先级 3/4 的 sessionId 为 null、topicId 为目录主题 ID，表示打开该主题的新学习入口。优先级 3 的旧结果只是推荐依据，本轮不新增来源会话查询参数，不暗示这是原会话续作。页面内已有 nextStep 与 fromSessionId 的连续学习功能照常保留。

`evidenceCount` 只取所选知识点的 `LeapKnowledgeState.evidenceCount`，找不到则为 null；不得当成错误次数。没有准确错误计数就不写“已有 2 次错误”。卡片不承诺“5 分钟修复”，已有 timeBudget 只解释为用户可选学习预算。

`HomeLeapRecommendation` 接收 `recommendation: LeapRecommendation` 并展示一个主按钮。loading/error/非试点课程由 Home 的现有模式处理：读取失败显示当前无法读取及重试，不伪造推荐对象；有有效数据时才调用纯选择器。课程入口推荐由 Home 在非试点分支直接构造。

首页继续保留原有计划主行动和待复测列表；新卡放在主行动卡之后，清楚标为“针对性学习建议”，不重排整站导航。布局使用既有 surface、ink、primary 等变量与 `Button`。

### 4.4 路由与事实边界

| 路由 | 固定行为 |
| --- | --- |
| `/adaptive` | 打开课程主题/继续入口，沿用现有页面行为 |
| `/adaptive?topic=<LeapTopic.id>` | 将目标主题置前，用户点击开始才 POST 创建；禁止页面加载自动作答或创建证据 |
| `/adaptive?session=<id>` | 恢复该会话；重载不会重复计分 |
| `/adaptive?session=<id>&retest=1` | 打开已有复测流程；是否到期仍由服务器判断 |
| `/archive` | 查看账号的真实学习记录；本轮不发明尚未实现的 archive session 查询参数 |

所有动态 ID 用 `encodeURIComponent`。完成区新增“查看学习档案”链接以及简短结果摘要；session URL 仍保留当前结果，返回后可继续查看。沿用 `educationmind:evidence-updated` 通知，首页监听或在重新挂载时读取当前数据；不新增全局事件框架。

### 4.5 成效口径

- A：通用固定引导练习；B：课程固定策略；C：证据动态策略；D：完整 LEAP 规则机制。D 的消融设置需要随会话显示，不能都称“完整组”。
- `independent=true && hintUsed=false` 表示无提示作答，不代表统计上独立的学生样本。
- OutcomeLab 的“独立样本 N”改为“无提示后测会话数”，分组栏改为“无提示后测记录 / 总会话”。当前统计是当前学习者的会话，不能当作参与学生人数。
- 不可比成绩维持 `scoreComparable=false`、`observedGain=null`、`meanGain=null`；前测、后测分别展示，不恢复百分比增益或归一化 g。
- `misconceptionStatus=repaired` 在界面解释为“本次验证通过”；retestScore 为 null 时补一句“对应误解候选暂缓，保持情况待复测”，已有复测成绩时展示实际复测结果，不能仍称待复测。原始机器枚举不改。
- M 显示为“LEAP 掌握估计（未校准）”，U 为“不确定性指标”，Q 为“规则误解候选权重”。不把 confidence/Q 当训练得到或经过校准的概率。
- `assessmentStatus=saved` 与 `replanning.status` 分开：评估保存成功不等于路线已重排；`not_needed` 也是有效结果。

## 5. P1 三条并发工作线

### A：评分来源、历史边界和模型解释

**输入**：第 4.1、4.2 节；当前 practice 路由、评分服务、证据重放和全局投影。

**产出**：`docs/architecture.md` 中可用于答辩的事实链、两种投影对照和历史说明；旧 DTO 注释明确为内部遗留接口。

- [x] A1 核对 `/practice/evaluate → evaluate_catalog_question → LearningEvidence → MasteryProjection` 与 LEAP `_derive_state`，用源码符号制作对照，不运行接口。
- [x] A2 将旧 `PracticeEvaluateRequest` 注释改为：“内部遗留评价 DTO；公共练习入口使用 PracticeSubmissionRequest，由服务端根据题库评分。”不修改字段、行为或测试调用。
- [x] A3 在架构文档补充上述双投影表，写出 LearningEvidence 的行为/评价/独立属性，明确旧客户端计分记录没有被新版自动重新验证。
- [x] A4 说明普通练习→LEAP 的当前读取链及模型差异；将“Adaptive 仅为孤立实验状态”的不准确描述改为“试点教学状态”。
- [x] A5 将现有 `apps/api/tests/test_practice_api.py`、`test_adaptive_evidence_contract.py`、`test_exam_service.py` 映射到第 7 节；已有覆盖不复制新用例，交付状态 `NOT_TESTED`。

**静态验收**：公共评分契约无变化；旧内部 DTO 不再被文档说成外部接口；材料可区分来源可信度、算法估计和历史记录。没有确认的新业务缺陷时，不改后端评分逻辑。

### B：首页主动建议与结果出口

**输入**：第 4.3、4.4 节；现有 `LeapCatalog/LeapOverview/DiagnosisResult`。

**产出**：`selectLeapRecommendation`、首页单推荐卡、现有会话/主题深链、结果到档案出口。

- [x] B1 新建纯选择器与上述类型，按固定优先级处理真实输入；不另写概率模型或错题统计。
- [x] B2 新建 `HomeLeapRecommendation.tsx`，显式类型化 props，使用既有 Button/Link 和主题变量；呈现 title、reason、actionLabel。
- [x] B3 Home 统一读取 catalog 与 overview，把 overview.sessions 交给现有 `HomeEvidencePanel`；移除同页面重复 sessions 请求，按现有模式呈现读取状态。
- [x] B4 在主行动之后挂载卡片。非试点课程不发个人 LEAP 概览请求；未知/无证据显示短诊断入口。
- [x] B5 将 `HomeActionDeck` 中“5 分钟快速水平摸底诊断”调整为“短诊断”；不改学习预算选择功能。
- [x] B6 自适应完成区补“查看学习档案”；在该区把“已修复”的直接展示改为本次验证语义，并保留真实成绩、保存和重规划状态。
- [x] B7 编写新选择器的决策分支用例和一个卡片渲染/链接用例；复用现有 Home 断言，修改必要的文案断言。已有 `src/components/exam/ExamResultView.leap.test.tsx` 可核对 topic 链接生成；当前没有覆盖自适应整页恢复的测试，session 恢复与新档案出口留到 P3 同一浏览器流程验收，不虚称已有单测覆盖。此时不执行。

**静态验收**：只有一个推荐主目标；题目、会话、知识点均来自输入；新增代码不会自动 POST；B 不改共享 API 或后端算法。

### C：成效解释与演示协议

**输入**：第 4.5 节、真实策略和评分实现、配套演示协议。

**产出**：成效页、LEAP 状态卡和档案中的准确口径；可直接使用的演示步骤与未来实验说明。

- [x] C1 修改 OutcomeLab 的样本单位和组别说明；保留已有非随机/非因果说明，不把当前账号的会话数变成学生人数。
- [x] C2 仅在现有 CSV 表头/说明确有歧义时调整显示名称；原始数据键与 `scoreComparable` 语义不改，个人导出仍是个人数据。
- [x] C3 在 `LeapEntryCard/LeapArchivePanel/LeapObservationPanel` 统一“本次验证通过”“未校准估计”“误解候选”文案；不改取数与状态机。
- [x] C4 对照服务端实际 A–D 行为和消融标记完善材料，说明“基于课程知识结构的可解释误解候选识别”。
- [x] C5 完善配套演示协议；固定链表目标与实际题目类别，区分技术演示、真实学习者观察和未来研究。
- [x] C6 只更新受当前文案/统计单位影响的既有测试断言；不用新建大批快照证明文字替换，不运行测试。

**静态验收**：同一学生多次会话不会被材料称为多个独立学生；当前系统不声称模型训练、随机实验、教师审核或已证明长期效果。

## 6. P2 集成和停止变更

- [x] I1 核对 A/B/C 文件清单与 diff；各 owner 只修自己的交界问题，公共文件修改必须由 I 接管。
- [x] I2 README 同步当前五个 LEAP 主题（包括排序查找）、首页建议、两种掌握值、A–D 观察单位和延迟复测边界；链接本计划与演示协议。
- [x] I3 检查同一页面没有重复 sessions/overview 请求，所有按钮目标是现有路由，结果入口没有引入无效查询参数。
- [x] I4 逐行比对第 7 节必测行为与既有测试源文件；只有本次新增推荐规则与真实缺失行为才新增断言，不复制已经覆盖的可信评分测试。
- [x] I5 确认无新增依赖、数据库迁移、课程扩展、主题重做或主动 Agent 功能；标记 P1 各线 `READY_FOR_FINAL_GATE`。
- [x] I6 固定候选标识：记录 HEAD 与未提交差异清单；若尚未提交，标为“HEAD + 工作树差异”，不得只用 HEAD 冒充包含本次代码的候选。进入 P3 后停止功能开发。

本阶段只做文档与源码静态检查，`git diff --check` 可用于格式检查；不启动应用、不运行编译与测试。

## 7. P3：唯一最终全量门禁

### 7.1 执行范围与命令

前提是所有开发和接缝修改已完成。依赖已按锁文件准备；若未准备，在此阶段使用 `pnpm install --frozen-lockfile` 和后端 `uv sync --frozen`。不以修复测试为名升级依赖。

前端全套在仓库根目录按以下次序执行，每条检查退出码，失败不得继续标记整套成功：

```powershell
Set-Location -LiteralPath 'F:\比赛\智能体 ican 教育skill'
pnpm check
pnpm exec vitest run
pnpm exec node --test scripts/demo-video/demo-video-lib.test.mjs
pnpm build
```

后端全套可以与前端全套并发，在独立终端中执行：

```powershell
Set-Location -LiteralPath 'F:\比赛\智能体 ican 教育skill\apps\api'
uv run pytest -q
```

这两组对应当前 `.github/workflows/ci.yml` 的门禁范围。记录实际数量与退出码，不预写 `348 passed` 等旧数字。不要额外先跑单文件 pytest、Vitest 专项、覆盖率、压力测试、第二次全量或新 CI 流水线。

构建通过后，用同一生产构建进行下面一次必要的产品流程验收；它属于 P3 全量验收的一部分，并同时采集比赛演示材料，不另跑一轮演示预验收。采用仓库现有浏览器能力或人工操作，不为此新增自动化平台。

### 7.2 必测行为和复用覆盖

| ID | 必须观察的结果 | 承载方式 |
| --- | --- | --- |
| F01 | 公共练习正确/错误选择由服务端评分；客户端 score/is_correct/difficulty 拒绝且无证据入账 | 复用 `apps/api/tests/test_practice_api.py`；最终浏览器实际普通练习一次 |
| F02 | 同题同版本重试/跨会话不重复计入；刷新恢复原答案 | 复用 `test_practice_api.py`；最终流程一次刷新 |
| F03 | 普通练习/考试/LEAP 有效事件进入状态；提示题、复习与行为记录不被当作新独立证据 | 复用 `test_adaptive_evidence_contract.py`、`test_exam_service.py`；普通练习→首页→LEAP 实际观察 |
| F04 | 推荐顺序为到期、继续、当前残留、匹配薄弱点、初诊；旧失败不盖过新通过，缺失数据不编造 | B 的选择器必要分支用例，最终浏览器观察实际推荐 |
| F05 | 首页只展示一个主推荐；非试点不假装有 LEAP 证据；入口不自动新建会话 | B 的卡片/已有页面断言；浏览器检查请求与目标主题 |
| F06 | `?topic` 预选、`?session` 恢复、完成结果到档案可达；记录关联同一实际会话 | `ExamResultView.leap.test.tsx` 覆盖已有 topic 链接；实际预选、session 恢复及档案出口由一次完整浏览器流程验证 |
| F07 | 讲解后独立题使用实际新题，提示不可见；评分结果、证据与档案一致 | 复用 `test_adaptive_leap.py`；完整演示流程采集 |
| F08 | 前后测不可比不显示增益；N 指会话，M/U/Q 和 repaired 文案没有夸大 | 复用 `src/pages/outcomePresentation.test.ts` 和受改动影响的 UI 断言；成效页截图 |
| F09 | 未到期不能登记 retest；真实到期后 ready-retest 分配；GET 不偷偷分配 | 复用现有后端时钟/生命周期用例；真实账户到期状态按事实展示，不为展示改时钟 |
| F10 | `assessmentStatus` 与 `replanning` 分开，保存结果可重载，规划失败不抹掉已保存评价 | 复用 `test_adaptive_evidence_contract.py` 的现有失败路径；演示展示真实状态 |
| F11 | 登录、选课、普通练习、LEAP、档案主链可用；桌面与手机宽度的新卡和结果出口可操作 | 同一生产构建、同一流程；桌面 1440×960，完成后手机 390×844 检查首页和结果布局 |
| F12 | 演示导出/截图可追溯实际题目、版本、会话、得分、重规划状态；凭据不进入材料 | 配套演示协议；静态核对导出和实际返回 |

运行时 mock/fixture 仅属于自动化用例，不能拿来填写真实演示结果。读取旧 acceptance.md 可以定位问题，但不能替代 F01–F12 的当前结果。

### 7.3 失败和冻结结论

首次 P3 门禁失败，保存失败命令、原因与当前差异，整轮记 `FAILED`。只修阻止这次冻结的实际问题；修复后仍留在 P3，重新对变化后的最终候选执行必要门禁。通过的未变部分不为“更放心”反复执行；若共享行为发生变化，则重新跑受影响的完整套件，报告保留尝试记录。不得用“只有最后一次测试”把失败改写成通过。

冻结结论区分：

| 结论 | 条件 |
| --- | --- |
| `FREEZE_READY` | 全量门禁及即时闭环演示通过；材料正确标识尚未完成的真实七天复测与研究；没有本轮 P0/P1 阻断 |
| `FREEZE_BLOCKED` | 评分可信、证据入账、核心流程或最终必测行为失败/未测；不能仅凭旧 CI 宣布可冻结 |
| `RETENTION_PENDING` | 软件到期机制可验收，但本次真实账户尚未经过七天；不单独阻止即时功能版本冻结，阻止长期效果声称 |
| `RESEARCH_NOT_ESTABLISHED` | 无合格真实学生研究；不能宣称显著提升、因果效果或优于其他 AI |

最终产物放到新的 `docs/evidence/leap-freeze/<candidate>/`：`acceptance.md`、`commands.txt`、`demo-case.json` 和必要截图。`<candidate>` 使用执行时实际候选标识，不能覆盖同日旧材料。仅在此阶段创建实际记录；未测项写 `NOT_TESTED`，教师审核等写 `HUMAN_PENDING`。

## 8. 子智能体任务卡

以下任务卡仅供执行本计划时派发，不自动授权超出本计划的代码、Git 或部署操作。

**A / luna xhigh**：阅读第 0、1、4.1、4.2、5A 节，只修改文件独占表 A 的文件。验证已实现服务端评分的真实可达入口，完善模型/历史说明与旧 DTO 注释。不得运行测试或改评分算法。返回变更文件、静态证据定位、现有测试映射和未解决阻碍。

**B / luna xhigh**：阅读第 0、3、4.3、4.4、5B 节，只修改 B 文件。实现一个基于现有事实的首页推荐、复用 topic/session 深链、补结果到档案出口。纯选择器按冻结顺序实现；编写必要断言但不运行。不得修改后端、API 字段或全局视觉。

**C / luna xhigh**：阅读第 0、4.5、5C 节及配套演示协议，只修改 C 文件。统一会话样本、规则模型、误解候选与即时验证表述；准备真实演示步骤。不得改变评分、分组分配或页面状态机，不运行测试、不生成假的实测材料。

**I / 主集成**：先确认 P0，再同时派 A/B/C；P1/P2 仅审阅和整合。各线交接后进入 P3，集中执行门禁并保存真实结果。若运行环境不能提供指定模型，明确报告，不擅自替换为其他模型或更低推理强度。

## 9. 冻结后独立任务

以下只记录方向，不进入本次文件范围、测试量或完成条件：

- 小涟聊天识别学习诉求后，基于当前证据返回稳定 topicId 与可点击建议；仍由学习者确认开始。
- 教师审核课程、题目与文本 rubric，明确误解判断和迁移题是否符合目标。
- 在真实学习者数据上校准 BKT、诊断阈值和题目难度；记录数据与方法后再讨论“训练/校准”。
- 按配套协议开展真实七天保持观察，再制定随机或分层实验；随机分配本身不足以补齐样本、量表和研究设计。

本计划完成的是下一轮工作的明确边界与执行契约。所有代码修复、最终测试、比赛冻结和真实教学效果，须分别有后续实际证据。

## 10. 本轮执行记录（2026-10-14）

A/B/C 与主集成任务已交付，源码候选为 `main` 的 `a63da76880a631713baaaff158df1dec3dba28f4` 加本轮未提交修改。P0–P2 仅做开发与静态审阅，P3 才集中执行全量门禁。

最终 `pnpm check`、126 个 Vitest 文件/407 项测试、12 项视频工具测试、生产构建和 348 项后端测试通过。浏览器完成 30 项实际检查，覆盖桌面与手机，没有页面脚本异常。

最终 UI 验收发现导出面板被顶栏遮挡，主集成仅在 `OutcomeLabPage.tsx` 使用既有 `createPortal` 模式修复；重跑受影响的前端完整门禁，桌面与手机关闭操作均通过。后端与视频工具没有变更，未重复运行。

实际普通练习证据触发首页推荐，误解诊断后执行对比教学，独立新题通过并保存到档案。保持成绩尚待真实七天复测，不能据此声称因果提升。完整证据见 [本轮冻结验收](../../evidence/leap-freeze/a63da76-worktree-20261014/acceptance.md)。本次未提交、推送或部署。
