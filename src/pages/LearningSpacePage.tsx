import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, LayoutGrid, RotateCw } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/design/GlassPanel';
import { QuestCard } from '@/components/design/QuestCard';
import { LearningState } from '@/components/feedback/LearningState';
import { EvidenceInsightCard } from '@/components/learning/EvidenceInsightCard';
import { CompanionJourney } from '@/components/learning/CompanionJourney';
import { LearningArtifactPanel } from '@/components/learning/LearningArtifactPanel';
import { LearningEntryDialog } from '@/components/learning/LearningEntryDialog';
import { LearningModulePanel } from '@/components/learning/LearningModulePanel';
import { LearningJourneyHeader } from '@/components/learning/LearningJourneyHeader';
import { LearningStageProgress } from '@/components/learning/LearningStageProgress';
import {
  deriveLearningStages,
  filterLearningEvidence,
} from '@/components/learning/learningLoop';
import { deriveCompanionJourney } from '@/components/learning/companionFlow';
import { ModulePractice } from '@/components/learning/ModulePractice';
import { SpaceTutor } from '@/components/learning/SpaceTutor';
import { TutorExplanationCard } from '@/components/learning/TutorExplanationCard';
import { useStartPlanTask } from '@/components/learning/useStartPlanTask';
import { Button } from '@/components/ui/button';
import { XiaolianFeedbackBubble } from '@/components/xiaolian/XiaolianFeedbackBubble';
import type { DiagnosisResult, KnowledgePointDiagnosis, PersistedStudyTask } from '@/domain';
import type { AgentChatResponse, PracticeEvaluationResponse } from '@/lib/educationApi';
import { useCurrentPlan, useDiagnosis, useKnowledgePoint, useLearnerProfile, useRecentEvidence } from '@/lib/hooks';
import {
  DEMO_COURSE_ID,
  DEMO_LEARNER_ID,
  useLearningLoopStore,
  useWorkspaceStore,
  useXiaolianRuntimeStore,
} from '@/store';
import { getLearningModule } from '@/content/learningContent';
import { selectLearningSpaceFeedback } from './learningSpacePresentation';

interface TaskScopedValue<T> {
  taskId: string;
  data: T;
}

function findKnowledgePoint(diagnosis: DiagnosisResult | null, knowledgePointId: string | null) {
  if (!diagnosis || !knowledgePointId) return null;
  const points: KnowledgePointDiagnosis[] = [
    ...(diagnosis.primaryFocus ? [diagnosis.primaryFocus] : []),
    ...diagnosis.priorityInterventions,
    ...diagnosis.strengths,
    ...diagnosis.weakPoints,
    ...diagnosis.developingPoints,
    ...diagnosis.unassessedPoints,
  ];
  return points.find((point) => point.knowledgePointId === knowledgePointId) ?? null;
}

