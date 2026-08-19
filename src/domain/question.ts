import type { EntityId, Timestamp } from './types';

/** 题目类型。 */
export type QuestionType = 'single_choice' | 'multiple_choice' | 'short_answer';

/**
 * Question —— 题目。
 */
export interface Question {
  id: EntityId;
  type: QuestionType;
  /** 题干 */
  stem: string;
  /** 选项（选择题） */
  options?: string[];
  /** 参考答案 / 标准答案（选择题为索引集） */
  answer: string | number[];
  /** 关联知识点 */
  knowledgePointId?: EntityId;
  difficulty: number;
}

/**
 * AnswerRecord —— 作答记录。
 */
export interface AnswerRecord {
  id: EntityId;
  userId: EntityId;
  questionId: EntityId;
  /** 用户作答 */
  userAnswer: string | number[];
  isCorrect: boolean;
  /** 作答耗时（秒） */
  durationSeconds?: number;
  answeredAt: Timestamp;
}

/**
 * MistakeRecord —— 错题记录。
 * 由错误的 AnswerRecord 或测评结果派生，是后续「错因诊断」与「错题复习」的来源。
 */
export interface MistakeRecord {
  id: EntityId;
  userId: EntityId;
  questionId: EntityId;
  knowledgePointId?: EntityId;
  /** 错因类型标签（第一阶段可空） */
  reasonTags?: string[];
  /** 是否已复习纠正 */
  isReviewed: boolean;
  createdAt: Timestamp;
}
