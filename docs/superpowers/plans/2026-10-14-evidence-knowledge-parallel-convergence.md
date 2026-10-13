# 涟千言：学习证据、数据结构知识库与最终视觉收口并发实施方案

日期：2026-10-14。审查基线：`7cb0adde341c31e34d78adf635f2b7fd2b383296`。

**目标**：统一服务端评分和可信学习证据，修复连续学习中的重复计入、状态陈旧、部分提交及题池耗尽问题；全面整理数据结构课程的内容、题目、前置关系与检索来源；最后在新工作台布局上恢复昔涟角色与品牌配色并完成浏览器验收。

**当前工作区**：`codex/grounded-workbench-20261013`。另一 UI 对话的未提交布局、组件、交互与测试是本轮集成输入，不能 reset、覆盖或整体回退。本方案不是另建 Agent 规则，仓库约束仍以 AGENTS.md 和本次用户指令为准。

**技术边界**：继续使用 React/Vite、FastAPI、SQLAlchemy 和现有数据库；JavaScript 工具仅使用 pnpm。LearningEvidence 保持学习事实入口，不引入新的微服务、通用 Agent 框架或训练系统。

## 1. 已核实问题与证据边界

以下“已核实”指本轮源代码核查，修复验收仍需对应运行证据。

| 项目 | 当前事实 | 交付要求 |
| --- | --- | --- |
| P0 公共练习评分 | `/practice/evaluate` 接收 `is_correct/score/difficulty`；ModulePractice 和 PracticeCard 本地判对错 | 公共接口只收答案，题目、答案键、难度和得分由服务端确定 |
| 重复计分 | 普通练习与 LEAP practice 都可重复投影 | 同一学习者、课程、题目版本只能首次计入；请求重试回放保存结果 |
| 跨入口状态 | AdaptiveKnowledgeState 仅初始化时读原生 MasteryRecord | 从同一 LearningEvidence 流重建/同步，不把已投影事件重复累加 |
| 后测部分成功 | 后测已 commit 后的规划异常会传播为接口失败 | 返回并保存 assessmentStatus 与独立 replanning 状态 |
| 题池与只读查询 | 题库耗尽抛 409；GET/只读工具还可能分配复测并 commit | 读操作无写入；明确题池状态、复习性质和可继续操作 |
| 课程初始化 | 实际使用 `courses[0]` | 用户明确选课，数据结构试点可见，选项和实际账户课程一致 |
| 资源检查 | 异步生成后读取旧 resource state | 检查本次请求返回的正文，连续生成也应正确 |
| 知识关系 | 文件排序产生 `precedes`，存在 3 个幽灵前置 ID | 独立课程索引定义显式 DAG，所有前置点存在 |
| 教学统计 | 选择题前测与文本后测直接算差值或 g | 显式标注不可比性，不给未校准量表计算教学增益 |

人工课程审核、概率校准、随机对照及真实 7 天保持实验仍是 **HUMAN_PENDING / NOT TESTED**。软件验收和 Agent 操作的验收数据不能替代这些结论。

## 2. 多阶段并发安排

阶段不是按专业串行排队。P0 冻结接口后，A/B/C 三条线同时实施；集成负责人 I 同时完成图检索和共有接口，不重复编辑各线独占文件。

| 阶段 | 同时进行的工作 | 输入 | 独立交付与进入下一阶段条件 |
| --- | --- | --- | --- |
| P0 合同冻结 | 三组只读核查 + I 写本方案与接口约定 | 审查报告、当前代码和 UI 交接状态 | 请求/响应、课程 ID、事件语义和文件归属确定 |
| P1 并发实现 | A 可信评分；B LEAP 连续性；C 课程/题库；I 显式知识图与检索 | 下方固定合同；各线可以使用局部 fixture | 每线完成真实可调用服务或可加载数据，并通过必要的专项验收 |
| P2 集成 | I 接 seed、前端 API 和练习组件；A/B/C 修各自接口交界问题 | P1 数据/服务；UI 对话完成后的当前页面 | 普通练习→原生掌握→LEAP，知识索引→检索→学习页全部贯通 |
| P3 业务验收 | 学习闭环、课程选择、资源检查、统计语义可以并行核对 | 集成候选 | 伪造分数、重复提交、外部证据同步、规划失败、耗尽、恢复均有证据 |
| P4 最终 UI 与冻结 | 恢复昔涟配色、改善对比/层次、桌面和手机检查；最终门禁与交付 | P3 业务稳定候选 + UI 交接 | 真实截图、请求记录、CI 对应门禁；最后不再扩展业务功能 |

### 文件独占表

