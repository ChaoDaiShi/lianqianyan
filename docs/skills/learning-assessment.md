# Learning Assessment Workflow

## Purpose

Explain recent persisted practice evidence with course grounding while preserving the Practice transaction boundary.

## Flow

`get_recent_learning_evidence + search_course_knowledge → Assessment/Tutor explanation`

Both tools are read-only. Assessment selects the latest `practice_answer_evaluated` evidence and may explain mastery before/after, confidence, and evidence count. It must never update MasteryRecord.

`evaluate_practice` is intentionally not a Tool or MCP capability; new evidence and mastery changes continue through PracticeEvaluationService only.
