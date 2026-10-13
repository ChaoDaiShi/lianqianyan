import { Check, CircleDashed, Loader2, SkipForward, X } from 'lucide-react';

export type ProgressStageStatus = 'pending' | 'running' | 'done' | 'skipped' | 'failed';

export interface ProgressStage {
  key: string;
  label: string;
  status: ProgressStageStatus;
  note?: string;
}

const STATUS_ICON = {
  pending: <CircleDashed className="h-3.5 w-3.5 text-[var(--em-subtle-ink)]" />,
  running: <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--em-primary)]" />,
  done: <Check className="h-3.5 w-3.5 text-[var(--em-success)]" />,
  skipped: <SkipForward className="h-3.5 w-3.5 text-[var(--em-warning)]" />,
  failed: <X className="h-3.5 w-3.5 text-[var(--em-danger)]" />,
} as const;

/** 生成流水线进度：由真实阶段状态驱动，不做虚假平滑动画。 */
export function GenerationProgress({ stages }: { stages: ProgressStage[] }) {
  const finished = stages.filter((stage) => stage.status === 'done' || stage.status === 'skipped').length;
  const percent = stages.length === 0 ? 0 : Math.round((finished / stages.length) * 100);
  const failed = stages.some((stage) => stage.status === 'failed');
  return (
    <div aria-label="生成进度" className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4">
      <div className="flex items-center justify-between text-xs font-semibold text-[var(--em-muted-ink)]">
        <span>{failed ? '生成中断' : finished === stages.length ? '生成完成' : '正在生成…'}</span>
        <span>{percent}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--em-primary-subtle)]">
        <div
          className={`h-full rounded-full transition-all duration-150 ${failed ? 'bg-[var(--em-danger)]' : 'bg-[var(--em-action)]'}`}
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <ul className="mt-3 space-y-1.5">
        {stages.map((stage) => (
          <li key={stage.key} className="flex items-center gap-2 text-xs">
            {STATUS_ICON[stage.status]}
            <span className={stage.status === 'pending' ? 'text-[var(--em-muted-ink)]' : 'text-[var(--em-ink)]'}>{stage.label}</span>
            {stage.note ? <span className="truncate text-[10px] text-[var(--em-muted-ink)]">{stage.note}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
