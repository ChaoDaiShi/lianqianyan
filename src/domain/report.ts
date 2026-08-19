import type {
  EntityId,
  Mastery,
  MasteryLevel,
  Timestamp,
} from './types';

/**
 * Assessment —— 测评。
 * 一段用于测量掌握度的正式评估（练习、测验、阶段测评）。
 */
export interface Assessment {
  id: EntityId;
  userId: EntityId;
  /** 关联知识点 / 覆盖范围 */
  knowledgePointIds: EntityId[];
  type: 'practice' | 'quiz' | 'exam';
  score?: number;
  questionCount: number;
  startedAt: Timestamp;
  completedAt?: Timestamp;
}

/**
 * LearningReport —— 学习报告。
 * 面向用户/展示的聚合结果，宏观描述一段时间的学习状态。
 */
export interface LearningReport {
  id: EntityId;
  userId: EntityId;
  /** 报告周期（如 2026-08 周报） */
  period: string;
  overallMastery: Mastery;
  masteryLevel: MasteryLevel;
  /** 学习投入（分钟） */
  studyMinutes: number;
  /** 学习streak（连续天数） */
  studyStreakDays: number;
  /** 覆盖的知识点 */
  coveredKnowledgePointIds: EntityId[];
  /** 亮点 */
  highlights: string[];
  /** 建议 */
  suggestions: string[];
  generatedAt: Timestamp;
}
