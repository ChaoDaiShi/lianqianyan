/**
 * EducationMind — 核心领域模型（TypeScript 版）。
 *
 * 重要原则：
 * 「Learning Evidence 才是 EducationMind 的核心数据」，页面只是学习过程的表现层。
 * 所有业务名词与 apps/api/domain（Python）保持一致，作为 Web 侧的事实类型来源。
 */

export type EntityId = string;

/** 掌握程度 0 - 1，前端展示常换算为百分比。 */
export type Mastery = number;

/** 系统时间戳（ISO 8601 字符串）。 */
export type Timestamp = string;

/** 学习证据类型 —— 描述「学习行为是什么」。 */
export type EvidenceType =
  | 'learning_started'
  | 'practice_answer_evaluated'
  | 'exam_answer_evaluated';

/** 学习证据来源 —— 描述「学习行为从哪里产生」（与证据类型独立）。 */
export type EvidenceSource =
  | 'current_study_plan'
  | 'recommended_path'
  | 'learning_space'
  | 'exam_system';

/** 学习证据的领域分类（是否影响掌握度由此决定）。 */
export type EvidenceClassification = 'behavior' | 'assessment' | 'reflection';

/** 掌握度等级（用于诊断结果聚合）。 */
export type MasteryLevel = 'beginner' | 'developing' | 'proficient' | 'mastered';

/** 学习状态。 */
export type StudyStatus = 'not_started' | 'in_progress' | 'completed';

/** 任务类型。 */
export type TaskType = 'learn' | 'practice' | 'assessment' | 'mistake_review';

export { };
