import { CalendarClock, FolderOpen, RotateCw, Sparkles } from 'lucide-react';
import { LearningIdentityCard } from '@/components/archive/LearningIdentityCard';
import { LearningStoryTimeline } from '@/components/archive/LearningStoryTimeline';
import { GlassPanel } from '@/components/design/GlassPanel';
import { LearningState } from '@/components/feedback/LearningState';
import { AppShell } from '@/components/layout/AppShell';
import { LearnerPortraitDashboard } from '@/components/profile/LearnerPortraitDashboard';
import { Button } from '@/components/ui/button';
import { MemoryCapsule } from '@/components/xiaolian/MemoryCapsule';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';
import { XiaolianMemoryCard } from '@/components/xiaolian/XiaolianMemoryCard';
import { ACTION_TYPE_LABEL } from '@/domain';
import {
  useCurrentPlan,
  useDiagnosis,
  useExamAnalytics,
  useLearnerProfile,
  useRecentEvidence,
} from '@/lib/hooks';
import { ACTIVE_COURSE_ID, ACTIVE_LEARNER_ID, useLearningLoopStore } from '@/store';

export function ArchivePage() {
  const profile = useLearnerProfile(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const diagnosis = useDiagnosis(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const analytics = useExamAnalytics(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const plan = useCurrentPlan(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const evidence = useRecentEvidence();
  const practiceEvaluationsByTask = useLearningLoopStore((state) => state.practiceEvaluations);
  const reflectionResultsByTask = useLearningLoopStore((state) => state.reflectionResults);

  const reloadAll = () => {
    void profile.refetch();
    void diagnosis.refetch();
    void analytics.refetch();
    void plan.refetch();
    void evidence.refetch();
  };
  const knowledgeNames = Object.fromEntries(
    (profile.data?.knowledgePoints ?? []).map((point) => [point.knowledgePointId, point.knowledgePointName])
  );
  const reflectionResults = Object.entries(reflectionResultsByTask)
    .filter(
      ([taskId, result]) =>
        result.taskId === taskId &&
        result.learnerId === ACTIVE_LEARNER_ID &&
        result.courseId === ACTIVE_COURSE_ID,
    )
    .map(([, result]) => result);

  return (
    <AppShell>
      <div className="space-y-6">
        <GlassPanel className="relative overflow-hidden p-6 sm:p-8">
          <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-pink-200/25 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold text-primary-700">
                <FolderOpen className="h-4 w-4" />
                GROWTH MEMORIES
              </p>
              <h1 className="mt-2 text-3xl font-bold">成长记忆</h1>
              <p className="mt-2 text-sm text-[var(--em-muted-ink)]">
                学习画像、诊断、当前计划和真实行为证据汇聚成你的成长轨迹。
              </p>
            </div>
            <div className="flex items-center gap-3">
              <XiaolianCharacter state="success" size="md" />
              {!profile.loading && (
                <Button variant="outline" size="sm" onClick={reloadAll} className="gap-2 rounded-xl">
                  <RotateCw className="h-3.5 w-3.5" />
                  刷新记忆
                </Button>
              )}
            </div>
          </div>
        </GlassPanel>

        {profile.loading && !profile.data && <LearningState kind="loading" title="正在读取学习画像" />}
        {profile.error && !profile.data && (
          <LearningState
            kind="error"
            title="暂时无法读取学习画像"
            action={
              <Button variant="outline" onClick={() => void profile.refetch()} className="gap-2">
                <RotateCw className="h-4 w-4" />
                重新加载
              </Button>
            }
          />
        )}

        {profile.data && (
          <>
            {diagnosis.loading && !diagnosis.data && <LearningState kind="loading" title="正在读取学习诊断" />}
            {diagnosis.error && !diagnosis.data && (
              <LearningState
                kind="error"
                title="学习诊断暂时无法读取"
                description="学习画像与其他成长记录仍可继续查看。"
                action={
                  <Button variant="outline" onClick={() => void diagnosis.refetch()} className="gap-2">
                    <RotateCw className="h-4 w-4" />
                    重新加载诊断
                  </Button>
                }
              />
            )}
            {diagnosis.data && <LearningIdentityCard profile={profile.data} diagnosis={diagnosis.data} />}
            {diagnosis.data && (
              <LearnerPortraitDashboard
                profile={profile.data}
                diagnosis={diagnosis.data}
                analytics={analytics.data}
                analyticsLoading={analytics.loading}
                analyticsError={analytics.error}
                onRetryAnalytics={() => void analytics.refetch()}
              />
            )}
            {diagnosis.data && (
              <div className="grid gap-6 lg:grid-cols-2">
                <XiaolianMemoryCard
                  profile={profile.data}
                  diagnosis={diagnosis.data}
                  evidence={evidence.data ?? []}
                  reflectionResults={reflectionResults}
                  learnerId={ACTIVE_LEARNER_ID}
                  courseId={ACTIVE_COURSE_ID}
                />
                <MemoryCapsule confirmedPreferences={[]} />
              </div>
            )}
          </>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <GlassPanel className="p-6">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary-500" />
              <h2 className="text-lg font-bold">当前星轨</h2>
            </div>
            <div className="mt-4 space-y-2">
              {plan.loading && !plan.plan && <p className="text-sm text-[var(--em-muted-ink)]">正在读取当前学习计划…</p>}
              {!plan.loading && plan.error && !plan.plan && (
                <div>
                  <p className="text-sm text-amber-700">当前学习计划暂时无法读取。</p>
                  <Button variant="outline" size="sm" onClick={() => void plan.refetch()} className="mt-3 gap-2">
                    <RotateCw className="h-3.5 w-3.5" />
                    重新加载计划
                  </Button>
                </div>
              )}
              {plan.plan?.tasks.length
                ? plan.plan.tasks.map((task, index) => (
                    <div key={task.id} className="flex items-center gap-3 rounded-[18px] bg-white/50 p-3">
                      <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-50 text-xs font-bold text-primary-700">
                        {index + 1}
                      </span>
                      <p className="min-w-0 flex-1 text-sm font-semibold">{task.knowledgePointName}</p>
                      <span className="text-xs text-[var(--em-muted-ink)]">
                        {ACTION_TYPE_LABEL[task.actionType]} · {task.estimatedMinutes}min
                      </span>
                    </div>
                  ))
                : !plan.loading && !plan.error && (
                    <p className="text-sm text-[var(--em-muted-ink)]">尚未生成学习计划。</p>
                  )}
            </div>
          </GlassPanel>

          <LearningStoryTimeline
            evidence={evidence.data ?? []}
            plan={plan.plan}
            practiceEvaluations={Object.values(practiceEvaluationsByTask)}
            knowledgeNames={knowledgeNames}
            learnerId={ACTIVE_LEARNER_ID}
            courseId={ACTIVE_COURSE_ID}
            loading={evidence.loading}
            error={evidence.error}
            onRetry={() => void evidence.refetch()}
          />
        </div>

        <p className="flex items-center gap-2 text-xs text-[var(--em-muted-ink)]">
          <Sparkles className="h-3.5 w-3.5 text-companion" />
          小涟的观察由真实学习画像、诊断、复述结果、当前计划与最近学习行为共同构成。
        </p>
      </div>
    </AppShell>
  );
}
