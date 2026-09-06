import { ACTION_TYPE_LABEL } from '@/domain';
import type { DiagnosisResult, KnowledgePointDiagnosis, PersistedStudyPlan } from '@/domain';

/**
 * 学习闭环引导：把真实学习状态（当前路线 / 诊断聚焦点 / 证据覆盖）转成
 * 最多 3 条"下一步做什么"的行动建议。只陈述数据里存在的事实，
 * 排序 = 学习闭环顺序：继续路线 → 弄懂薄弱点 → 留下证据。
 */

export type NextStepActionKey = 'route' | 'understand' | 'assess';

export interface NextStepAction {
  key: NextStepActionKey;
  title: string;
  reason: string;
  to: string;
  cta: string;
}

function formatMastery(point: KnowledgePointDiagnosis): string {
  return `${Math.round(Math.min(1, Math.max(0, point.masteryScore)) * 100)}%`;
}

function focusAction(focus: KnowledgePointDiagnosis): NextStepAction {
  if (focus.status === 'weak') {
    return {
      key: 'understand',
      title: `先弄懂薄弱点「${focus.knowledgePointName}」`,
      reason: `当前掌握度 ${formatMastery(focus)}，是诊断给出的最优先干预点`,
      to: '/knowledge',
      cta: '看知识图谱',
    };
  }
  if (focus.status === 'unassessed' || focus.status === 'insufficient_evidence') {
    return {
      key: 'understand',
      title: `建立「${focus.knowledgePointName}」的第一层理解`,
      reason: '它还没有足够的评价证据，先学再看',
      to: '/knowledge',
      cta: '看知识图谱',
    };
  }
  return {
    key: 'understand',
    title: `继续巩固「${focus.knowledgePointName}」`,
    reason: `掌握度 ${formatMastery(focus)}，巩固后可以进入下一个点`,
    to: '/knowledge',
    cta: '看知识图谱',
  };
}

export function buildNextStepActions({
  plan,
  diagnosis,
}: {
  plan: PersistedStudyPlan | null;
  diagnosis: DiagnosisResult | null;
}): NextStepAction[] {
  const actions: NextStepAction[] = [];
  const tasks = [...(plan?.status === 'active' ? plan.tasks : [])].sort((a, b) => a.order - b.order);
  const nextTask = tasks[0] ?? null;

  if (nextTask) {
    actions.push({
      key: 'route',
      title: `继续学习路线：${nextTask.knowledgePointName}`,
      reason: `${ACTION_TYPE_LABEL[nextTask.actionType]} · 路线共 ${tasks.length} 步，按诊断优先级排序`,
      to: '/my-learning',
      cta: '去继续',
    });
  }

  const focus = diagnosis?.primaryFocus ?? null;
  if (focus && focus.knowledgePointId !== nextTask?.knowledgePointId) {
    actions.push(focusAction(focus));
  }

  const unassessedCount = diagnosis?.unassessedPoints.length ?? 0;
  if (unassessedCount > 0 || (focus && focus.evidenceCount === 0)) {
    actions.push({
      key: 'assess',
      title: '用一次章节自测留下学习证据',
      reason: unassessedCount > 0 ? `还有 ${unassessedCount} 个知识点未评估，自测结果会更新诊断与路线` : '自测结果会更新诊断与学习路线',
      to: '/exams',
      cta: '去做自测',
    });
  }

  if (actions.length === 0) {
    actions.push({
      key: 'route',
      title: '让小涟生成第一条学习路线',
      reason: '根据当前课程的真实诊断安排学习顺序',
      to: '/my-learning',
      cta: '去生成',
    });
  }

  return actions.slice(0, 3);
}
