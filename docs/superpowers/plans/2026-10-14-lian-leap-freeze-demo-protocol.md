# 涟千言比赛冻结：真实演示与效果材料协议

日期：2026-10-14。适用计划：[再次复审并发修复计划](2026-10-14-lian-leap-review-freeze-parallel-plan.md)。

**状态：计划，尚未执行。** 本文定义最终 P3 如何采集一次真实产品闭环，并限定材料可以证明的内容。本文没有真实学生实验结果，也不创建演示学习记录。

## 1. 三种材料分别证明什么

| 材料 | 可以证明 | 不能证明 |
| --- | --- | --- |
| 自动化测试与浏览器验收 | 当前软件候选按契约评分、记录和跳转 | 学生学得更好、模型经过训练 |
| 操作者按脚本完成的真实 API/UI 演示 | 完整机制可运行，记录来自实际操作 | 操作者因本系统才学会，或可推广的教学效果 |
| 经同意参与的真实学习者前测、教学、后测、七天复测 | 个体在规定条件下的实际表现与保持情况 | 没有合适对照时的因果提升、显著效果 |

演示账号“学生 A”是展示化名；若实际由项目成员或 Agent 操作，必须标记“技术演示账号 / 操作者脚本作答”。不得把技术验收账户计作研究参与者。

## 2. 固定试点与真实题目定位

| 字段 | 当前基线值 |
| --- | --- |
| courseId | `course-ds` |
| topicId | `linked-list` |
| knowledgePointId | `kp-linear-list` |
| 误解候选 | `LL_IGNORES_SEARCH_COST`：将修改链接的 O(1) 误当为完整插入总是 O(1)，忽略定位 |
| 公共练习示例 | `ds-linear-practice-02`：已知前驱后插入；`ds-linear-practice-03`：只给头指针，需要在 X 前插入 |
| LEAP 诊断题 | `ds-ll-diagnostic-q07`，单选 |
| LEAP 练习 | `ds-ll-practice-1..3`，预设文本 rubric |
| LEAP probe | 当前可分配公共版本题库的 probe（本轮实测为 `ds-linear-probe-01`）；目录还保留 `ds-ll-probe-1..5` 文本题，实际分配由服务端决定 |
| LEAP retest | 公共版本题库的 retest 与目录保留的 `ds-ll-retest-1..5`；实际到期后按服务端分配记录 |
| 当前模型版本 | `bkt-evidence-replay-v2-uncalibrated` |
| 默认组别 | D，`ablation=none`；创建时记录实际返回，不能仅依据 UI 默认值 |

这是代码核查时的可用题目列表，最终记录必须填写服务端实际分配的 ID 与版本。公共客观题库和 LEAP 文本题不能混用 ID，也不能靠改数据库指定一个通过结果。

## 3. 执行准备：只在 P3 进行

- 使用最终生产构建与现有正式账号认证流程。前端可用 `pnpm exec vite preview --host 127.0.0.1 --port 4173`；后端沿用 `uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1`，先确认端口属于本次运行且当前 Vite 预览代理与后端一致。
- 演示使用独立测试数据库/专用演示账号，不向现有用户学习数据预填成绩。新的临时文件与可配置数据库放在 F 盘本项目范围内。
- 记录候选标识、构建时间、题库/目录/策略/模型版本和执行者类别。账号密码、Cookie、token 与服务密钥不进入截图、日志、JSON 或材料。
- 真实研究参与者自行独立作答，不提前提供标准答案。技术演示操作者可以按既定脚本操作，但结果必须标为技术演示。
- 同一 P3 浏览器验收顺便留存证据，不提前重复跑演示，也不为采集素材新增第二套测试系统。

## 4. 即时闭环：一次操作完成

