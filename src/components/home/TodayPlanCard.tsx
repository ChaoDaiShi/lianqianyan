import { CalendarClock, Loader2, AlertTriangle, RotateCw, PlayCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCurrentPlan } from '@/lib/hooks';
import { useWorkspaceStore, DEMO_LEARNER_ID, DEMO_COURSE_ID } from '@/store';
import { ACTION_TYPE_LABEL } from '@/domain';
import type { PersistedStudyTask } from '@/domain';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * 今日学习计划卡 —— 展示**当前 ACTIVE 计划**（Phase 3-1 正式语义）。
 *
 * 数据来源 GET /api/plans/current（唯一 ACTIVE Plan + Tasks），展示 Top 3；
 * 无当前计划 → 「还没有生成学习计划」+ 生成按钮（用户显式点击才 POST
 * /plans/generate，GET 页面绝不自动制造数据库副作用；生成后旧计划自动 supersede）。
 */
export function TodayPlanCard() {
  const navigate = useNavigate();
  const setContext = useWorkspaceStore((s) => s.setContext);
  const { summary, plan, loading, error, refetch, generate, generating } =
    useCurrentPlan(DEMO_LEARNER_ID, DEMO_COURSE_ID);

  const tasks = plan?.tasks ?? [];

  const handleStartTask = (task: PersistedStudyTask) => {
    setContext({
      planId: plan?.id ?? null,
      taskId: task.id,
      knowledgePointId: task.knowledgePointId,
    });
    navigate(
      `/space?plan_id=${encodeURIComponent(plan?.id ?? '')}&task_id=${encodeURIComponent(
        task.id
      )}&kp=${encodeURIComponent(task.knowledgePointId)}`
    );
  };

  const handleGenerate = async () => {
    const created = await generate();
    if (created && created.tasks.length > 0) {
      const first = created.tasks[0];
      setContext({
        planId: created.id,
        taskId: first.id,
        knowledgePointId: first.knowledgePointId,
      });
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">今日学习计划</h2>
        </div>
        {summary && (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
            当前计划
          </span>
        )}
      </div>

      {loading && (
        <div className="mt-4 flex items-center gap-2 py-6 text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">正在读取今日学习计划…</span>
        </div>
      )}

      {error && (
        <div className="mt-4 flex flex-col items-start gap-3 py-4">
          <div className="flex items-center gap-2 text-gray-500">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm">暂时无法读取学习计划</span>
          </div>
          <Button variant="outline" size="sm" onClick={refetch} className="gap-1.5">
            <RotateCw className="h-3.5 w-3.5" />
            重新加载
          </Button>
        </div>
      )}

      {/* 无计划态 */}
      {!loading && !error && !summary && (
        <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center">
          <p className="text-sm text-gray-500">还没有生成学习计划</p>
          <p className="mt-1 text-xs text-gray-400">
            小涟会根据你的学习诊断，为你生成下一步学习路线。
          </p>
          <Button
            className="mt-4 gap-1.5"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                正在生成…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                生成学习计划
              </>
            )}
          </Button>
        </div>
      )}

      {/* 有任务态：Top 3 */}
      {!loading && !error && summary && tasks.length > 0 && (
        <div className="mt-4 space-y-3">
          {summary && (
            <p className="text-xs text-gray-400">
              生成于 {formatTime(plan?.generatedAt ?? summary.generatedAt)} ·{' '}
              {tasks.length} 项学习任务
            </p>
          )}
          <div className="space-y-2">
            {tasks.slice(0, 3).map((task, index) => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/30"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {task.knowledgePointName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {ACTION_TYPE_LABEL[task.actionType]} · {task.estimatedMinutes} 分钟
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1"
                  onClick={() => handleStartTask(task)}
                >
                  <PlayCircle className="h-3.5 w-3.5" />
                  开始学习
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 有 summary 但空任务（Empty Plan：NO_IMMEDIATE_INTERVENTION） */}
      {!loading && !error && summary && tasks.length === 0 && (
        <p className="mt-4 text-sm text-gray-500">
          当前没有需要立即补强的知识点，可以继续推进新的学习内容。
        </p>
      )}

      <p className={cn('mt-4 text-[11px] text-gray-300')}>
        当前学习计划 · 重新规划后旧计划会被自动更新
      </p>
    </div>
  );
}
