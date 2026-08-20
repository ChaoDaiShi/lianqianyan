# EducationMind MCP Tools

以下目录由 `apps/api/app/tools/registry.py` 集中注册，并同时服务内部 Agent、`GET /api/tools` 与 MCP `tools/list`。

| Tool | 输入 | 只读 | Application 边界 |
| --- | --- | --- | --- |
| `get_learner_profile` | `learner_id`, `course_id` | 是 | `LearnerProfileService` |
| `get_learning_diagnosis` | `learner_id`, `course_id` | 是 | `DiagnosisService` |
| `get_current_study_plan` | `learner_id`, `course_id` | 是 | `StudyPlanApplicationService.get_current` |
| `search_course_knowledge` | `course_id`, `query`, `knowledge_point_id?`, `top_k?` | 是 | `LexicalKnowledgeRetriever` |
| `get_recent_learning_evidence` | `learner_id`, `course_id`, `limit?` | 是 | `LearningEvidenceRepository` |
| `generate_study_plan` | `learner_id`, `course_id` | 否 | `StudyPlanApplicationService.generate_plan` |
| `replan_study_plan` | `learner_id`, `course_id` | 否 | `DynamicReplanningService.replan` |

## 契约

- 输入由 Pydantic 校验；`top_k` 为 1..8，Evidence limit 为 1..100。
- Tool 返回统一 `{success, data, error, metadata}`；参数错误为 `INVALID_ARGUMENTS`，未知名称为 `TOOL_NOT_FOUND`，内部异常为清理后的 `TOOL_EXECUTION_FAILED`，协议超时为 `TOOL_TIMEOUT`。
- Current Plan 不存在时是成功且 `data=null`；Tool 读取不自动生成第一份计划。
- `replan_study_plan` 保留 Phase 3-4 Material Change 与原子替换语义。
- `evaluate_practice` 刻意不暴露：练习评价仍只能经过原有 Practice API/Application Service 的证据与掌握度事务边界。

## 安全

Tool 与 MCP 均不重新实现业务逻辑，不经 HTTP 调用自己的 API，不提供 OAuth/RBAC 或自主 Tool Calling Runtime。响应绝不包含 `EDUCATION_LLM_API_KEY`；本目录不暴露 Provider 状态工具。
