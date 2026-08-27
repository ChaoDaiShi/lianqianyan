import {
  AlertTriangle,
  ArrowRight,
  Circle,
  Loader2,
  Route,
  Sparkles,
} from 'lucide-react';
import { ACTION_TYPE_LABEL, type PersistedStudyPlan } from '@/domain';
import { buildTodaysJourney } from '@/components/learning/companionFlow';
import { GlassPanel } from '@/components/design/GlassPanel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TodaysJourneyProps {
  plan: PersistedStudyPlan | null;
  currentTaskId: string | null;
  loading: boolean;
  error: boolean;
  generating: boolean;
  starting: boolean;
  startError?: string | null;
  onGenerate: () => void;
  onPrepare: () => void;
  onRetry: () => void;
}

export function TodaysJourney({
  plan,
  currentTaskId,
  loading,
  error,
  generating,
  starting,
  startError,
  onGenerate,
  onPrepare,
  onRetry,
}: TodaysJourneyProps) {
  const journey = buildTodaysJourney(plan, currentTaskId);
  const currentTask =
    journey?.tasks.find((item) => item.state === 'current')?.task ?? null;

  return (
    <GlassPanel className="overflow-hidden p-5 sm:p-7">
      <div className="flex items-center gap-2">
        <Route className="h-4 w-4 text-primary-600" />
        <p className="text-xs font-bold text-primary-700">TODAY&apos;S JOURNEY</p>
      </div>
      <h2 className="mt-2 text-2xl font-bold">今天，和小涟一起完成真实学习任务</h2>
      <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">
        这里直接展示 CurrentPlan 中已有的任务，不创建新的任务系统。
      </p>

      {loading ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-[var(--em-muted-ink)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在同步当前学习计划…
        </p>
      ) : error ? (
        <div className="mt-5">
          <p className="flex items-center gap-2 text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            当前计划暂时没有加载成功
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={onRetry}
          >
            重新加载
          </Button>
        </div>
      ) : journey && journey.tasks.length > 0 ? (
        <>
          <ol className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {journey.tasks.map(({ task, state }) => (
              <li
                key={task.id}
                className={cn(
                  'rounded-lg border p-4',
                  state === 'current'
                    ? 'border-primary-300 bg-violet-50/70'
                    : 'border-violet-100 bg-white/55',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold text-primary-700">
                    任务 {task.order}
                  </span>
                  {state === 'current' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary-700">
                      <Sparkles className="h-3 w-3" />
                      今日入口
                    </span>
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-slate-300" />
                  )}
                </div>
                <strong className="mt-2 block text-sm">
                  {task.knowledgePointName}
                </strong>
                <p className="mt-1 text-xs text-[var(--em-muted-ink)]">
                  {ACTION_TYPE_LABEL[task.actionType]} · {task.estimatedMinutes}{' '}
                  分钟
                </p>
              </li>
            ))}
          </ol>
          {currentTask ? (
            <Button
              className="mt-5 gap-2 bg-primary-500 hover:bg-primary-600"
              disabled={starting}
              onClick={onPrepare}
            >
              {starting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {starting ? '正在进入学习…' : '和小涟一起准备'}
            </Button>
          ) : null}
        </>
      ) : (
        <div className="mt-5 rounded-lg border border-dashed border-violet-200 bg-white/45 p-7 text-center">
          <Sparkles className="mx-auto h-7 w-7 text-primary-400" />
          <p className="mt-3 text-sm font-semibold">选择学习目标</p>
          <p className="mt-1 text-xs text-[var(--em-muted-ink)]">
            当前没有默认学习进度。只有你主动选择后，才会基于诊断生成真实计划。
          </p>
          <Button
            className="mt-4 bg-primary-500"
            onClick={onGenerate}
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                正在生成…
              </>
            ) : (
              '请小涟生成诊断计划'
            )}
          </Button>
        </div>
      )}

      {startError ? (
        <p className="mt-3 text-sm text-amber-700">{startError}</p>
      ) : null}
    </GlassPanel>
  );
}
