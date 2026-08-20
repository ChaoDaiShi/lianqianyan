# Learner Diagnosis Workflow

## Purpose

Read the learner's current course state and produce a deterministic diagnosis without an LLM judging mastery.

## Flow

`get_learner_profile → get_learning_diagnosis`

Both tools are read-only. The profile is a derived read model over MasteryRecord; DiagnosisService remains the only boundary that computes primary focus and interventions.

## Inputs and outputs

Input: `learner_id`, `course_id`. Output: structured LearnerProfile and DiagnosisResult. Consumers must preserve UNASSESSED versus WEAK semantics and must not recompute thresholds.