| Owner | 独占写入范围 | 禁止交叉编辑 / 对接方式 |
| --- | --- | --- |
| A 可信练习 | `app/practice/**`（除 C 数据文件）、`api/routes/practice.py`、`services/practice_evaluation_service.py`、`domain/models.py` 练习 DTO、`main.py` 模型导入、练习专项测试 | 不改 adaptive/knowledge、UI、主题；公共 DTO 改动先告知 I |
| B LEAP 连续性 | `app/adaptive/service.py`、`adaptive/models.py`、`adaptive/submissions.py`、`api/routes/adaptive.py`、adaptive 专项测试 | 不改 A 的原生模型/练习目录、不改 C 的 catalog 内容；使用下方事实合同 |
| C 课程内容 | `app/curriculum/course_ds.json`、`knowledge/materials/course-ds/*.md`、`practice/data/course-ds.json`、`adaptive/catalog.py`、课程内容专项测试 | 不改图算法、seed、A/B 服务和 UI；新增 ID 只使用冻结清单 |
| I 主集成 | 课程索引加载器、`core/seed.py`、`knowledge/{models,loader,repository,graph,retriever,graphrag}.py`、知识 API/来源转换、前端调用与页面接入、课程选择、资源检查、最终主题及验收 | 对 A/B/C 的文件提出问题，由 owner 修；owner 交付后才能接管 |

主集成负责跟踪同项目“按最新 UI 优化文档完成工作”对话，确认该对话最终交付与已完成状态后再接手。当前没有可调用的 Codex 跨对话工具时只读核查该对话记录，不向其注入未授权消息。UI 对话未交接前，I 暂不修改其页面、通用控件、全局 CSS、主题和交互测试。不切换当前分支，不把他人的未完成内容认作本轮已验收结果。

## 3. 冻结合同 A：服务端练习评分

### 3.1 题目来源

课程题库是服务端数据：`app/practice/data/course-ds.json`。顶层 `version` 与 `questions`，每道题包含：

```json
{
  "id": "ds-linear-insert-practice-01",
  "version": "ds-bank-2026.10.14-v2",
  "courseId": "course-ds",
  "knowledgePointId": "kp-linear-list",
  "objectiveId": "linear-insertion-cost",
  "stage": "practice",
  "prompt": "题干必须说明给定条件和计费操作。",
  "options": [{"id": "a", "label": "选项"}, {"id": "b", "label": "另一选项"}],
  "correctOptionId": "b",
  "explanation": "服务端评分后才展示的依据。",
  "difficulty": 0.5,
  "sourceRefs": ["course-ds:linear-list#定位与插入"]
}
```

阶段取 `practice | probe | retest`。常规练习目录只返回 `practice`，不得把独立题及其答案通过另一入口提前暴露。保留并服务端收录既有死锁和 PV 练习，其他课程的学习入口继续可用。

### 3.2 公共接口

`GET /api/practice/questions?learner_id=...&course_id=...&knowledge_point_id=...` 返回 `{version, questions}`。公开题目包含 `id/version/knowledgePointId/objectiveId/prompt/options`，未作答题不含答案键、评分规则与讲解。已作答题追加当前学习者的 `recordedResult:{optionId,isCorrect,score,feedback}`，用于恢复选择和反馈；其他学习者仍为 null。

`POST /api/practice/evaluate` 使用同一路径完成契约升级：

```json
{
  "learner_id": "当前账号",
  "course_id": "course-ds",
  "knowledge_point_id": "kp-linear-list",
  "question_id": "ds-linear-insert-practice-01",
  "option_id": "b",
  "session_id": "可选的当前学习会话"
}
```

公共请求不接受 `is_correct/score/difficulty`；缺少真实答案或提交派生分数的请求不能产生评价证据。内部已有可信评价 DTO 可以保留供服务端应用服务使用，不能继续作为公共请求模型。

响应保留现有 `evidence/mastery_before/mastery_after/confidence/evidence_count/replanning`，新增服务端 `is_correct/score/feedback/grading_version/already_recorded`。前端判定和展示只依据响应。

### 3.3 一题一次入账

唯一键为 `(learner_id, course_id, question_id, question_version)`。A/B 复用 B 定义的 AdaptiveQuestionSubmission 收据表；公共 helper 在独立的 `adaptive/submissions.py` 中，只依赖模型与 SQLAlchemy、flush 不 commit，避免应用服务之间循环导入。题目首次提交在同一事务保存作答记录、证据、掌握投影及可回放结果。相同请求重试返回原结果；已提交题目改答案不能获得第二次掌握更新。新学习会话不能绕过同题去重。需要再次训练时使用明确的复习记录或另一道变式题，不把重复题计作新独立证据。

