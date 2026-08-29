import { FolderOpen, RotateCw, Sparkles } from 'lucide-react';
import { LearningStoryTimeline } from '@/components/archive/LearningStoryTimeline';
import { LearningState } from '@/components/feedback/LearningState';
import { AppShell } from '@/components/layout/AppShell';
import { LearnerPortraitDashboard } from '@/components/profile/LearnerPortraitDashboard';
import { Button } from '@/components/ui/button';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';
import { XiaolianMemoryCard } from '@/components/xiaolian/XiaolianMemoryCard';
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
    (profile.data?.knowledgePoints ?? []).map((point) => [point.knowledgePointId, point.knowledgePointName]),
  );
  const reflectionResults = Object.entries(reflectionResultsByTask)
    .filter(
      ([taskId, result]) =>
        result.taskId === taskId &&
        result.learnerId === ACTIVE_LEARNER_ID &&
        result.courseId === ACTIVE_COURSE_ID &&
        Object.prototype.hasOwnProperty.call(knowledgeNames, result.knowledgePointId),
    )
    .map(([, result]) => result);

  return (
    <AppShell scene="storybook">
      <div className="space-y-6">
        <header className="flex flex-col gap-4 px-1 sm:flex-row sm:items-end sm:justify-between sm:px-2">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-primary-700"><FolderOpen className="h-4 w-4" />GROWTH MEMORIES</p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">成长不是一组指标，而是一段有出处的故事</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--em-muted-ink)]">按时间回看已经发生的学习、练习与复述；计划只作为路线背景，不会被写成完成记录。</p>
          </div>
          <Button variant="ghost" size="sm" onClick={reloadAll} className="w-fit gap-2 rounded-full text-primary-700"><RotateCw className="h-3.5 w-3.5" />刷新记录</Button>
        </header>

        {plan.loading && !plan.plan ? <p className="border-l-2 border-violet-200 py-1 pl-3 text-xs text-[var(--em-muted-ink)]">正在读取当前学习计划；已发生的成长故事仍可先查看。</p> : null}

        {profile.loading && !profile.data ? <LearningState kind="loading" title="正在读取学习记录" /> : null}
        {profile.error && !profile.data ? <LearningState kind="error" title="暂时无法读取学习画像" description="已有学习证据仍会按真实来源呈现。" action={<Button variant="outline" onClick={() => void profile.refetch()} className="gap-2"><RotateCw className="h-4 w-4" />重新加载</Button>} /> : null}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <LearningStoryTimeline
            evidence={evidence.data ?? []}
            plan={plan.plan}
            practiceEvaluations={Object.values(practiceEvaluationsByTask)}
            reflectionResults={reflectionResults}
            knowledgeNames={knowledgeNames}
            learnerId={ACTIVE_LEARNER_ID}
            courseId={ACTIVE_COURSE_ID}
            loading={evidence.loading}
            error={evidence.error}
            onRetry={() => void evidence.refetch()}
          />

          <aside className="rounded-[2.25rem] border border-white/80 bg-white/46 p-5 sm:p-6 xl:sticky xl:top-24" aria-label="小涟的成长观察">
            <XiaolianCharacter state="success" size="md" />
            {profile.data && diagnosis.data ? <XiaolianMemoryCard profile={profile.data} diagnosis={diagnosis.data} evidence={evidence.data ?? []} reflectionResults={reflectionResults} learnerId={ACTIVE_LEARNER_ID} courseId={ACTIVE_COURSE_ID} /> : <div className="mt-4 border-l-2 border-violet-200 pl-4"><p className="text-sm font-semibold">小涟还在等待足够的真实记录</p><p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">当前不会根据空白状态生成成长结论。</p></div>}
          </aside>
        </div>

        {profile.data && diagnosis.data && profile.data.assessedCount > 0 ? <details className="rounded-[2rem] border border-violet-100/80 bg-white/44 p-4 sm:p-5">
          <summary className="cursor-pointer text-sm font-semibold text-primary-700">展开证据驱动学习画像</summary>
          <div className="mt-5"><LearnerPortraitDashboard profile={profile.data} diagnosis={diagnosis.data} analytics={analytics.data} analyticsLoading={analytics.loading} analyticsError={analytics.error} onRetryAnalytics={() => void analytics.refetch()} /></div>
        </details> : null}

        <p className="flex items-start gap-2 px-1 text-xs leading-5 text-[var(--em-muted-ink)]"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-companion" />复述内容仅来自当前浏览器保存的本地复述记录；跨设备同步前，不把它描述为云端长期记忆。</p>
      </div>
    </AppShell>
  );
}
