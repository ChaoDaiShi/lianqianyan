import { useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  LayoutGrid,
  Loader2,
  AlertTriangle,
  PlayCircle,
  Clock,
  TrendingUp,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { SpaceTutor } from '@/components/learning/SpaceTutor';
import { ModulePractice } from '@/components/learning/ModulePractice';
import { useCurrentPlan, useLearnerProfile, useDiagnosis } from '@/lib/hooks';
import {
  DEMO_LEARNER_ID,
  DEMO_COURSE_ID,
  useWorkspaceStore,
} from '@/store';
import { getLearningModule } from '@/content/learningContent';
import { ACTION_TYPE_LABEL, DIAGNOSIS_STATUS_LABEL } from '@/domain';
import type { PersistedStudyTask, KnowledgePointDiagnosis } from '@/domain';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function findKp(
  points: KnowledgePointDiagnosis[],
  kpId: string | null
): KnowledgePointDiagnosis | null {
  if (!kpId) return null;
  return points.find((p) => p.knowledgePointId === kpId) ?? null;
}

/**
 * 学习空间 —— /#/space（本轮从占位升级为完整学习空间，不另建 /learning-v2）。
 *
 * 布局（桌面端）：
 *   顶部：当前课程 / 当前任务 / 状态
 *   左侧 ~65%：学习内容区（Demo 教学讲解）
 *   右侧 ~35%：小涟学习助手（内嵌 Tutor）
 *   中下：快速练习 / 掌握度反馈
 *
 * 数据全部真实：Plan Task（来自 Latest Plan）+ Profile / Diagnosis（掌握度/状态）。
 */
export function LearningSpacePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskIdParam = searchParams.get('task_id');
  const kpParam = searchParams.get('kp');
  const planIdParam = searchParams.get('plan_id');

  const workspaceTaskId = useWorkspaceStore((s) => s.taskId);
  const workspaceKp = useWorkspaceStore((s) => s.knowledgePointId);

  const { plan, loading, error, refetch } = useCurrentPlan(
    DEMO_LEARNER_ID,
    DEMO_COURSE_ID
  );
  const profile = useLearnerProfile(DEMO_LEARNER_ID, DEMO_COURSE_ID);
  const diagnosis = useDiagnosis(DEMO_LEARNER_ID, DEMO_COURSE_ID);

  const tasks = plan?.tasks ?? [];

  const activeKpId =
    kpParam ?? workspaceKp ?? tasks[0]?.knowledgePointId ?? null;
  const activeTaskId = taskIdParam ?? workspaceTaskId ?? null;

  const currentTask: PersistedStudyTask | null = useMemo(() => {
    if (activeTaskId) {
      const byId = tasks.find((t) => t.id === activeTaskId);
      if (byId) return byId;
    }
    if (activeKpId) {
      return tasks.find((t) => t.knowledgePointId === activeKpId) ?? null;
    }
    return tasks[0] ?? null;
  }, [tasks, activeTaskId, activeKpId]);

  const kpDiagnosis = useMemo(
    () => findKp(profile.data?.knowledgePoints ?? [], currentTask?.knowledgePointId ?? null),
    [profile.data, currentTask]
  );

  const module = currentTask
    ? getLearningModule(currentTask.knowledgePointId)
    : null;

  const handleStartTask = (task: PersistedStudyTask) => {
    useWorkspaceStore.getState().setContext({
      planId: plan?.id ?? planIdParam,
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
          <LayoutGrid className="h-4 w-4" />
          <span>智能学习空间</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 md:text-[26px]">
          {currentTask ? '正在学习' : '选择学习任务'}
        </h1>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-24 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>正在加载学习计划…</span>
        </div>
      )}

      {error && !currentTask && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white py-16">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          <p className="text-sm text-gray-500">暂时无法读取学习计划</p>
          <Button variant="outline" onClick={refetch}>
            重新加载
          </Button>
        </div>
      )}

      {/* 无任务态：可选任务列表 */}
      {!loading && !error && !currentTask && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-blue-400" />
            <p className="mt-3 text-base font-semibold text-gray-800">
              请选择一个学习任务开始
            </p>
            <p className="mt-1 text-sm text-gray-500">
              从当前学习计划中选择任务，或返回首页选择。
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <Button asChild variant="outline">
                <Link to="/" className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" />
                  返回首页选择任务
                </Link>
              </Button>
            </div>
          </div>

          {tasks.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-gray-600">
                当前学习计划的任务
              </h2>
              <div className="space-y-2">
                {tasks.slice(0, 3).map((task, index) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {task.knowledgePointName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {ACTION_TYPE_LABEL[task.actionType]} · {task.estimatedMinutes} 分钟
                      </p>
                    </div>
                    <Button size="sm" className="gap-1" onClick={() => handleStartTask(task)}>
                      <PlayCircle className="h-3.5 w-3.5" />
                      开始学习
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 有任务态 */}
      {!loading && currentTask && (
        <div className="space-y-6">
          {/* 顶部状态条 */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <div>
                <p className="text-xs text-gray-400">当前正在学习</p>
                <p className="text-lg font-bold text-gray-900">
                  {currentTask.knowledgePointName}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">任务类型</p>
                <p className="text-sm font-semibold text-gray-800">
                  {ACTION_TYPE_LABEL[currentTask.actionType]}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">预计</p>
                <p className="flex items-center gap-1 text-sm font-semibold text-gray-800">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  {currentTask.estimatedMinutes} 分钟
                </p>
              </div>
              {kpDiagnosis ? (
                <>
                  <div>
                    <p className="text-xs text-gray-400">当前掌握度</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {Math.round(kpDiagnosis.masteryScore * 100)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">状态</p>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                        kpDiagnosis.status === 'weak'
                          ? 'bg-orange-50 text-orange-700'
                          : 'bg-blue-50 text-blue-700'
                      )}
                    >
                      {DIAGNOSIS_STATUS_LABEL[kpDiagnosis.status]}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-400">尚未评估</div>
              )}
            </div>
          </div>

          {/* 主内容区：左内容 / 右 Tutor */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* 左 ~65%：学习内容 */}
            <div className="lg:col-span-3 space-y-6">
              {module && (
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <h2 className="text-lg font-bold text-gray-900">{module.title}</h2>
                  <div className="mt-4 space-y-3">
                    {module.points.map((point, idx) => (
                      <div key={idx} className="flex gap-3">
                        <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-700">
                          {idx + 1}
                        </span>
                        <p className="text-sm leading-relaxed text-gray-700">{point}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 rounded-xl bg-blue-50/70 p-4">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-blue-700">
                      <TrendingUp className="h-4 w-4" />
                      关键理解
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
                      {module.keyInsight}
                    </p>
                  </div>
                </div>
              )}

              {/* 练习 + 掌握度反馈 */}
              {module && (
                <ModulePractice
                  knowledgePointName={currentTask.knowledgePointName}
                  questions={module.questions}
                  onPracticeComplete={() => {
                    profile.refetch();
                    diagnosis.refetch();
                  }}
                />
              )}
            </div>

            {/* 右 ~35%：小涟学习助手 */}
            <div className="lg:col-span-2">
              <SpaceTutor
                knowledgePointName={currentTask.knowledgePointName}
                quickQuestions={module?.quickQuestions}
              />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
