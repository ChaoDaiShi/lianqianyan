import { CheckCircle2, CircleDot, LockKeyhole } from 'lucide-react';
import { GlassPanel } from '@/components/design/GlassPanel';
import type {
  LearningStageItem,
  LearningStageStatus,
} from '@/components/learning/learningLoop';
import { cn } from '@/lib/utils';

export interface LearningStageProgressProps {
  stages: LearningStageItem[];
}

const STATUS_ICON = {
  completed: CheckCircle2,
  current: CircleDot,
  locked: LockKeyhole,
} satisfies Record<LearningStageStatus, typeof CheckCircle2>;

const STATUS_LABEL: Record<LearningStageStatus, string> = {
  completed: '已观察',
  current: '当前阶段',
  locked: '等待前序互动',
};

export function LearningStageProgress({
  stages,
}: LearningStageProgressProps) {
  return (
    <GlassPanel className="p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-primary-700">学习环节</p>
          <h2 className="mt-1 text-lg font-bold">当前学习循环</h2>
        </div>
        <p className="max-w-xl text-xs leading-5 text-[var(--em-muted-ink)]">
          阶段仅反映已观察到的学习互动，不代表掌握度或回答正确性。
        </p>
      </div>
      <ol className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stages.map((stage) => {
          const Icon = STATUS_ICON[stage.status];
          return (
            <li
              key={stage.id}
              aria-current={stage.status === 'current' ? 'step' : undefined}
              className={cn(
                'min-w-0 rounded-lg border px-3 py-3',
                stage.status === 'completed' &&
                  'border-emerald-200 bg-emerald-50/70 text-emerald-800',
                stage.status === 'current' &&
                  'border-primary-300 bg-violet-50 text-primary-800',
                stage.status === 'locked' &&
                  'border-slate-200 bg-slate-50/70 text-slate-500',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <strong className="mt-2 block text-sm">{stage.label}</strong>
              <span className="mt-1 block text-[10px] leading-4">
                {STATUS_LABEL[stage.status]}
              </span>
            </li>
          );
        })}
      </ol>
    </GlassPanel>
  );
}
