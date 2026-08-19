import type { EntityId, Mastery, StudyStatus, TaskType, Timestamp } from './types';

/**
 * StudyPlan —— 学习计划。
 * 由诊断（Diagnosis）与画像（LearnerProfile）推导出的动态学习路线。
 */
export interface StudyPlan {
  id: EntityId;
  userId: EntityId;
  /** 计划名称，如「软件设计师备考计划」 */
  name: string;
  /** 总体进度 0 - 1 */
  overallProgress: Mastery;
  /** 目标日期（备考 / 达成目标剩余天数由前端计算） */
  targetDate?: Timestamp;
  /** 关联课程 */
  courseIds: EntityId[];
  isActive: boolean;
  tasks: StudyTask[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * StudyTask —— 学习任务。
 * 计划中的可执行单元，是学习行为触发的载体。
 */
export interface StudyTask {
  id: EntityId;
  planId: EntityId;
  /** 关联知识点（可选） */
  knowledgePointId?: EntityId;
  title: string;
  type: TaskType;
  status: StudyStatus;
  /** 预计时长（分钟） */
  estimatedMinutes: number;
  /** 已完成时长（分钟） */
  completedMinutes?: number;
  /** 题数（练习 / 测评类任务） */
  questionCount?: number;
  dueDate?: Timestamp;
}
