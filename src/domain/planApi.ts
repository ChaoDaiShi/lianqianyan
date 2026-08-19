/**
 * EducationMind —— 已持久化学习计划域模型（TS 版）。
 *
 * 与 apps/api/domain/planner.py 保持一致（PersistedStudyPlan / PersistedStudyTask /
 * PersistedStudyPlanSummary）。区别于 src/domain/plan.ts 的早期占位模型，
 * 这里是后端 Plan History / Detail / Generate API 输出的真实契约。
 */

import type { DiagnosisStatus } from './diagnosis';

/** Planner 学习动作类型（机器可读）。 */
export type PlannerActionType =
  | 'assess'
  | 'remediate'
  | 'strengthen'
  | 'review';

/** Planner 动作类型 → 中文展示（集中定义，禁止直接展示 REMEDIATE 等英文）。 */
export const ACTION_TYPE_LABEL: Record<PlannerActionType, string> = {
  assess: '快速评估',
  remediate: '专项强化',
  strengthen: '巩固学习',
  review: '复习回顾',
};

export const ACTION_TYPE_VERB: Record<PlannerActionType, string> = {
  assess: '评估',
  remediate: '强化',
  strengthen: '巩固',
  review: '复习',
};

/** 计划策略。 */
export type PlanStrategy = 'diagnosis_driven';

/** 计划生命周期（Phase 3-1 起：任意时刻至多一个 active，其余为 superseded）。 */
export type PlanStatus = 'active' | 'superseded' | 'completed';

/** 计划状态 → 中文展示（集中定义，禁止直接展示 superseded 等英文）。 */
export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  active: '当前计划',
  superseded: '已更新',
  completed: '已完成',
};

/** 机器可读 Planner 原因代码。 */
export type PlannerReasonCode =
  | 'PRIMARY_FOCUS'
  | 'CONFIRMED_WEAKNESS'
  | 'NEEDS_ASSESSMENT'
  | 'NEEDS_MORE_EVIDENCE'
  | 'NEEDS_STRENGTHENING'
  | 'MAINTENANCE_REVIEW'
  | 'NO_IMMEDIATE_INTERVENTION';

/** 已持久化的计划任务（Read Model）。 */
export interface PersistedStudyTask {
  id: string;
  planId: string;
  draftKey: string;
  knowledgePointId: string;
  knowledgePointName: string;
  actionType: PlannerActionType;
  priority: number;
  estimatedMinutes: number;
  reasonCodes: PlannerReasonCode[];
  sourceStatus: DiagnosisStatus;
  sourcePriorityScore: number;
  order: number;
  createdAt: string;
}

/** 已持久化的完整学习计划（plan + tasks 聚合）。 */
export interface PersistedStudyPlan {
  id: string;
  learnerId: string;
  courseId: string;
  status: PlanStatus;
  strategy: PlanStrategy;
  generatedAt: string;
  sourceDiagnosisGeneratedAt: string;
  reasonCodes: PlannerReasonCode[];
  createdAt: string;
  updatedAt: string;
  tasks: PersistedStudyTask[];
}

/** 已持久化计划的摘要（Plan History 列表项，不含 tasks）。 */
export interface PersistedStudyPlanSummary {
  id: string;
  learnerId: string;
  courseId: string;
  strategy: PlanStrategy;
  status: PlanStatus;
  generatedAt: string;
  createdAt: string;
  taskCount: number;
  reasonCodes: PlannerReasonCode[];
}
