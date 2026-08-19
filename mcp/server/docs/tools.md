# MCP Tools 接口设计（未来）

> 本文档是 **MCP Server 未来 Tool** 的设计草图，本轮不实现。所有 Tool 均封装
> EducationMind Domain Service，数据来自 LearningEvidence 驱动的闭环。

## Tool 清单与输入输出

| Tool | 输入 | 输出 | 说明 |
| --- | --- | --- | --- |
| `get_learner_profile` | `user_id` | `LearnerProfile` | 学习画像（由学习证据汇聚） |
| `diagnose_learning_state` | `user_id`, `knowledge_point_id?` | `DiagnosisResult`（薄弱点/等级） | 学习诊断 |
| `generate_study_plan` | `user_id`, `goal?`, `start_date?` | `StudyPlan` | 个性化学习规划 |
| `get_current_study_plan` | `user_id` | `StudyPlan` | 当前学习计划 |
| `start_learning_session` | `user_id`, `knowledge_point_id?` | `session_id` | 开启学习会话 |
| `generate_practice` | `user_id`, `knowledge_point_id`, `count` | `Question[]` | 自适应练习 |
| `evaluate_answer` | `session_id`, `question_id`, `user_answer` | `{ correct, mastery_delta }` | 作答评估 |
| `evaluate_feynman_explanation` | `session_id`, `knowledge_point_id`, `explanation` | `{ score, feedback }` | 费曼复述评估 |
| `update_mastery` | `user_id`, `knowledge_point_id`, `delta` | `MasteryRecord` | 更新掌握度 |
| `generate_learning_report` | `user_id`, `period` | `LearningReport` | 生成学习报告 |

## 数据依赖链路

```text
generate_practice / evaluate_answer / evaluate_feynman_explanation / start_learning_session
        ↓  产生  ↓
    LearningEvidence
        ↓  汇聚  ↓
    LearnerProfile → diagnose_learning_state → generate_study_plan
        ↓
    generate_learning_report
```

## 约定

- 所有 Tool 通过 MCP 标准协议暴露（`tools/call` 等），不引入私有协议。
- 输入输出模型与 `apps/api/app/domain`（Python）及 `src/domain`（TS）保持一致。
- 安全：通过用户身份（user_id）隔离数据，不暴露其他学习者数据。
