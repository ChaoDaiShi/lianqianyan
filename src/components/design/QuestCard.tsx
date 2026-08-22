import { Clock3, Loader2, Play, Sparkles } from 'lucide-react';
import type { PersistedStudyTask } from '@/domain';
import { ACTION_TYPE_LABEL } from '@/domain';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DIFFICULTY: Record<string, string> = {
  assess: '探索',
  learn: '入门',
  remediate: '重点',
  strengthen: '进阶',
  advance: '挑战',
};

export interface QuestCardProps {
  task: PersistedStudyTask;
  index: number;
  active?: boolean;
  pending?: boolean;
  onStart?: () => void;
}

export function QuestCard({ task, index, active, pending, onStart }: QuestCardProps) {
  return (
    <article className={cn('group relative overflow-hidden rounded-[20px] border bg-white/65 p-4 transition duration-200', active ? 'border-primary-300 shadow-[0_15px_40px_rgba(139,124,246,0.16)]' : 'border-violet-100 hover:border-primary-200 hover:bg-white/80')}>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary-500 to-star text-sm font-bold text-white shadow-md">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-bold text-[var(--em-ink)]">{task.knowledgePointName}</h3>
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-primary-700">
              {DIFFICULTY[task.actionType] ?? '探索'}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-2 text-xs text-[var(--em-muted-ink)]">
            <span>{ACTION_TYPE_LABEL[task.actionType]}</span>
            <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{task.estimatedMinutes} 分钟</span>
          </p>
        </div>
        {onStart && (
          <Button size="sm" onClick={onStart} disabled={pending} className="shrink-0 gap-1 rounded-xl bg-primary-500 hover:bg-primary-600">
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {pending ? '进入中' : '开始'}
          </Button>
        )}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--em-muted-ink)]">
        <Sparkles className="h-3 w-3 text-companion" />
        完成后形成学习证据并更新状态
      </p>
    </article>
  );
}
