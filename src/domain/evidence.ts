import type {
  EntityId,
  EvidenceSource,
  EvidenceType,
  Mastery,
  Timestamp,
} from './types';

/**
 * LearningEvidence —— 学习证据。
 *
 * 学习证据代表学生在学习过程中产生的一次**可用于判断学习状态**的行为记录。
 * 这是 EducationMind 的核心数据，页面（Web UI）只是表现层。
 *
 * 语义约定：
 * - `evidenceType` 描述「行为是什么」；
 * - `source` 描述「行为从哪里产生」。
 * 二者独立；只有 assessment 分类（如 practice_answer_evaluated）可影响掌握度。
 *
 * 未来数据流：
 *   LearningEvidence → MasteryRecord → LearnerProfile → 学习诊断 → 学习计划
 */
export interface LearningEvidence {
  id: EntityId;
  learnerId: EntityId;
  evidenceType: EvidenceType;
  /** 来源类型（与证据类型独立） */
  source: EvidenceSource;
  courseId?: EntityId;
  knowledgePointId?: EntityId;
  questionId?: EntityId;
  /** 关联的会话 / 任务 / 练习 */
  sessionId?: EntityId;
  /** 本次行为的即时掌握度评估（可选，由评估器产出） */
  masteryDelta?: Mastery;
  /** 证据元数据（答案、复述文本、练习结果等，宽松结构） */
  payload: Record<string, unknown>;
  /** 触发时刻 */
  occurredAt: Timestamp;
}

/**
 * MasteryState —— 某个知识点当前掌握状态（只读，服务端计算）。
 */
export interface MasteryState {
  knowledgePointId: EntityId;
  /** 0.0 ~ 1.0 */
  masteryScore: Mastery;
  /** 0.0 ~ 1.0 */
  confidence: Mastery;
  evidenceCount: number;
  updatedAt: Timestamp;
}

/**
 * LearningSession —— 学习会话。
 * 一次连续的学习过程，期间会产生多条 LearningEvidence。
 */
export interface LearningSession {
  id: EntityId;
  userId: EntityId;
  /** 会话主题 / 关联知识点 */
  knowledgePointId?: EntityId;
  startedAt: Timestamp;
  endedAt?: Timestamp;
  /** 会话内产生的证据 */
  evidenceIds: EntityId[];
  /** 会话累计时长（分钟） */
  durationMinutes: number;
}
