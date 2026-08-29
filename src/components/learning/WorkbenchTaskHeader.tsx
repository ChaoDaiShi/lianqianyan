import { ArrowLeft, CheckCircle2, CircleDot } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PersistedStudyPlan, PersistedStudyTask } from '@/domain';
import { ACTION_TYPE_LABEL } from '@/domain';
import { GlassPanel } from '@/components/design/GlassPanel';
import type { CompanionJourneyState } from './companionFlow';
import { cn } from '@/lib/utils';

interface WorkbenchTaskHeaderProps {
  plan: PersistedStudyPlan;
  task: PersistedStudyTask;
  state: CompanionJourneyState;
}

const STEPS = [
  { id: 'prepare', label: '准备' },
  { id: 'learning', label: '学习' },
  { id: 'thinking', label: '思考' },
  { id: 'practice', label: '练习' },
  { id: 'reflection', label: '复述' },
  { id: 'complete', label: '完成' },
] as const satisfies ReadonlyArray<{ id: CompanionJourneyState; label: string }>;

export function WorkbenchTaskHeader({ plan, task, state }: WorkbenchTaskHeaderProps) {
  const currentIndex = STEPS.findIndex((step) => step.id === state);

  return (
    <GlassPanel className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1 rounded-full border border-violet-200/70 px-3 py-1 text-xs font-semibold text-primary-700 transition hover:bg-violet-50/60"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回首页
        </Link>
        <h1 className="text-lg font-bold">{task.knowledgePointName}</h1>
        <span className="rounded-full border border-violet-100 bg-violet-50/70 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
          {ACTION_TYPE_LABEL[task.actionType]}
        </span>
        <span className="rounded-full border border-violet-100 bg-violet-50/70 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
          预计 {task.estimatedMinutes} 分钟
        </span>
        <span className="ml-auto rounded-full border border-primary-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-primary-700">
          任务 {task.order} / {plan.tasks.length}
        </span>
      </div>
      <ol className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {STEPS.map((step, index) => {
          const completed = state === 'complete' || index < currentIndex;
          const current = state !== 'complete' && index === currentIndex;
          return (
            <li key={step.id} className="flex items-center gap-1.5">
              <span
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
                  completed && 'border-emerald-200 bg-emerald-50/70 text-emerald-800',
                  current && 'border-primary-300 bg-violet-50 text-primary-800',
                  !completed && !current && 'border-slate-200 bg-slate-50/70 text-slate-500',
                )}
              >
                {completed || current ? (
                  completed ? (
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <CircleDot className="h-3.5 w-3.5" aria-hidden="true" />
                  )
                ) : null}
                {step.label}
              </span>
              {index < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-px w-3 shrink-0',
                    completed ? 'bg-emerald-300/80' : 'bg-violet-200/60',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-2.5 text-[11px] leading-4 text-[var(--em-muted-ink)]">
        阶段仅反映已观察到的学习互动，不表示掌握度或回答正确性；任务序号只表示计划中的位置。
      </p>
    </GlassPanel>
  );
}
