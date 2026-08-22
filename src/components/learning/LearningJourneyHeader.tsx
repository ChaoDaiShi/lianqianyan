import { Clock3, Flag, ListOrdered, Target } from 'lucide-react';
import type { PersistedStudyPlan, PersistedStudyTask } from '@/domain';
import { ACTION_TYPE_LABEL } from '@/domain';
import { GlassPanel } from '@/components/design/GlassPanel';
import { XiaolianMessage } from '@/components/xiaolian/XiaolianMessage';

interface LearningJourneyHeaderProps {
  plan: PersistedStudyPlan;
  currentTask: PersistedStudyTask;
}

export function LearningJourneyHeader({ plan, currentTask }: LearningJourneyHeaderProps) {
  return <GlassPanel className="overflow-hidden p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-primary-600"><Flag className="h-3.5 w-3.5" />CURRENT LEARNING JOURNEY</p><h1 className="mt-2 text-3xl font-bold">{currentTask.knowledgePointName}</h1><p className="mt-2 text-sm text-[var(--em-muted-ink)]">当前任务来自正在生效的学习计划，不使用前端虚构进度。</p></div><span className="rounded-full border border-primary-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-primary-700">任务 {currentTask.order} / {plan.tasks.length}</span></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-[18px] border border-violet-100 bg-white/50 p-4"><p className="flex items-center gap-2 text-xs text-[var(--em-muted-ink)]"><Target className="h-3.5 w-3.5" />当前知识点</p><strong className="mt-1 block text-sm">{currentTask.knowledgePointName}</strong></div><div className="rounded-[18px] border border-violet-100 bg-white/50 p-4"><p className="flex items-center gap-2 text-xs text-[var(--em-muted-ink)]"><ListOrdered className="h-3.5 w-3.5" />任务类型</p><strong className="mt-1 block text-sm">{ACTION_TYPE_LABEL[currentTask.actionType]}</strong></div><div className="rounded-[18px] border border-violet-100 bg-white/50 p-4"><p className="flex items-center gap-2 text-xs text-[var(--em-muted-ink)]"><Clock3 className="h-3.5 w-3.5" />预计时间</p><strong className="mt-1 block text-sm">{currentTask.estimatedMinutes} 分钟</strong></div></div>
    <XiaolianMessage tone="encourage" compact className="mt-4">我们先专注当前知识点。任务序号只表示 Current Plan 中的位置，不代表完成百分比。</XiaolianMessage>
  </GlassPanel>;
}
