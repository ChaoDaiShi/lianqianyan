import { AlertTriangle, Check, Circle, Loader2, Route } from 'lucide-react';
import type {
  DiagnosisResult,
  PersistedStudyPlan,
  PersistedStudyTask,
} from '@/domain';
import type { LearningEvidence } from '@/lib/educationApi';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { buildHomeJourney } from './homePresentation';

export interface TodaysJourneyProps {
  diagnosis: DiagnosisResult | null;
  plan: PersistedStudyPlan | null;
  currentTask: PersistedStudyTask | null;
  evidence: LearningEvidence[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

export function TodaysJourney({ diagnosis, plan, currentTask, evidence, loading, error, onRetry }: TodaysJourneyProps) {
  const journey = buildHomeJourney({ diagnosis, plan, task: currentTask, evidence });
  const current = journey.find((node) => node.state === 'current');
  const introduction = !diagnosis
    ? '今天从第一次诊断开始。'
    : currentTask
      ? `今天围绕「${currentTask.knowledgePointName}」完成一次学习闭环。`
      : '诊断已经完成，下一步是生成学习计划。';

  return (
    <section className="rounded-[2rem] border border-violet-100/80 bg-white/55 px-5 py-6 sm:px-8 sm:py-8">
      <div className="flex items-center gap-2 text-primary-700">
        <Route className="h-4 w-4" />
        <p className="text-xs font-bold tracking-[0.14em]">TODAY&apos;S JOURNEY</p>
      </div>
      <div className="mt-2 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-[-0.025em]">今天的学习路径</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--em-muted-ink)]">{introduction}</p>
        </div>
        {current ? <p className="text-xs text-[var(--em-muted-ink)]">当前停留：{current.label}</p> : null}
      </div>

      <div className="mt-5 flex flex-col gap-2 border-y border-violet-100/70 py-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--em-muted-ink)]">学习计划</span>
          <strong className="font-semibold text-[var(--em-ink)]">{plan ? `${plan.tasks.length} 个步骤` : '尚未安排'}</strong>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--em-muted-ink)]">学习证据</span>
          <strong className="font-semibold text-[var(--em-ink)]">{evidence.length ? `${evidence.length} 条` : '--'}</strong>
        </div>
      </div>

      {loading ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-[var(--em-muted-ink)]"><Loader2 className="h-4 w-4 animate-spin" />正在同步真实学习进度…</p>
      ) : error ? (
        <div className="mt-7">
          <p className="flex items-center gap-2 text-sm text-amber-700"><AlertTriangle className="h-4 w-4" />学习路径暂时没有加载成功</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>重新加载</Button>
        </div>
      ) : (
        <ol className="relative mt-8 grid gap-5 sm:grid-cols-4 sm:gap-0">
          <span aria-hidden="true" className="absolute left-6 top-6 hidden h-px w-[calc(100%-3rem)] bg-violet-200 sm:block" />
          {journey.map((node, index) => (
            <li key={node.id} data-journey-node={node.id} data-journey-state={node.state} className="relative flex gap-4 sm:block sm:px-3 sm:text-center">
              <span className={cn('relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full border bg-[var(--em-surface)] text-sm font-bold transition-colors sm:mx-auto', node.state === 'completed' && 'border-primary-500 bg-primary-600 text-white', node.state === 'current' && 'border-primary-400 text-primary-700 shadow-[0_0_0_7px_rgba(139,114,219,0.12)]', node.state === 'waiting' && 'border-violet-100 text-slate-400')}>
                {node.state === 'completed' ? <Check className="h-4 w-4" /> : node.state === 'current' ? <Circle className="h-3.5 w-3.5 fill-current" /> : index + 1}
              </span>
              <div className="pt-1 sm:pt-4">
                <strong className={cn('text-sm', node.state === 'waiting' && 'text-slate-400')}>{node.label}</strong>
                <p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">{node.description}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
