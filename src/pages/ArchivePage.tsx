import { FolderOpen, RotateCw } from 'lucide-react';
import { LearningStoryTimeline } from '@/components/archive/LearningStoryTimeline';
import { EvidenceLedger } from '@/components/archive/EvidenceLedger';
import { ArchiveDossierExport } from '@/components/archive/ArchiveDossierExport';
import { buildEvidenceLedger } from '@/components/archive/ledgerPresentation';
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
import { LeapArchivePanel } from '@/components/adaptive/LeapArchivePanel';

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
  const ledgerRows = buildEvidenceLedger({
    evidence: evidence.data ?? [],
    practiceEvaluations: Object.values(practiceEvaluationsByTask),
    reflectionResults,
    knowledgeNames,
    learnerId: ACTIVE_LEARNER_ID,
    courseId: ACTIVE_COURSE_ID,
  });
  const answeredQuestionCount = analytics.data?.knowledgePoints.reduce(
    (total, item) => total + item.answeredCount,
    0,
  );
  const dossierSnapshot = {
    learnerId: ACTIVE_LEARNER_ID,
    courseId: ACTIVE_COURSE_ID,
    courseName: profile.data?.courseName,
    overview: {
      answeredQuestionCount,
      submittedExamCount: analytics.data?.submittedCount,
      overallMastery: profile.data && !profile.data.insufficientData
        ? profile.data.overallMastery ?? undefined
        : undefined,
      assessedKnowledgePoints: profile.data?.assessedCount,
    },
    evidence: ledgerRows,
  };

  return (
    <AppShell scene="storybook">
      <div className="space-y-6">
        <header className="flex flex-col gap-4 px-1 sm:flex-row sm:items-end sm:justify-between sm:px-2">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-[var(--em-primary-deep)]"><FolderOpen className="h-4 w-4" />GROWTH MEMORIES</p>
            <h1 className="mt-1 text-2xl font-bold tracking-[-0.025em] sm:text-3xl">成长不是一组指标，而是一段有出处的故事</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--em-muted-ink)]">按时间回看已经发生的学习、练习与复述；计划只作为路线背景，不会被写成完成记录。</p>
          </div>
          <Button variant="ghost" size="sm" onClick={reloadAll} className="w-fit gap-2 rounded-full text-[var(--em-primary-deep)]"><RotateCw className="h-3.5 w-3.5" />刷新记录</Button>
        </header>

        {plan.loading && !plan.plan ? <p className="border-l-2 border-[var(--em-border)] py-1 pl-3 text-xs text-[var(--em-muted-ink)]">正在读取当前学习计划；已发生的成长故事仍可先查看。</p> : null}

        {profile.loading && !profile.data ? <LearningState kind="loading" title="正在读取学习记录" /> : null}
        {profile.error && !profile.data ? <LearningState kind="error" title="暂时无法读取学习画像" description="已有学习证据仍会按真实来源呈现。" action={<Button variant="outline" onClick={() => void profile.refetch()} className="gap-2"><RotateCw className="h-4 w-4" />重新加载</Button>} /> : null}

        <section className="grid gap-3 sm:grid-cols-3" aria-label="学习概览">
          <article className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4"><p className="text-xs text-[var(--em-muted-ink)]">累计作答题次</p><p className="mt-2 text-2xl font-bold">{answeredQuestionCount ?? '暂无统计'}</p><p className="mt-1 text-[10px] text-[var(--em-muted-ink)]">按后端测评分析中的知识点答题次数合计</p></article>
          <article className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4"><p className="text-xs text-[var(--em-muted-ink)]">当前整体掌握度</p><p className="mt-2 text-2xl font-bold">{profile.data && !profile.data.insufficientData && profile.data.overallMastery !== null ? `${Math.round(profile.data.overallMastery * 100)}%` : '数据不足'}</p><p className="mt-1 text-[10px] text-[var(--em-muted-ink)]">来自当前课程 learner profile；无历史曲线接口</p></article>
          <article className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4"><p className="text-xs text-[var(--em-muted-ink)]">已提交测评</p><p className="mt-2 text-2xl font-bold">{analytics.data?.submittedCount ?? '暂无统计'}</p><p className="mt-1 text-[10px] text-[var(--em-muted-ink)]">LEAP 前测、教学和后测记录见下方实验档案</p></article>
        </section>

        <EvidenceLedger
          rows={ledgerRows}
          loading={evidence.loading}
          error={evidence.error}
          onRetry={() => void evidence.refetch()}
        />

        <details className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--em-primary-deep)]">查看学习旅程叙事与计划上下文</summary>
          <div className="mt-4">
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
          </div>
        </details>

        <LeapArchivePanel learnerId={ACTIVE_LEARNER_ID} courseId={ACTIVE_COURSE_ID} />

        <details className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4 sm:p-5">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--em-primary-deep)]">展开学习画像与小涟记忆观察</summary>
          <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
            {profile.data && diagnosis.data && profile.data.assessedCount > 0 ? <LearnerPortraitDashboard profile={profile.data} diagnosis={diagnosis.data} analytics={analytics.data} analyticsLoading={analytics.loading} analyticsError={analytics.error} onRetryAnalytics={() => void analytics.refetch()} /> : <p className="text-sm text-[var(--em-muted-ink)]">当前没有足够的真实画像记录可供展开。</p>}
            <aside className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface-subtle)] p-4" aria-label="小涟的成长观察">
              <XiaolianCharacter state="success" size="md" />
              {profile.data && diagnosis.data ? <XiaolianMemoryCard profile={profile.data} diagnosis={diagnosis.data} evidence={evidence.data ?? []} reflectionResults={reflectionResults} learnerId={ACTIVE_LEARNER_ID} courseId={ACTIVE_COURSE_ID} /> : <div className="mt-4 border-l-2 border-[var(--em-border)] pl-4"><p className="text-sm font-semibold">小涟还在等待足够的真实记录</p><p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">当前不会根据空白状态生成成长结论。</p></div>}
            </aside>
          </div>
          <p className="mt-4 border-t border-[var(--em-border)] pt-3 text-xs leading-5 text-[var(--em-muted-ink)]">复述反馈保存在当前学习流程的本地状态中；目前没有将复述写入服务端 LearningEvidence 的接口。</p>
        </details>

        <ArchiveDossierExport snapshot={dossierSnapshot} />
      </div>
    </AppShell>
  );
}