无需修改历史证据或制造新的高分来兼容旧接口。历史记录保留原来源；只有具有可信评分来源的事件被标为服务端验证。

## 4. 冻结合同 B：事实流、状态与连续学习

### 4.1 统一事实元数据

新评价的 LearningEvidence payload 使用以下字段，A/B 同时遵守：

```json
{
  "score": 1.0,
  "is_correct": true,
  "difficulty": 0.5,
  "grading_source": "server",
  "grading_version": "具体评分器版本",
  "question_version": "具体题库版本",
  "independent": true,
  "hint_used": false,
  "counts_for_mastery": true,
  "misconception_code": "有对应目录判断时才填写"
}
```

LEAP 的行为事件继续记录，但带提示训练与旧题复习的 `independent=false`、`counts_for_mastery=false`。后端按题目阶段和分配事实决定独立性，不能让客户端把可见讲解下的练习随意标成独立后测。

### 4.2 状态同步

LearningEvidence 为唯一事件来源。M/U/Q 是同一事件流的两个可重建视图之一，BKT 与现有掌握算法的数值可以不同，不能出现证据集合陈旧或同一事件重复计数。

B 按 learner/course/knowledge point 读取原生已验证评价，按时间及事件 ID 确定顺序，按 item+版本去重；考试服务已在服务端生成的 `exam_answer_evaluated` 也应进入同步。LEAP 自己的事件与外部事件使用同一规则，不把原生 evidence_count 当作已积累 BKT 次数再重复处理。同步结果包含 `modelVersion/evidenceCount`；未知时 M 保持 null。

M/U/Q 含义固定：M 为掌握估计，U 为未校准不确定性指标，Q 为误解候选分布。不得把 Q 改称证据条数。原生 MasteryRecord 与 BKT 的模型差异在说明中明确保留。

### 4.3 幂等、规划与读写边界

- 同一会话同一阶段同题的 practice/probe/retest 重试返回已保存结果；改变请求内容不能再次计分。
- 评估事实提交后，重规划单独完成；异常只影响 `replanning`，不能把已保存后测变成 HTTP 失败。
- Session 增加 `assessmentStatus: 'pending'|'saved'` 与 `replanning: {status:'not_needed'|'performed'|'failed', reasonCodes:string[], previousPlanId:string|null, newPlanId:string|null}`，失败状态也持久化，可刷新恢复。
- GET session/list/overview 与声明只读的 MCP 工具不分配题目、不 commit、不因题池耗尽报错。
- 新增 `POST /api/adaptive/sessions/{id}/ready-retest`，实际到期后显式准备复测；原 retest 提交校验服务端分配。

### 4.4 有限题池的持续学习

Session 增加 `questionAvailability`，按 `practice/probe/retest` 返回 `{status:'available'|'exhausted', novelty:'new'|'review'|null, message:string}`；Question 可附加 `novelty`。

训练题耗尽可以明确进入 review；review 可以反馈答案，但不增加独立证据。独立题不足时优先从同知识目标的未见版本化题库分配；仍耗尽就保持已有结果，提供“复习本主题”与“转到其他主题”的实际入口，不用 409 让整个会话/概览不可用。不得只更换 ID 或数值外观，把同一题伪称独立迁移。

### 4.5 成效统计

Outcome 增加 `scoreComparable:false` 和 `comparisonReason`。未完成题型/量表校准前，`observedGain` 与组均值 `meanGain` 允许 null；前测和后测原始得分继续分别展示。前端不计算 normalized gain g，也不把不同 topic/rubric 混合结果称为教学增益。CSV/JSON 保留题目 ID、版本、独立性和可比性。

## 5. 冻结合同 C：数据结构课程与题库

课程唯一索引为 `app/curriculum/course_ds.json`，不把数据库表、Markdown文件名和前端常量分别当作三份课程真相。

```json
{
  "courseId": "course-ds",
  "version": "course-ds-2026.10.14-v2",
  "reviewStatus": "pending_human_review",
  "knowledgePoints": [{
    "id": "kp-linear-list",
    "name": "线性表与链式结构",
    "order": 2,
    "difficulty": 2,
    "material": "linear-list.md",
    "prerequisiteIds": ["kp-ds-complexity"],
    "aliases": ["顺序表", "单链表", "linked list"],
    "objectives": [{"id":"linear-insertion-cost","text":"区分定位与链接修改的成本"}],
    "sourceRefs": [{"title":"参考资料","url":"可核查的官方原始来源","locator":"章节定位","verificationStatus":"reference_checked"}]
  }]
}
```

### 5.1 固定主知识点