| 步骤 | 实际操作 | 必须留下的事实 | 展示时可说的话 |
| --- | --- | --- | --- |
| 1 | 登录专用新账号，选择数据结构；展示空白档案 | 尚无学习成绩，实际账号与课程范围 | “这里没有预置掌握度。” |
| 2 | 在普通练习提交链表插入题的实际选择；技术脚本可选一次错误项 | request 只有答案；response 的 score、grading_version、evidence.id | “对错由服务端按当前题目判定。” |
| 3 | 返回首页读取推荐 | 实际 recommendation 文案、目标 topic/session、依据证据数量 | “下一步来自当前记录；证据不足时先诊断。” |
| 4 | 点击目标，明确开始 `linked-list` 的 D 组会话 | session.id、group、ablation、catalogVersion、policyVersion | “点击后才建立这次教学会话。” |
| 5 | 回答诊断题；技术演示选择忽略定位成本的错误项 | 诊断题 ID、得分、误解候选码、reason、evidenceIds | “系统识别一个课程内的典型误解候选。” |
| 6 | 展示服务端推荐、候选行动及因素；按实际推荐执行教学 | actionType、reason、候选排序；若人工改选，记录改选动作 | “依据误解候选、先修和时间预算选择教学方式。” |
| 7 | 展示“已知前驱修改链接”与“先找前驱再插入”的区别；按需完成练习 | 实际教学内容；提示练习标记与其证据属性 | “针对的是把局部操作成本当成总成本的理解偏差。” |
| 8 | 收起教学，进入服务端分配的独立新题；作答并提交 | 不同阶段实际题目 ID、提示不可见、独立标记、分数、feedback | “讲解结束后，系统用新题检查本次能否独立解决。” |
| 9 | 查看结果、重规划状态与档案；刷新一次恢复 | 同一 session/evidence；assessmentStatus；replanning.status；实际前后估计；误解状态与真实复测结果 | “学习结果已经保存，路线是否调整单独记录。” `repaired` 表示本次验证通过；没有实际复测分数时说明对应候选暂缓、保持情况待复测，有分数则展示该结果。 |
| 10 | 查看 OutcomeLab 与导出 | 原始前后成绩、不可比说明、无提示后测会话数、实际 retestDueAt | “这里按会话记录过程和表现；同一人的多次会话不代表多个学生，也不把两项分数差称为教学增益。” |

不强求每次推荐都是 `contrastive_teaching`。先修证据不足时，系统可能合理推荐 `diagnostic_probe` 或 `prerequisite_repair`。若为了展示对比教学而手动改选，明确说“下面切换查看对比讲解”，不能伪称是系统自动选出的策略。

不能为了“两个错误记录”的文案重复提交同题。同题复用结果本来就不应产生新掌握证据；如演示确需多条证据，使用不同题目并保留各自 ID。

技术演示参考知识点是：已知前驱时修改固定数量链接为 O(1)；仅有头指针且需定位前驱时，最坏查找为 O(n)。最终题目可能要求额外条件或步骤，必须按实际题干作答；不把这句话作为所有 probe 的固定万能答案。

## 5. 七天复测与闭环时序

实际实现不是必须等七天才第一次重规划：

```text
诊断 → 教学 → 独立 probe → 保存结果与即时规划判定
                         |
                         +→ retestDueAt = probe 完成时间 + 7 天
                                      |
                           真实到期后 ready-retest → retest
                                      |
                              保存保持结果 → 再次规划判定
```

最终以服务端 `retestDueAt` 为准，不从展示日期自行猜测时间。尚未到期只展示“待复测”；自动化测试中模拟到期仅证明软件逻辑，不能登记为真实保持成绩。

如果已有真实到期会话，可以恢复该会话完成复测并记录来源；不能把旧会话复测接到新演示账号上假装是一条连续链路。真实七天复测必须来自同一学习者和可追溯的先前会话。

未收集真实七天结果时，材料写 `RETENTION_PENDING`，本次只声称即时闭环和到期机制可运行。无需把实施任务挂起等待七天，也不自动创建提醒或定时任务。

## 6. 最终证据最小字段

`demo-case.json` 只在 P3 实际执行后写入。以下是字段约定，空值表示尚未采集，不能把本示例当证据：

```json
{
  "candidate": null,
  "executionKind": "technical_demo",
  "participantAlias": "学生 A",
  "courseId": "course-ds",
  "topicId": "linked-list",
  "catalogVersion": null,
  "policyVersion": null,
  "questionBankVersion": null,
  "modelVersion": null,
  "sessionRef": null,
  "practice": null,
  "diagnostic": null,
  "decision": null,
  "probe": null,
  "replanning": null,
  "retestDueAt": null,
  "retest": null,
  "softwareGate": "NOT_TESTED",
  "retentionStatus": "NOT_COLLECTED",
  "effectClaim": "not_established"
}
```

`practice/diagnostic/probe/retest` 实际记录至少包含 `questionId/questionVersion/score/gradingVersion/evidenceRef/occurredAt`，并记录 `independent/hintUsed/countsForMastery` 的实际可得值。不存在的字段填 null 并说明来源，不从其他阶段拷值。

