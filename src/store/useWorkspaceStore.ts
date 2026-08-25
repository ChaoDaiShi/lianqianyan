import { create } from 'zustand';

/**
 * 学习工作区上下文 Store。
 *
 * 保存「当前正在学习哪个知识点 / 哪个计划 / 哪个任务」，供：
 * - 首页「开始学习」 → /space 携带任务上下文；
 * - /space 顶部展示「当前正在学习」；
 * - 小涟嵌入式助手初始化引导。
 *
 * 通过两个入口设置：
 * 1. setContext(plan_id, task_id, knowledge_point_id) —— 从 Plan 任务「开始学习」进入；
 * 2. 无任务直接进入 /space 时保持置空（页面回退展示最近计划任务列表）。
 */

interface WorkspaceContext {
  planId: string | null;
  taskId: string | null;
  knowledgePointId: string | null;
}

interface WorkspaceState extends WorkspaceContext {
  setContext: (ctx: WorkspaceContext) => void;
  clearContext: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  planId: null,
  taskId: null,
  knowledgePointId: null,
  setContext: (ctx) =>
    set({
      planId: ctx.planId ?? null,
      taskId: ctx.taskId ?? null,
      knowledgePointId: ctx.knowledgePointId ?? null,
    }),
  clearContext: () =>
    set({ planId: null, taskId: null, knowledgePointId: null }),
}));
