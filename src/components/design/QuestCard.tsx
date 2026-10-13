import { Clock3, FileCheck2, Loader2, Play } from 'lucide-react';
import type { PersistedStudyTask } from '@/domain';
import { ACTION_TYPE_LABEL } from '@/domain';
import { DIAGNOSIS_STATUS_LABEL } from '@/domain';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DIFFICULTY: Record<string, string> = {
  assess: '水平诊断',
  learn: '概念研读',
  remediate: '薄弱点补强',
  strengthen: '巩固练习',
  advance: '迁移练习',
};

const REASON_LABEL: Record<PersistedStudyTask['reasonCodes'][number], string> = {
  PRIMARY_FOCUS: '首要关注',
  CONFIRMED_WEAKNESS: '已确认薄弱',
  NEEDS_ASSESSMENT: '需要评估',
  NEEDS_MORE_EVIDENCE: '需要更多证据',
  NEEDS_STRENGTHENING: '需要巩固',
  MAINTENANCE_REVIEW: '保持复习',
  NO_IMMEDIATE_INTERVENTION: '暂无紧急干预',
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
    <article className={cn('rounded-xl border bg-[var(--em-surface)] p-4', active ? 'border-[var(--em-primary)] shadow-[var(--em-shadow-sm)]' : 'border-[var(--em-border)]')}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-[var(--em-muted-ink)]">工单 {String(task.order ?? index + 1).padStart(2, '0')}</span>
            <h3 className="text-sm font-bold text-[var(--em-ink)]">{task.knowledgePointName}</h3>
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--em-muted-ink)]">
            <span className="rounded-lg bg-[var(--em-primary-subtle)] px-2 py-1 font-semibold text-[var(--em-primary)]">{DIFFICULTY[task.actionType] ?? ACTION_TYPE_LABEL[task.actionType]}</span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--em-surface-subtle)] px-2 py-1"><Clock3 className="h-3 w-3" />预计 {task.estimatedMinutes} 分钟</span>
            <span className="rounded-lg border border-[var(--em-border)] px-2 py-1">诊断状态：{DIAGNOSIS_STATUS_LABEL[task.sourceStatus]}</span>
          </p>
        </div>
        {onStart && (
          <Button size="sm" onClick={onStart} disabled={pending} className="shrink-0 gap-1 rounded-lg">
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {pending ? '正在打开' : '开始工单'}
          </Button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--em-border)] pt-3">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--em-muted-ink)]"><FileCheck2 className="h-3 w-3 text-[var(--em-primary)]" />计划依据</span>
        {task.reasonCodes.map((reason) => <span key={reason} className="rounded-lg border border-[var(--em-border)] bg-[var(--em-surface)] px-2 py-1 text-[10px] text-[var(--em-muted-ink)]">{REASON_LABEL[reason]}</span>)}
      </div>
    </article>
  );
}
