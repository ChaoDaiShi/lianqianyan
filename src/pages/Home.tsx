import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { HomeActionDeck } from '@/components/home/HomeActionDeck';
import { HomeEvidencePanel } from '@/components/home/HomeEvidencePanel';
import { HomeLeapRecommendation } from '@/components/home/HomeLeapRecommendation';
import { TodaysJourney } from '@/components/home/TodaysJourney';
import { LearningEntryDialog } from '@/components/learning/LearningEntryDialog';
import { useStartPlanTask } from '@/components/learning/useStartPlanTask';
import { Button } from '@/components/ui/button';
import { useCurrentPlan, useDiagnosis, useLearnerProfile, useRecentEvidence } from '@/lib/hooks';
import { fetchLeapCatalog, fetchLeapOverview, type LeapCatalog, type LeapOverview } from '@/lib/adaptiveApi';
import type { LeapRecommendation } from '@/lib/leapRecommendation';
import { selectLeapRecommendation } from '@/lib/leapRecommendation';
import { ACTIVE_COURSE_ID, ACTIVE_LEARNER_ID, useXiaolianRuntimeStore } from '@/store';
import { formatApiTime } from '@/lib/apiTime';

const COURSE_ENTRY_RECOMMENDATION: LeapRecommendation = {
  kind: 'course-entry',
  title: '前往数据结构诊断',
  reason: 'LEAP 当前面向数据结构课程；你可以在课程入口自行切换。',
  actionLabel: '打开课程入口',
  href: '/adaptive',
  topicId: null,
  sessionId: null,
  evidenceCount: null,
};

