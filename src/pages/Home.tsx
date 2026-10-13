import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { HomeActionDeck } from '@/components/home/HomeActionDeck';
import { HomeEvidencePanel } from '@/components/home/HomeEvidencePanel';
import { TodaysJourney } from '@/components/home/TodaysJourney';
import { LearningEntryDialog } from '@/components/learning/LearningEntryDialog';
import { useStartPlanTask } from '@/components/learning/useStartPlanTask';
import { useCurrentPlan, useDiagnosis, useLearnerProfile, useRecentEvidence } from '@/lib/hooks';
import { fetchLeapSessions, type LeapSession } from '@/lib/adaptiveApi';
import { ACTIVE_COURSE_ID, ACTIVE_LEARNER_ID, useXiaolianRuntimeStore } from '@/store';
import { formatApiTime } from '@/lib/apiTime';

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
  const [leapSessions, setLeapSessions] = useState<LeapSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(ACTIVE_COURSE_ID === 'course-ds');
  const [sessionsError, setSessionsError] = useState<string | null>(null);
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

  const loadSessions = useCallback(() => {
    if (ACTIVE_COURSE_ID !== 'course-ds') {
      setSessionsLoading(false);
      return;
    }
    setSessionsLoading(true);
    setSessionsError(null);
    void fetchLeapSessions(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID)
      .then(setLeapSessions)
      .catch(cause => setSessionsError(cause instanceof Error ? cause.message : '请求失败'))
      .finally(() => setSessionsLoading(false));
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);
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
    loadSessions();
  };

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
              sessions={leapSessions}
              sessionsLoading={sessionsLoading}
              sessionsError={sessionsError}
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