保留原来 5 个 ID，新增 5 个，共 10 个；章节内以目标细分，避免为目录美观制造大量业务实体。

| ID | 覆盖内容 | prerequisiteIds |
| --- | --- | --- |
| `kp-ds-complexity` | ADT、逻辑/存储结构、O/Θ/Ω、最好/平均/最坏、摊还与空间 | 无 |
| `kp-linear-list` | 顺序表、单/双/循环链表、头结点、定位/插删、容量与存储开销 | complexity |
| `kp-stack-queue` | 栈、队列、循环队列、满/空约定、单调结构基础、应用推演 | linear-list |
| `kp-recursion` | 调用栈、终止条件、递推、分治与递归空间 | stack-queue |
| `kp-strings` | 串、朴素匹配、KMP 前缀/失配语义、边界 | linear-list |
| `kp-trees` | 树性质、遍历/重建、BST、AVL边界、哈夫曼编码 | recursion |
| `kp-heaps` | 完全二叉树、大小顶堆、建堆、优先队列、堆排序 | trees |
| `kp-graphs` | 有向/无向/权图、表示、BFS/DFS、拓扑/关键路径、MST、最短路条件 | stack-queue, recursion |
| `kp-sorting-search` | 顺序/折半查找；插入、冒泡、选择、归并、快排、希尔、堆、计数、基数排序比较 | linear-list, recursion |
| `kp-hashing` | 哈希函数、冲突、链地址/开放定址、装载因子、删除标记与复杂度假设 | linear-list, ds-complexity |

上表简写引用实际保存时均加 `kp-`；`complexity` 具体为 `kp-ds-complexity`。每个前置 ID 必须存在，图必须无环。旧 5 个知识点上的学习记录保留，新增点没有证据时显示未知。

### 5.2 内容最低完整度

每篇包含学习目标、定义/不变量、条件明确的算法过程、至少两个原创步骤例子、复杂度/边界、误解与纠正、参考来源和自测提示。特别修正：邻接矩阵行和的图类型条件、遍历扫描顺序、Kruskal 拼写、Shell gap 假设、快排性能表述、树重建键互异条件、哈希负载与链长，以及链表题的前插/后插条件。

来源优先使用 MIT OCW / OpenDSA 等原始课程资料；页面可访问及 locator 核查与教师审核是不同状态。正文、题目与例子采用本项目自己的表达，不整章复制外部教材。访问失败的资料不能标记 reference_checked。

### 5.3 题目与自适应映射

常规服务端题库至少每知识点 4 道 practice、2 道 probe、2 道 retest，共 80 道；三个阶段使用不同情境和独立 ID，不只复制题干换编号。答案与难度仅在服务端文件保存。

既有 4 个 LEAP topic、误解编码和历史 id 保留；新增 sorting-search 自适应 topic，并以同一知识库引用支持教学。幽灵前置 ID 替换为真实课程 ID。现有文本 rubric 继续诚实标注规则评分；新增客观题依照服务端答案键。

## 6. 图、检索与前端集成合同

- `core/seed.py` 从课程索引创建共享目录，不创建学习者证据/掌握状态。
- Graph 的 `precedes` 方向固定为 **前置知识点 → 后续知识点**，数据只来自显式 prerequisiteIds。课程包含、小节解释和展示顺序不伪装依赖。
- 对尚无显式前置资料的其他课程，显示内容大纲，不继续按字母顺序制造依赖。
- loader/model 增加 `version/sourceRefs/prerequisiteIds/objectives/aliases` 等可选元数据；chunk、检索结果和来源引用携带实际文档、小节与版本，避免只给笼统 builtin 标签。
- 检索先计算问题本身的词项/别名相关性，再适度扩展真实前置与后续节点；邻居不会无条件排在高相关段落之前。
- 新增 `GET /api/knowledge/curriculum?course_id=course-ds`，返回去除答案后的课程索引。现有 points/content/graph 路径兼容，并提供新点完整学习内容。
- ModulePractice/PracticeCard 从服务端取题并提交答案；数据结构新点不再回落到没有题目的前端通用演示。
- 首次初始化展示实际课程选项；资源质量检查接收本次 `generateLearningResource` 的局部返回值。

## 7. 最终视觉约束

最后阶段恢复昔涟角色与品牌配色，以角色素材与原有品牌资产为依据，不能套用泛 AI 淡紫/紫罗兰主题；保留当前新工作台的清晰网格、实体卡片、阅读字号、移动交互与材料栏。只调整颜色、必要的层次/对比和实际发现的视觉问题，不整体还原旧页面。

