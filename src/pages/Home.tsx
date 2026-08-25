import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { HeroBanner } from '@/components/home/HeroBanner';
import { XiaolianDailyInsight } from '@/components/home/XiaolianDailyInsight';
import { TodaysJourney } from '@/components/home/TodaysJourney';
import { LearningEntryDialog } from '@/components/learning/LearningEntryDialog';
import { useStartPlanTask } from '@/components/learning/useStartPlanTask';
import { useCurrentPlan, useDiagnosis, useLearnerProfile, useRecentEvidence } from '@/lib/hooks';
import { ACTIVE_COURSE_ID, ACTIVE_LEARNER_ID, useXiaolianRuntimeStore } from '@/store';

function Home() {
  const [entryOpen, setEntryOpen] = useState(false);
  const profile = useLearnerProfile(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const diagnosis = useDiagnosis(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const plan = useCurrentPlan(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const evidence = useRecentEvidence();
  const { startTask, startingTaskId, error: startError } = useStartPlanTask();
  const runtimeState = useXiaolianRuntimeStore(
    (runtime) => runtime.runtimeState,
  );
  const companionState = useXiaolianRuntimeStore(
    (runtime) => runtime.companionState,
  );
  const setRuntimeState = useXiaolianRuntimeStore(
    (runtime) => runtime.setRuntimeState,
  );
  const setCompanionState = useXiaolianRuntimeStore(
    (runtime) => runtime.setCompanionState,
  );
  const resetRuntime = useXiaolianRuntimeStore((runtime) => runtime.reset);
  const courseEvidence = (evidence.data ?? []).filter((item) => item.learnerId === ACTIVE_LEARNER_ID && item.courseId === ACTIVE_COURSE_ID);
  const focus = diagnosis.data?.primaryFocus ?? null;
  const currentTask = useMemo(() => {
    const ordered = [...(plan.plan?.tasks ?? [])].sort((a, b) => a.order - b.order);
    return (focus ? ordered.find((task) => task.knowledgePointId === focus.knowledgePointId) : null) ?? ordered[0] ?? null;
  }, [focus, plan.plan]);
  const loading = profile.loading || diagnosis.loading || plan.loading || evidence.loading;
  const error = profile.error || diagnosis.error || plan.error || evidence.error;

  useEffect(() => {
    if (plan.generating || loading) setRuntimeState('loading');
    else setRuntimeState('idle');
  }, [loading, plan.generating, setRuntimeState]);
  useEffect(() => {
    if (!error && (focus || currentTask)) setCompanionState('reminding');
    else setCompanionState('companion');
  }, [currentTask, error, focus, setCompanionState]);
  useEffect(() => () => resetRuntime(), [resetRuntime]);

  return <AppShell><div className="space-y-6 lg:space-y-8">
    <HeroBanner profile={profile.data} diagnosis={diagnosis.data} plan={plan.plan} loading={loading} error={error} runtimeState={runtimeState} companionState={companionState} onPrepareTask={() => setEntryOpen(true)} />
    <XiaolianDailyInsight profile={profile.data} diagnosis={diagnosis.data} plan={plan.plan} evidence={courseEvidence} loading={loading} error={error} onPrepareTask={() => setEntryOpen(true)} />
    <TodaysJourney plan={plan.plan} currentTaskId={currentTask?.id ?? null} loading={plan.loading} error={plan.error} generating={plan.generating} starting={startingTaskId === currentTask?.id} startError={startError} onGenerate={() => void plan.generate()} onPrepare={() => setEntryOpen(true)} onRetry={() => void plan.refetch()} />
    <LearningEntryDialog open={entryOpen} onOpenChange={setEntryOpen} plan={plan.plan} task={currentTask} diagnosis={diagnosis.data} evidence={courseEvidence} dataLoading={diagnosis.loading || evidence.loading} diagnosisError={diagnosis.error} evidenceError={evidence.error} starting={startingTaskId === currentTask?.id} startError={startError} onConfirm={() => { if (plan.plan && currentTask) void startTask(plan.plan, currentTask); }} />
  </div></AppShell>;
}

export default Home;