`decision` 至少包含实际 `actionType/reason/policyVersion`；`replanning` 保存服务端状态与 reasonCodes。若要证明“重新排了计划”，还需实际 previousPlanId/newPlanId；仅 `nextStep` 建议不能替代已保存计划。

公开材料用稳定化名替换 learner、session、evidence 等账号关联 ID；私下核查记录保留对应关系用于追溯。只导出该演示账号，排除其他用户数据。截图至少覆盖推荐、决策、独立结果、档案四个关键位置，不追求重复截图数量。

## 7. 答辩用词与代码对应

| 可以使用的说法 | 依据 | 需要避免的扩大解释 |
| --- | --- | --- |
| “面向课程知识结构的可解释误解候选识别” | 课程 topic、misconceptionCode、诊断得分与 reason | 自动发现任意未知认知模型、大模型心理理解 |
| “六类教学行动按规则与当前证据选择” | diagnostic_probe、contrastive_teaching、prerequisite_repair、guided_practice、transfer_challenge、retrieval_practice | 强化学习训练得到的最优教学策略 |
| “M 是未校准的 LEAP 掌握估计，U 是不确定性指标，Q 是按课程规则计算的误解候选权重” | `_apply_bkt` 固定参数、`uncalibrated` 模型版本与规则生成的候选项 | 将 M/U/Q 或 confidence/Q 说成训练、校准得到的个人概率 |
| “D 组使用 LEAP 规则机制；具体会话可能记录消融配置” | A–D 机制分组与该 session 实际返回的 `ablation` | 把每条 D 组会话都称为完整机制，或称为随机对照结论 |
| “以独立新题作答作为本次验证依据” | probe 的新题与 independent/hintUsed | 一次通过就已经永久掌握 |
| “可运行的教学机制对照框架” | A–D 实际分组、策略和导出 | 随机对照已证明显著提高成绩 |
| “学习事实、模型估计、实际成绩分别可查” | LearningEvidence、全局画像、LEAP state、Outcome | 所有数值都是同一模型，或全历史都经过新版验证 |
| “无提示后测记录按会话计数” | OutcomeLab 与分组导出的会话汇总 | 把同一学习者的多条会话当作多个独立学生样本 |

可直接使用的核心表述：

> 涟千言把课程内的误解候选、教学选择和独立验证连成可追溯的学习过程。普通练习与 LEAP 的新评价由服务端按题目评分。系统用独立新题检查本次表现，并安排延迟复测；当前模型和策略属于可解释的工程实现，实际教学效果仍需要真实学习者研究。

## 8. 未来效果研究：设计条件，不属于本轮实现

1. 先由教师审核链表目标、题目、误解映射和 rubric；明确前测/后测/复测的同目标、相近难度和量表可比性。
2. 明确研究单位为学习者，不把一个人的多个 session 当独立样本；记录重复测量、失访、题目暴露与学习时间。
3. 在参与者同意与合适研究安排下，制定随机或按前测水平分层的分配方案；固定各组题池、时间预算、可用提示与评分规则。
4. 预先选定主要指标，例如同目标独立新题成绩；七天保持为另一个明确指标。效应量、不确定区间和样本量规划由实际研究方案确定，不预填提升百分比。
5. A–D 可用于机制拆解，但四组需要足够数据；是否先比较基线与完整 LEAP 由研究设计决定，不仅给 UI 加随机按钮就宣称实验成立。
6. 导出各阶段的题目/评分/策略版本和实际分组，尽可能对人工评分隐藏组别；完整报告未完成复测者，不能只展示成功案例。

研究未完成前，最终比赛材料保留 `RESEARCH_NOT_ESTABLISHED`。软件冻结与研究结论是两个独立判定。

## 9. 本轮执行记录

2026-10-14 已按上述边界完成技术演示，记录见 [本轮冻结验收](../../evidence/leap-freeze/a63da76-worktree-20261014/acceptance.md)。公开材料中的“学生 B”是浏览器自动化操作者账号，非研究参与者。首轮在导出面板关闭时发现顶栏遮挡；保存中断证据并修复后，以持久浏览器会话完成续验。

本轮实际链路使用普通练习 `ds-linear-practice-02`、诊断 `ds-ll-diagnostic-q07` 和独立题 `ds-linear-probe-01`。后测为 1.0，前后成绩不可比、未计算增益；重规划真实返回 `not_needed`。复测计划时间为北京时间 2026-10-21 10:12:02，尚未采集真实保持结果。
