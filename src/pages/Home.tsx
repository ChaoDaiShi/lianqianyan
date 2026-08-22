import { useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { HeroBanner } from '@/components/home/HeroBanner';
import { XiaolianDailyInsight } from '@/components/home/XiaolianDailyInsight';
import { TodayPlanCard } from '@/components/home/TodayPlanCard';
import { useStartPlanTask } from '@/components/learning/useStartPlanTask';
import { useCurrentPlan, useDiagnosis, useLearnerProfile, useRecentEvidence } from '@/lib/hooks';
import { DEMO_COURSE_ID, DEMO_LEARNER_ID, useXiaolianRuntimeStore } from '@/store';

function Home() {
  const profile = useLearnerProfile(DEMO_LEARNER_ID, DEMO_COURSE_ID);
  const diagnosis = useDiagnosis(DEMO_LEARNER_ID, DEMO_COURSE_ID);
  const plan = useCurrentPlan(DEMO_LEARNER_ID, DEMO_COURSE_ID);
  const evidence = useRecentEvidence();
  const { startTask, startingTaskId, error: startError } = useStartPlanTask();
  const runtimeState = useXiaolianRuntimeStore((runtime) => runtime.state);
  const setRuntimeState = useXiaolianRuntimeStore((runtime) => runtime.setState);
  const resetRuntime = useXiaolianRuntimeStore((runtime) => runtime.reset);
  const courseEvidence = (evidence.data ?? []).filter((item) => item.learnerId === DEMO_LEARNER_ID && item.courseId === DEMO_COURSE_ID);
  const focus = diagnosis.data?.primaryFocus ?? null;
  const currentTask = useMemo(() => {
    const ordered = [...(plan.plan?.tasks ?? [])].sort((a, b) => a.order - b.order);
    return (focus ? ordered.find((task) => task.knowledgePointId === focus.knowledgePointId) : null) ?? ordered[0] ?? null;
  }, [focus, plan.plan]);
  const loading = profile.loading || diagnosis.loading || plan.loading || evidence.loading;
  const error = profile.error || diagnosis.error || plan.error || evidence.error;

  useEffect(() => {
    if (plan.generating) setRuntimeState('planning');
    else if (loading) setRuntimeState(plan.loading ? 'planning' : 'analyzing');
    else if (!error && (focus || currentTask)) setRuntimeState('success');
    else setRuntimeState('idle');
  }, [currentTask, error, focus, loading, plan.generating, plan.loading, setRuntimeState]);
  useEffect(() => () => resetRuntime(), [resetRuntime]);

  return <AppShell><div className="space-y-6 lg:space-y-8">
    <HeroBanner profile={profile.data} diagnosis={diagnosis.data} plan={plan.plan} loading={loading} error={error} runtimeState={runtimeState} />
    <XiaolianDailyInsight profile={profile.data} diagnosis={diagnosis.data} plan={plan.plan} evidence={courseEvidence} loading={loading} error={error} />
    <TodayPlanCard plan={plan.plan} task={currentTask} loading={plan.loading} error={plan.error} generating={plan.generating} starting={startingTaskId === currentTask?.id} startError={startError} onGenerate={() => void plan.generate()} onStart={() => { if (plan.plan && currentTask) void startTask(plan.plan, currentTask); }} onRetry={() => void plan.refetch()} />
  </div></AppShell>;
}

export default Home;
