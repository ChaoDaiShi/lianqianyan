# Grounded Tutoring Workflow

## Purpose

Ground tutoring in real learner context and original course material rather than answer as a generic chatbot.

## Flow

`get_learner_profile + get_learning_diagnosis + get_current_study_plan → search_course_knowledge → Tutor`

All listed tools are read-only. `search_course_knowledge` is course-isolated and returns real source chunks. The Tutor remains an internal Agent/Application boundary and is not exposed as an MCP chat tool.

Only tools that actually execute belong in an Agent trace. The final Tutor may call the configured LLM provider at most once.
