import type { EntityId, Timestamp } from './types';

/** 用户 —— 一名学习者。 */
export interface User {
  id: EntityId;
  /** 显示名称 */
  name: string;
  /** 头像 URL（可选） */
  avatarUrl?: string;
  /** 所属组织 / 班级（可选） */
  organization?: string;
  createdAt: Timestamp;
}

/** 课程 —— 学习的基本组织单元。 */
export interface Course {
  id: EntityId;
  /** 课程名称，如「软件设计师备考计划」 */
  name: string;
  description?: string;
  /** 课程内部知识点集合 */
  knowledgePointIds: EntityId[];
  createdAt: Timestamp;
}

/** 知识点 —— 最小可被诊断与衡量的学习单元。 */
export interface KnowledgePoint {
  id: EntityId;
  /** 知识点名称，如「进程同步与 PV 操作」 */
  name: string;
  /** 所属课程（可无） */
  courseId?: EntityId;
  /** 前置知识点（学习路径依赖） */
  prerequisites: EntityId[];
  /** 难度 1 - 5 */
  difficulty: number;
  /** 结构化学习内容（第一阶段可为摘要 / 占位） */
  content?: string;
  createdAt: Timestamp;
}
