import { ArrowRight, CheckCircle2, Loader2, Route } from 'lucide-react';
import type { PersistedStudyTask } from '@/domain';
import { ACTION_TYPE_LABEL } from '@/domain';
import type { ReflectionResult } from './learningLoop';
import { GlassPanel } from '@/components/design/GlassPanel';
import { Button } from '@/components/ui/button';

export interface ReflectionNextStepCardProps {
  result: ReflectionResult;
  nextTask: PersistedStudyTask | null;
  starting: boolean;
  onPrepareNext: () => void;
}

export function ReflectionNextStepCard({
  result,
  nextTask,
  starting,
  onPrepareNext,
}: ReflectionNextStepCardProps) {
  return (
    <GlassPanel className="border border-violet-100 p-6 sm:p-7">
      <div className="flex items-center gap-2 text-xs font-semibold text-primary-700">
        <Route className="h-4 w-4" />
        小涟下一步引导
      </div>
      <h2 className="mt-2 text-xl font-bold">把这次复述接回当前计划</h2>
      <p className="mt-3 text-sm leading-7 text-[var(--em-muted-ink)]">
        {result.nextSuggestion}
      </p>

      {nextTask ? (
        <div className="mt-5 flex flex-col gap-4 rounded-lg border border-violet-100 bg-white/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-primary-700">
              当前计划下一任务
            </p>
            <strong className="mt-1 block">{nextTask.knowledgePointName}</strong>
            <p className="mt-1 text-xs text-[var(--em-muted-ink)]">
              {ACTION_TYPE_LABEL[nextTask.actionType]} · 预计{' '}
              {nextTask.estimatedMinutes} 分钟
            </p>
          </div>
          <Button
            onClick={onPrepareNext}
            disabled={starting}
            className="shrink-0 gap-2 bg-primary-500 hover:bg-primary-600"
          >
            {starting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            {starting ? '正在进入学习…' : '继续下一任务'}
          </Button>
        </div>
      ) : (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm leading-6 text-emerald-900">
            当前计划已经没有下一项真实任务。这里不会自动新增任务。
          </p>
        </div>
      )}
    </GlassPanel>
  );
}
