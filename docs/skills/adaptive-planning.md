# Adaptive Planning Workflow

## Purpose

Read the latest diagnosis and Current Plan, then request deterministic replanning only when the caller explicitly chooses the write action.

## Flow

`get_learning_diagnosis → get_current_study_plan → replan_study_plan (when requested)`

The first two tools are read-only. `replan_study_plan` is a write tool and delegates to DynamicReplanningService. Its Material Change decision compares only the ordered `(knowledge_point_id, action_type)` signature and atomically replaces the Active plan when required.

No Current Plan returns `NO_ACTIVE_PLAN` and does not create a first plan. Initial creation is the separate write tool `generate_study_plan`.