function formatDate(value: string) {
  return formatApiTime(value, {
    timeZone: 'Asia/Shanghai',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Home() {
  const [entryOpen, setEntryOpen] = useState(false);
  const profile = useLearnerProfile(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const diagnosis = useDiagnosis(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const plan = useCurrentPlan(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const evidence = useRecentEvidence();
  const { startTask, startingTaskId, error: startError } = useStartPlanTask();
  const [leapCatalog, setLeapCatalog] = useState<LeapCatalog | null>(null);
  const [leapOverview, setLeapOverview] = useState<LeapOverview | null>(null);
  const [leapLoading, setLeapLoading] = useState(ACTIVE_COURSE_ID === 'course-ds');
  const [leapError, setLeapError] = useState(false);
  const setRuntimeState = useXiaolianRuntimeStore(runtime => runtime.setRuntimeState);
  const setCompanionState = useXiaolianRuntimeStore(runtime => runtime.setCompanionState);
  const resetRuntime = useXiaolianRuntimeStore(runtime => runtime.reset);
  const courseEvidence = (evidence.data ?? [])
    .filter(item => item.learnerId === ACTIVE_LEARNER_ID && item.courseId === ACTIVE_COURSE_ID)
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  const focus = diagnosis.data?.primaryFocus ?? null;
  const currentTask = useMemo(() => {
    const ordered = [...(plan.plan?.tasks ?? [])].sort((a, b) => a.order - b.order);
    return (focus ? ordered.find(task => task.knowledgePointId === focus.knowledgePointId) : null) ?? ordered[0] ?? null;
  }, [focus, plan.plan]);
  const loading = profile.loading || diagnosis.loading || plan.loading || evidence.loading;
  const error = profile.error || diagnosis.error || plan.error || evidence.error;

  const loadLeap = useCallback(() => {
    if (ACTIVE_COURSE_ID !== 'course-ds') {
      setLeapCatalog(null);
      setLeapOverview(null);
      setLeapLoading(false);
      setLeapError(false);
      return;
    }
    setLeapLoading(true);
    setLeapError(false);
    void Promise.all([
      fetchLeapCatalog(),
      fetchLeapOverview(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID),
    ])
      .then(([nextCatalog, nextOverview]) => {
        setLeapCatalog(nextCatalog);
        setLeapOverview(nextOverview);
      })
      .catch(() => setLeapError(true))
      .finally(() => setLeapLoading(false));
  }, []);

  useEffect(() => {
    loadLeap();
  }, [loadLeap]);
  useEffect(() => {
    window.addEventListener('educationmind:evidence-updated', loadLeap);
    return () => window.removeEventListener('educationmind:evidence-updated', loadLeap);
  }, [loadLeap]);
  useEffect(() => {
    if (plan.generating || loading) setRuntimeState('loading');
    else setRuntimeState('idle');
  }, [loading, plan.generating, setRuntimeState]);
  useEffect(() => {
    if (!error && (focus || currentTask)) setCompanionState('reminding');
    else setCompanionState('companion');
  }, [currentTask, error, focus, setCompanionState]);
  useEffect(() => () => resetRuntime(), [resetRuntime]);

  const mastery = profile.data?.overallMastery;
  const latestEvidence = courseEvidence[0];
  const retry = () => {
    void profile.refetch();
    void diagnosis.refetch();
    void plan.refetch();
    void evidence.refetch();
    loadLeap();
  };
  const recommendationLoading = ACTIVE_COURSE_ID === 'course-ds' &&
    (leapLoading || diagnosis.loading);
  const recommendationError = ACTIVE_COURSE_ID === 'course-ds' &&
    (leapError || diagnosis.error);
  const recommendation = ACTIVE_COURSE_ID !== 'course-ds'
    ? COURSE_ENTRY_RECOMMENDATION
    : !recommendationLoading && !recommendationError && leapCatalog && leapOverview
      ? selectLeapRecommendation({
          courseId: ACTIVE_COURSE_ID,
          catalog: leapCatalog,
          overview: leapOverview,
          diagnosis: diagnosis.data,
          nowMs: Date.now(),
        })
      : null;

  return (
    <AppShell scene='companion'>
      <div className='mx-auto max-w-[1440px] space-y-5'>
        <header className="flex items-center gap-4 border-b border-[var(--em-border)] pb-5">
          <img src={`${import.meta.env.BASE_URL}brand/cyrene-icon.jpeg`} alt="昔涟" className="h-16 w-16 shrink-0 rounded-2xl border border-[var(--em-border)] object-cover sm:h-20 sm:w-20" />
          <div><h1 className='text-2xl font-semibold text-[var(--em-ink)]'>今日学习中枢</h1>
          <p className='mt-1 text-sm leading-6 text-[var(--em-muted-ink)]'>从真实学习行为出发，持续发现问题、解决问题、稳步提升。</p></div>
        </header>

        <section aria-label='当前学习概览' className='grid gap-3 rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] px-4 py-3 shadow-[var(--em-shadow-sm)] sm:grid-cols-3'>
          <div>
            <p className='text-xs text-[var(--em-muted-ink)]'>当前课程</p>
            <p className='mt-1 text-sm font-semibold text-[var(--em-ink)]'>
              {profile.data?.courseName ?? (profile.loading ? '读取中…' : '课程信息暂不可用')}
            </p>
          </div>
          <div className='sm:border-l sm:border-[var(--em-border)] sm:pl-4'>
            <p className='text-xs text-[var(--em-muted-ink)]'>课程整体掌握度</p>
            <p className='mt-1 text-sm font-semibold text-[var(--em-ink)]'>
              {mastery === null || mastery === undefined ? '尚未估计' : `${Math.round(mastery * 100)}%`}
            </p>
          </div>
          <div className='sm:border-l sm:border-[var(--em-border)] sm:pl-4'>
            <p className='text-xs text-[var(--em-muted-ink)]'>学习证据</p>
            <p className='mt-1 text-sm font-semibold text-[var(--em-ink)]'>
              {evidence.loading ? '读取中…' : `${courseEvidence.length} 条`}
              {latestEvidence && <span className='ml-2 text-xs font-normal text-[var(--em-muted-ink)]'>最近 {formatDate(latestEvidence.occurredAt)}</span>}
            </p>
          </div>
        </section>

        <div className='grid items-start gap-4 lg:grid-cols-12'>
          <div className='space-y-4 lg:col-span-8'>
            <HomeActionDeck
              diagnosis={diagnosis.data}
              plan={plan.plan}
              task={currentTask}
              evidenceCount={courseEvidence.length}
              loading={loading}
              error={Boolean(error)}
              generating={plan.generating}
              starting={startingTaskId === currentTask?.id}
              startError={startError}
              onGeneratePlan={() => void plan.generate()}
              onPrepareTask={() => setEntryOpen(true)}
              onRetry={retry}
            />
            {recommendationLoading ? (
              <p role='status' className='rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-5 text-sm text-[var(--em-muted-ink)]'>
                正在读取针对性学习建议…
              </p>
            ) : recommendationError ? (
              <div role='alert' className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5'>
                <p className='text-sm text-amber-900'>针对性学习建议暂时无法读取。</p>
                <Button variant='outline' size='sm' onClick={retry}>
                  重新加载建议
                </Button>
              </div>
            ) : recommendation ? (
              <HomeLeapRecommendation recommendation={recommendation} />
            ) : null}
            <TodaysJourney
              diagnosis={diagnosis.data}
              plan={plan.plan}
              currentTask={currentTask}
              evidence={courseEvidence}
              loading={loading}
              error={Boolean(error)}
              onRetry={retry}
            />
          </div>
          <aside className='lg:col-span-4'>
            <HomeEvidencePanel
              evidence={courseEvidence}
              evidenceLoading={evidence.loading}
              evidenceError={evidence.error}
              onRetryEvidence={() => void evidence.refetch()}
              diagnosis={diagnosis.data}
              sessions={leapOverview?.sessions ?? []}
              sessionsLoading={leapLoading}
              sessionsError={leapError ? '复测安排暂时无法读取。' : null}
            />
          </aside>
        </div>

        <LearningEntryDialog
          open={entryOpen}
          onOpenChange={setEntryOpen}
          plan={plan.plan}
          task={currentTask}
          diagnosis={diagnosis.data}
          evidence={courseEvidence}
          dataLoading={diagnosis.loading || evidence.loading}
          diagnosisError={diagnosis.error}
          evidenceError={evidence.error}
          starting={startingTaskId === currentTask?.id}
          startError={startError}
          onConfirm={() => {
            if (plan.plan && currentTask) void startTask(plan.plan, currentTask);
          }}
        />
      </div>
    </AppShell>
  );
}

export default Home;