主要修改 `theme.css/tokens.ts/tailwind.config.js` 及少量尚未使用语义颜色的图表。亮/暗主题分别检查正文、提示、按钮、表格、图谱和选项状态；不能只改浅色主按钮而留下青色硬编码或深色低对比。

## 8. 验收案例与证据

| 编号 | 必须观察的行为 |
| --- | --- |
| A1 | 正确/错误答案由服务器产生不同分数；伪造 score 请求拒绝且数据库不增加评价 |
| A2 | 同题重试、同题跨会话重提不重复计数；另一道题正常入账 |
| B1 | LEAP 同一道练习重复提交只保存一条对应计分事件 |
| B2 | 普通练习/考试新增已验证评价后，LEAP 的证据集合在恢复/概览中更新且无重复 |
| B3 | 注入实际规划异常后，后测返回 saved + failed；刷新可看到已保存结果 |
| B4 | 所有 GET/只读工具前后数据库行数与会话快照无变化；题池耗尽仍可读取与复习 |
| B5 | 未到期复测不可登记保持成绩；到期显式分配后可作答；不可比成绩不显示 g |
| C1 | 10 个主点均有材料、目标和题目；每个前置节点存在且 DAG 无环 |
| C2 | 按链表定位、循环队列、BST退化、BFS最短路、哈希冲突、快排最坏等查询命中正确段落及来源 |
| I1 | 选定数据结构后账户和所有请求的 course_id 一致；连续两次资源生成各自检查其正文 |
| U1 | 新注册/登录→选课→诊断→教学→独立题→证据/计划状态→退出恢复真实走通，保留请求和截图 |
| U2 | 桌面和手机无遮挡/横向溢出；亮暗模式都保留昔涟品牌识别与可读性 |

专项测试只围绕上述实际缺陷。集成后运行 CI 对应现有命令一次；发现新问题才重跑受影响范围。最终保留工作区代码、本文执行记录、真实浏览器截图与请求摘要。无需以测试数量证明教学效果。

## 9. 执行记录

- [x] P0：三组源码核查、确认工作区 UI 并发状态并冻结本合同。
- [x] P1-A：服务端评分、题目目录、一次性入账；含跨入口收据回放与已答结果恢复。
- [x] P1-B：状态同步、重规划语义、只读恢复与题池连续性；专项 7+1 通过。
- [x] P1-C：数据结构 10 点课程、80 题与内容纠错；独立审查并修正三道题，内容专项 3 通过。
- [x] P1-I：索引、显式图与来源检索；图关系不依赖文件顺序，直接相关段落优先，宽上下文保留一个真实前置点。
- [x] P2：前后端集成、课程选择、资源质量检查；连续两次生成正文检查专项通过。
- [x] P3：隔离库真实 HTTP 闭环、Chrome 注册/选课/诊断/教学/独立后测/退出恢复通过，原生工作台补验记录随验收报告交付。
- [x] P4：昔涟配色与亮暗主题、手机视觉收口；本地 check/build 通过。远端 CI 在推送后单独核实，不以历史 success 代替。


### 9.1 合并期间的补充修复

- 等待同项目 UI 对话于 2026-10-14 完成交付后接管其页面，保留工作台布局、教材分栏、打印与移动交互。
- 共用收据同时查询已见但不计分的提示/复习题，防止换入口升级为新掌握证据；常规 practice 标记 independent=false。
- 重新进入已诊断主题复用保存结果；按具体题目的误解编码重放 Q，避免把排序稳定性或希尔增量题错误归到二分查找前提。
- 知识空间与教材栏读取完整的显式课程图；原生练习、LEAP 和首页证据数量在写入后刷新。
- 补上教材 Markdown 表格显示，目录仅展开当前章节；深色按钮使用独立实色 token 保证文字对比。
- 昔涟参考：既有品牌图片的粉、天蓝、白、深色与少量金色。采用玫瑰色操作强调和深色文字，保留状态色语义。

### 9.2 当前验收证据

后端完整 pytest 348 passed；前端首轮完整 124 文件/396 用例中 395 通过，唯一失败为旧“教材顺序”文案断言，修正后该项通过。新增复杂度表格用例通过；最终完整结果以对应提交的远端 CI 为准。`pnpm check`、生产构建与视频脚本 12 项检查通过。

Chrome 实际运行覆盖 1440×960 桌面、390×844 手机、亮暗主题及 22 条流程/布局检查；HTTP 请求和截图来自隔离账号/数据库，不代表真实学生教学增益。此轮未部署到生产 ECS、未发布 GitHub Release，也未伪造 7 天延迟作答。

可复核截图、请求摘要与限制见 [验收记录](../../evidence/2026-10-14/acceptance.md)。