export function LearningSpacePage() {
  const { startTask, startingTaskId, error: startError } = useStartPlanTask();
  const [searchParams] = useSearchParams();
  const [evaluation, setEvaluation] = useState<TaskScopedValue<PracticeEvaluationResponse> | null>(null);
  const [tutorPending, setTutorPending] = useState(false);
  const [evaluationPending, setEvaluationPending] = useState(false);
  const [preparingTask, setPreparingTask] =
    useState<PersistedStudyTask | null>(null);
  const setRuntimeState = useXiaolianRuntimeStore(
    (state) => state.setRuntimeState,
  );
  const setCompanionState = useXiaolianRuntimeStore(
    (state) => state.setCompanionState,
  );
  const resetRuntime = useXiaolianRuntimeStore((state) => state.reset);
  const taskIdParam = searchParams.get('task_id');
  const knowledgePointParam = searchParams.get('knowledge_point_id');
  const workspaceTaskId = useWorkspaceStore((state) => state.taskId);
  const workspaceKnowledgePointId = useWorkspaceStore((state) => state.knowledgePointId);
  const { plan, loading, error, refetch } = useCurrentPlan(DEMO_LEARNER_ID, DEMO_COURSE_ID);
  const profile = useLearnerProfile(DEMO_LEARNER_ID, DEMO_COURSE_ID);
  const diagnosis = useDiagnosis(DEMO_LEARNER_ID, DEMO_COURSE_ID);
  const evidence = useRecentEvidence();
  const tasks = plan?.tasks ?? [];
  const activeKnowledgePointId = knowledgePointParam ?? workspaceKnowledgePointId;
  const activeTaskId = taskIdParam ?? workspaceTaskId;
  const currentTask: PersistedStudyTask | null = useMemo(() => {
    if (activeTaskId) {
      const task = tasks.find((item) => item.id === activeTaskId);
      if (task) return task;
    }
    return activeKnowledgePointId
      ? tasks.find((item) => item.knowledgePointId === activeKnowledgePointId) ?? null
      : null;
  }, [activeKnowledgePointId, activeTaskId, tasks]);
  const currentDiagnosis = useMemo(
    () => findKnowledgePoint(diagnosis.data, currentTask?.knowledgePointId ?? null),
    [currentTask, diagnosis.data]
  );
  const module = currentTask ? getLearningModule(currentTask.knowledgePointId) : null;
  const knowledge = useKnowledgePoint(currentTask?.knowledgePointId, DEMO_COURSE_ID);
  const currentKnowledge = knowledge.data?.knowledgePointId === currentTask?.knowledgePointId
    ? knowledge.data
    : null;
  const currentKnowledgeLoading = knowledge.loading || (knowledge.data !== null && currentKnowledge === null);
  const pageAnalyzing = profile.loading || diagnosis.loading || evidence.loading || (Boolean(currentTask) && knowledge.loading);
  const currentTaskId = currentTask?.id ?? null;
  const storedReflectionResult = useLearningLoopStore((state) =>
    currentTaskId
      ? state.reflectionResults[currentTaskId] ?? null
      : null,
  );
  const storedPracticeEvaluation = useLearningLoopStore((state) =>
    currentTaskId
      ? state.practiceEvaluations[currentTaskId] ?? null
      : null,
  );
  const storedTutorResponse = useLearningLoopStore((state) =>
    currentTaskId
      ? state.tutorResponses[currentTaskId] ?? null
      : null,
  );
  const currentLearningSessionId = useLearningLoopStore((state) =>
    currentTaskId
      ? state.learningSessionIds[currentTaskId] ?? null
      : null,
  );
  const setPracticeEvaluation = useLearningLoopStore(
    (state) => state.setPracticeEvaluation,
  );
  const setTutorResponse = useLearningLoopStore(
    (state) => state.setTutorResponse,
  );
  const localEvaluation =
    evaluation?.taskId === currentTaskId ? evaluation.data : null;
  const currentEvaluation = localEvaluation ?? storedPracticeEvaluation;
  const currentTutorResponse = storedTutorResponse;
  const currentEvidence = useMemo(
    () =>
      currentTask
        ? filterLearningEvidence({
            evidence: evidence.data ?? [],
            learnerId: DEMO_LEARNER_ID,
            courseId: DEMO_COURSE_ID,
            knowledgePointId: currentTask.knowledgePointId,
            learningSessionId: currentLearningSessionId,
          })
        : { learningStarted: [], practiceEvaluated: [] },
    [currentLearningSessionId, currentTask, evidence.data],
  );
  const stages = useMemo(
    () =>
      deriveLearningStages({
        hasLearningStarted: currentEvidence.learningStarted.length > 0,
        hasTutorResponse: currentTutorResponse !== null,
        practiceEvaluation: currentEvaluation,
        reflectionResult: storedReflectionResult,
      }),
    [
      currentEvaluation,
      currentEvidence.learningStarted.length,
      currentTutorResponse,
      storedReflectionResult,
    ],
  );
  const allStagesComplete = stages.every(
    (stage) => stage.status === 'completed',
  );
  const companionJourneyState = deriveCompanionJourney({
    hasLearningStarted: currentEvidence.learningStarted.length > 0,
    hasTutorResponse: currentTutorResponse !== null,
    tutorPending,
    hasPracticeEvaluation: currentEvaluation !== null,
    hasReflectionResult: storedReflectionResult !== null,
    allStagesComplete,
  });
  const feedback = selectLearningSpaceFeedback({
    allStagesComplete,
    diagnosis: currentDiagnosis,
    diagnosisGeneratedAt: diagnosis.data?.diagnosisGeneratedAt ?? null,
    reflectionResult: storedReflectionResult,
    practiceEvaluation: currentEvaluation,
  });

  useEffect(() => {
    setEvaluation(null);
    setTutorPending(false);
    setEvaluationPending(false);
  }, [currentTask?.id]);
  useEffect(() => {
    if (tutorPending) setRuntimeState('thinking');
    else if (evaluationPending || loading || pageAnalyzing)
      setRuntimeState('loading');
    else setRuntimeState('idle');
  }, [evaluationPending, loading, pageAnalyzing, setRuntimeState, tutorPending]);
  useEffect(() => {
    if (allStagesComplete) setCompanionState('celebrating');
    else if (feedback) setCompanionState('encouraging');
    else if (currentTask) setCompanionState('reminding');
    else setCompanionState('companion');
  }, [allStagesComplete, currentTask, feedback, setCompanionState]);
  useEffect(() => () => resetRuntime(), [resetRuntime]);

  const handleTutorPending = useCallback((pending: boolean) => {
    setTutorPending(pending);
  }, []);
  const handleEvaluationPending = useCallback((pending: boolean) => {
    setEvaluationPending(pending);
  }, []);
  const handleTutorResponse = useCallback((response: AgentChatResponse) => {
    if (!currentTaskId) return;
    setTutorResponse(currentTaskId, response);
  }, [currentTaskId, setTutorResponse]);
  const handleEvaluationComplete = useCallback((result: PracticeEvaluationResponse) => {
    if (!currentTaskId) return;
    setEvaluation({ taskId: currentTaskId, data: result });
    setPracticeEvaluation(currentTaskId, result);
  }, [currentTaskId, setPracticeEvaluation]);
  const handleStartTask = (task: PersistedStudyTask) => {
    setPreparingTask(task);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold text-primary-700"><LayoutGrid className="h-4 w-4" />AI LEARNING WORKBENCH</p>
          <h1 className="mt-2 text-3xl font-bold">{currentTask ? '小涟学习工作台' : '选择一项学习任务'}</h1>
          <p className="mt-2 text-sm text-[var(--em-muted-ink)]">围绕当前真实任务对话、练习，并留下可核验的学习产物。</p>
        </div>

        {loading && <LearningState kind="loading" title="正在加载当前学习计划" />}
        {error && !currentTask && <LearningState kind="error" title="暂时无法读取学习计划" action={<Button variant="outline" onClick={refetch} className="gap-2"><RotateCw className="h-4 w-4" />重新加载</Button>} />}
        {!loading && !error && !currentTask && <div className="space-y-5"><LearningState kind="empty" title="请选择一个学习任务开始" description="学习工作台由真实 Current Plan 任务进入。" action={<Button asChild variant="outline"><Link to="/" className="gap-2"><ArrowLeft className="h-4 w-4" />返回首页</Link></Button>} />{tasks.length > 0 && <GlassPanel className="p-5 sm:p-6"><h2 className="text-lg font-bold">当前计划任务</h2><div className="mt-4 space-y-3">{tasks.slice(0, 3).map((task, index) => <QuestCard key={task.id} task={task} index={index} pending={startingTaskId === task.id} onStart={() => handleStartTask(task)} />)}</div>{startError && <p className="mt-3 text-sm text-amber-700">{startError}</p>}</GlassPanel>}</div>}

        {!loading && currentTask && <>
          {plan && <LearningJourneyHeader plan={plan} currentTask={currentTask} />}
          <CompanionJourney state={companionJourneyState} />
          <LearningStageProgress stages={stages} />
          {feedback ? <XiaolianFeedbackBubble {...feedback} /> : null}
          <div className="grid gap-6 xl:grid-cols-[15rem_minmax(24rem,1fr)_20rem] xl:items-start">
            <div className="order-1 xl:order-2 xl:col-start-2 xl:row-start-1"><SpaceTutor key={currentTask.id} knowledgePointId={currentTask.knowledgePointId} knowledgePointName={currentTask.knowledgePointName} knowledge={currentKnowledge} quickQuestions={module?.quickQuestions} onPendingChange={handleTutorPending} onResponse={handleTutorResponse} /></div>

            <div className="order-2 space-y-5 xl:order-1 xl:col-start-1 xl:row-start-1"><TutorExplanationCard mode="knowledge" knowledge={currentKnowledge} knowledgePointName={currentTask.knowledgePointName} loading={currentKnowledgeLoading} error={knowledge.error} /><LearningModulePanel task={currentTask} taskCount={tasks.length} knowledge={currentKnowledge} knowledgeLoading={currentKnowledgeLoading} knowledgeError={knowledge.error} diagnosis={currentDiagnosis} diagnosisLoading={diagnosis.loading} diagnosisError={diagnosis.error} /></div>

            <div className="order-3 xl:col-start-3 xl:row-start-1 xl:sticky xl:top-24"><LearningArtifactPanel knowledge={currentKnowledge} knowledgeLoading={currentKnowledgeLoading} knowledgeError={knowledge.error} currentDiagnosis={currentDiagnosis} isPrimaryFocus={diagnosis.data?.primaryFocus?.knowledgePointId === currentTask.knowledgePointId} sources={currentTutorResponse?.sources ?? []} evaluation={currentEvaluation} /></div>

            {module && <div className="order-4 xl:col-start-2 xl:row-start-2"><ModulePractice key={currentTask.id} taskId={currentTask.id} knowledgePointName={currentTask.knowledgePointName} questions={module.questions} onEvaluationPendingChange={handleEvaluationPending} onEvaluationComplete={handleEvaluationComplete} onPracticeComplete={async (replanning) => { const [profileUpdated, diagnosisUpdated, planUpdated, evidenceUpdated] = await Promise.all([profile.refetch(), diagnosis.refetch(), replanning.status === 'performed' ? refetch() : Promise.resolve(true), evidence.refetch()]); return profileUpdated && diagnosisUpdated && planUpdated && evidenceUpdated; }} /></div>}
          </div>
          <EvidenceInsightCard
            evidence={evidence.data ?? []}
            learnerId={DEMO_LEARNER_ID}
            courseId={DEMO_COURSE_ID}
            knowledgePointId={currentTask.knowledgePointId}
            loading={evidence.loading}
            error={evidence.error}
            onRetry={() => void evidence.refetch()}
          />
        </>}
        <LearningEntryDialog
          open={preparingTask !== null}
          onOpenChange={(open) => {
            if (!open) setPreparingTask(null);
          }}
          plan={plan}
          task={preparingTask}
          diagnosis={diagnosis.data}
          evidence={evidence.data ?? []}
          dataLoading={diagnosis.loading || evidence.loading}
          diagnosisError={diagnosis.error}
          evidenceError={evidence.error}
          starting={startingTaskId === preparingTask?.id}
          startError={startError}
          onConfirm={() => {
            if (plan && preparingTask) void startTask(plan, preparingTask);
          }}
        />
      </div>
    </AppShell>
  );
}
