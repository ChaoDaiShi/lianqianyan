import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Loader2,
  AlertTriangle,
  PlayCircle,
  Sparkles,
  CalendarClock,
  Layers,
  ListChecks,
  RotateCw,
  RefreshCw,
  History,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useCurrentPlan, usePlanHistory } from '@/lib/hooks';
import { DEMO_LEARNER_ID, DEMO_COURSE_ID, useWorkspaceStore } from '@/store';
import { ACTION_TYPE_LABEL, PLAN_STATUS_LABEL } from '@/domain';
import type { PersistedStudyTask } from '@/domain';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

const STRATEGY_LABEL: Record<string, string> = {
  diagnosis_driven: '诊断驱动',
};

/**
 * 我的学习 —— /#/my-learning（Phase 3-1 升级：Current Plan 正式语义）。
 *
 * 主区块展示**当前 ACTIVE 计划**（GET /api/plans/current）：计划生成时间 / 策略 /
 * 任务数量 + Task Timeline；无当前计划 → 「小涟还没有为你生成学习计划」+ 生成按钮
 * （用户显式点击才 POST /plans/generate）。
 *
 * 「重新规划」会显式 POST /plans/generate —— 后端在同一事务内把旧计划标记为
 * superseded，生成后新计划即唯一当前计划。
 *
 * 底部列出**历史计划**（含已 superseded 的计划，latest 在前），用于回溯
 * 学习路线的演变；历史计划不可再开始学习。
 */
export function MyLearningPage() {
  const navigate = useNavigate();
  const setContext = useWorkspaceStore((s) => s.setContext);
  const { summary, plan, loading, error, refetch, generate, generating } =
    useCurrentPlan(DEMO_LEARNER_ID, DEMO_COURSE_ID);
  const history = usePlanHistory(DEMO_LEARNER_ID, DEMO_COURSE_ID);

  const tasks = plan?.tasks ?? [];
  // 历史列表不重复展示当前计划（仅展示已被 superseded 的旧计划）
  const historyItems = (history.data ?? []).filter((item) => item.id !== plan?.id);

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

  return (
    <AppShell>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <GraduationCap className="h-4 w-4" />
          <span>我的学习</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 md:text-[26px]">
          我的学习计划
        </h1>
        <p className="mt-1.5 text-sm text-gray-500">
          小涟根据你的学习诊断生成的学习路线。
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-24 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>正在读取当前学习计划…</span>
        </div>
      )}

      {error && !summary && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-gray-100 bg-white p-8">
          <div className="flex items-center gap-2 text-gray-500">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span>暂时无法读取学习状态</span>
          </div>
          <Button variant="outline" onClick={refetch} className="gap-1.5">
            <RotateCw className="h-4 w-4" />
            重新加载
          </Button>
        </div>
      )}

      {/* 无当前计划态 */}
      {!loading && !error && !summary && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <Sparkles className="h-9 w-9 text-blue-400" />
          <p className="mt-4 text-base font-semibold text-gray-800">
            小涟还没有为你生成学习计划
          </p>
          <p className="mt-1 text-sm text-gray-500">
            点击下方按钮，小涟会结合你的学习诊断生成下一步学习路线。
          </p>
          <Button
            className="mt-5 gap-1.5"
            onClick={() => void generate()}
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                正在生成…
              </>
            ) : (
              '生成学习计划'
            )}
          </Button>
        </div>
      )}

      {/* 有当前计划态 */}
      {!loading && summary && (
        <div className="max-w-3xl space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <div>
                <p className="text-xs text-gray-400">计划生成时间</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                  <CalendarClock className="h-4 w-4 text-gray-400" />
                  {formatTime(plan?.generatedAt ?? summary.generatedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">计划策略</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                  <Layers className="h-4 w-4 text-gray-400" />
                  {STRATEGY_LABEL[summary.strategy] ?? summary.strategy}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">任务数量</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                  <ListChecks className="h-4 w-4 text-gray-400" />
                  {tasks.length} 项
                </p>
              </div>
              <div className="ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void generate()}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      正在规划…
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      重新规划
                    </>
                  )}
                </Button>
              </div>
            </div>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              当前计划 · 重新规划后会取代本计划
            </p>
          </div>

          {tasks.length > 0 ? (
            <div className="space-y-2">
              {tasks.map((task, index) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {task.knowledgePointName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {ACTION_TYPE_LABEL[task.actionType]} · {task.estimatedMinutes} min
                    </p>
                  </div>
                  <Button size="sm" className="shrink-0 gap-1" onClick={() => handleStartTask(task)}>
                    <PlayCircle className="h-3.5 w-3.5" />
                    开始学习
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-gray-100 bg-white p-4 text-sm text-gray-500">
              当前没有需要立即补强的知识点，可以继续推进新的学习内容。
            </p>
          )}

          {/* 历史计划 */}
          {historyItems.length > 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-600">历史计划</h2>
                <span className="text-xs text-gray-300">（已更新计划 · 不可再开始学习）</span>
              </div>
              <div className="mt-3 space-y-2">
                {historyItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-gray-50 bg-gray-50/40 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-600">
                        生成于 {formatTime(item.generatedAt)}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {item.taskCount} 项任务 · {STRATEGY_LABEL[item.strategy] ?? item.strategy}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium',
                        item.status === 'superseded'
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-blue-50 text-blue-700'
                      )}
                    >
                      {PLAN_STATUS_LABEL[item.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-gray-300">
            当前学习计划 · 重新规划后旧计划会被自动更新
          </p>
        </div>
      )}
    </AppShell>
  );
}
