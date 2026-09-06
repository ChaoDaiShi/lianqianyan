import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, RotateCw } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/design/GlassPanel';
import { QuestCard } from '@/components/design/QuestCard';
import { LearningState } from '@/components/feedback/LearningState';
import { LearningEntryDialog } from '@/components/learning/LearningEntryDialog';
import { WorkbenchSidePanel } from '@/components/learning/WorkbenchSidePanel';
import { WorkbenchTaskHeader } from '@/components/learning/WorkbenchTaskHeader';
import { SourceReferences } from '@/components/learning/SourceReferences';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';
import { WorkspaceArtifactsPanel, type ArtifactScope } from '@/components/workspace/WorkspaceArtifactsPanel';
import { WorkspaceHistoryPanel } from '@/components/workspace/WorkspaceHistoryPanel';
import { WorkspaceContextPanel } from '@/components/workspace/WorkspaceContextPanel';
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
import { buildReflectionHref } from '@/components/learning/reflectionPresentation';
import type { DiagnosisResult, KnowledgePointDiagnosis, PersistedStudyTask } from '@/domain';
import type { AgentChatResponse, KnowledgeSource, PracticeEvaluationResponse } from '@/lib/educationApi';
import { useCurrentPlan, useDiagnosis, useKnowledgePoint, useLearnerProfile, useRecentEvidence } from '@/lib/hooks';
import {
  ACTIVE_COURSE_ID,
  ACTIVE_LEARNER_ID,
  useLearningLoopStore,
  useWorkspaceStore,
  useXiaolianRuntimeStore,
} from '@/store';
import { getLearningModule, resolveQuickQuestions } from '@/content/learningContent';
import { selectLearningSpaceFeedback } from './learningSpacePresentation';

type SidePanelKind = 'guide' | 'artifacts' | 'history' | 'context' | 'sources';

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
  const [sidePanel, setSidePanel] = useState<SidePanelKind | null>(null);
  const [artifactScope, setArtifactScope] = useState<ArtifactScope>('task');
  const [sidePanelSources, setSidePanelSources] = useState<KnowledgeSource[]>([]);

  const openSourcesPanel = useCallback((sources: KnowledgeSource[]) => {
    setSidePanelSources(sources);
    setSidePanel('sources');
  }, []);
  const setRuntimeState = useXiaolianRuntimeStore(
    (state) => state.setRuntimeState,
  );
  const setCompanionState = useXiaolianRuntimeStore(
    (state) => state.setCompanionState,
  );
  const runtimeState = useXiaolianRuntimeStore((state) => state.runtimeState);
  const companionState = useXiaolianRuntimeStore((state) => state.companionState);
  const [tutorSpeaking, setTutorSpeaking] = useState(false);
  const resetRuntime = useXiaolianRuntimeStore((state) => state.reset);
  const taskIdParam = searchParams.get('task_id');
  const knowledgePointParam = searchParams.get('knowledge_point_id');
  const workspaceTaskId = useWorkspaceStore((state) => state.taskId);
  const workspaceKnowledgePointId = useWorkspaceStore((state) => state.knowledgePointId);
  const { plan, loading, error, refetch } = useCurrentPlan(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const profile = useLearnerProfile(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const diagnosis = useDiagnosis(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
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
  const knowledge = useKnowledgePoint(currentTask?.knowledgePointId, ACTIVE_COURSE_ID);
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
  const storedReflectionResults = useLearningLoopStore((state) => state.reflectionResults);
  const storedPracticeEvaluations = useLearningLoopStore((state) => state.practiceEvaluations);
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
            learnerId: ACTIVE_LEARNER_ID,
            courseId: ACTIVE_COURSE_ID,
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
        {!currentTask && (
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">小涟学习工作台</h1>
            <p className="mt-2 text-sm text-[var(--em-muted-ink)]">围绕当前真实任务对话、练习，并留下可核验的学习产物。</p>
          </div>
        )}

        {loading && <LearningState kind="loading" title="正在加载当前学习计划" />}
        {error && !currentTask && <LearningState kind="error" title="暂时无法读取学习计划" action={<Button variant="outline" onClick={refetch} className="gap-2"><RotateCw className="h-4 w-4" />重新加载</Button>} />}
        {!loading && !error && !currentTask && <div className="space-y-5"><LearningState kind="empty" title="请选择一个学习任务开始" description="学习工作台由真实 Current Plan 任务进入。" action={<Button asChild variant="outline"><Link to="/" className="gap-2"><ArrowLeft className="h-4 w-4" />返回首页</Link></Button>} />{tasks.length > 0 && <GlassPanel className="p-5 sm:p-6"><h2 className="text-lg font-bold">当前计划任务</h2><div className="mt-4 space-y-3">{tasks.slice(0, 3).map((task, index) => <QuestCard key={task.id} task={task} index={index} pending={startingTaskId === task.id} onStart={() => handleStartTask(task)} />)}</div>{startError && <p className="mt-3 text-sm text-amber-700">{startError}</p>}</GlassPanel>}</div>}

        {!loading && currentTask && <>
          {plan && (
            <WorkbenchTaskHeader
              plan={plan}
              task={currentTask}
              state={companionJourneyState}
              onOpenPanel={setSidePanel}
            />
          )}
          {feedback ? <XiaolianFeedbackBubble {...feedback} /> : null}
          <div
            aria-label="小涟陪伴角色"
            className="pointer-events-none fixed bottom-6 right-6 z-30 hidden xl:block"
          >
            <XiaolianCharacter
              runtimeState={runtimeState}
              companionState={companionState}
              size="lg"
              speaking={tutorSpeaking}
              priority
            />
          </div>
          <div className="mx-auto w-full max-w-3xl space-y-6">
            <SpaceTutor key={currentTask.id} knowledgePointId={currentTask.knowledgePointId} knowledgePointName={currentTask.knowledgePointName} knowledge={currentKnowledge} quickQuestions={currentTask ? resolveQuickQuestions(currentTask.knowledgePointId, currentTask.knowledgePointName) : undefined} onPendingChange={handleTutorPending} onResponse={handleTutorResponse} onOpenSources={openSourcesPanel} onSpeakingChange={setTutorSpeaking} />
            {module && <ModulePractice key={currentTask.id} taskId={currentTask.id} knowledgePointName={currentTask.knowledgePointName} questions={module.questions} onEvaluationPendingChange={handleEvaluationPending} onEvaluationComplete={handleEvaluationComplete} onPracticeComplete={async (replanning) => { const [profileUpdated, diagnosisUpdated, planUpdated, evidenceUpdated] = await Promise.all([profile.refetch(), diagnosis.refetch(), replanning.status === 'performed' ? refetch() : Promise.resolve(true), evidence.refetch()]); return profileUpdated && diagnosisUpdated && planUpdated && evidenceUpdated; }} />}
          </div>
          {sidePanel === 'guide' && (
            <WorkbenchSidePanel title="课前引导" onClose={() => setSidePanel(null)}>
              <TutorExplanationCard mode="knowledge" knowledge={currentKnowledge} knowledgePointName={currentTask.knowledgePointName} loading={currentKnowledgeLoading} error={knowledge.error} />
              <Link to={buildReflectionHref(currentTask)} className="mt-5 flex items-center justify-between rounded-2xl border border-violet-200 bg-violet-50/70 px-4 py-3 text-sm font-semibold text-primary-700 transition hover:bg-violet-100">
                用自己的话复述
                <ArrowRight className="h-4 w-4" />
              </Link>
            </WorkbenchSidePanel>
          )}
          {sidePanel === 'artifacts' && (
            <WorkbenchSidePanel title="学习产物" onClose={() => setSidePanel(null)}>
              <WorkspaceArtifactsPanel
                scope={artifactScope}
                onScopeChange={setArtifactScope}
                task={currentTask}
                knowledge={currentKnowledge}
                knowledgeLoading={currentKnowledgeLoading}
                knowledgeError={knowledge.error}
                currentDiagnosis={currentDiagnosis}
                isPrimaryFocus={diagnosis.data?.primaryFocus?.knowledgePointId === currentTask.knowledgePointId}
                sources={currentTutorResponse?.sources ?? []}
                practiceEvaluation={currentEvaluation}
                reflection={storedReflectionResult}
                evidenceLearningStarted={currentEvidence.learningStarted.length}
                evidencePracticeEvaluated={currentEvidence.practiceEvaluated.length}
              />
            </WorkbenchSidePanel>
          )}
          {sidePanel === 'history' && (
            <WorkbenchSidePanel title="历史记录" onClose={() => setSidePanel(null)}>
              <WorkspaceHistoryPanel
                tasks={tasks}
                evidence={evidence.data ?? []}
                practiceEvaluations={storedPracticeEvaluations}
                reflectionResults={storedReflectionResults}
                loading={evidence.loading}
                error={evidence.error}
                onRetry={() => void evidence.refetch()}
              />
            </WorkbenchSidePanel>
          )}
          {sidePanel === 'context' && (
            <WorkbenchSidePanel title="学习上下文" onClose={() => setSidePanel(null)}>
              <WorkspaceContextPanel
                courseName={profile.data?.courseName ?? ACTIVE_COURSE_ID}
                task={currentTask}
                planTaskCount={tasks.length}
                currentDiagnosis={currentDiagnosis}
                diagnosisLoading={diagnosis.loading}
                learnerId={ACTIVE_LEARNER_ID}
                courseId={ACTIVE_COURSE_ID}
                evidence={evidence.data ?? []}
                evidenceLoading={evidence.loading}
                evidenceError={evidence.error}
                onRetryEvidence={() => void evidence.refetch()}
                response={currentTutorResponse}
              />
            </WorkbenchSidePanel>
          )}
          {sidePanel === 'sources' && (
            <WorkbenchSidePanel title="课程来源" onClose={() => setSidePanel(null)}>
              {(sidePanelSources.length > 0 ? sidePanelSources : currentTutorResponse?.sources ?? []).length > 0 ? (
                <SourceReferences sources={sidePanelSources.length > 0 ? sidePanelSources : currentTutorResponse?.sources ?? []} />
              ) : (
                <p className="text-xs leading-5 text-[var(--em-muted-ink)]">小涟最近一次回答没有返回课程来源。</p>
              )}
            </WorkbenchSidePanel>
          )}
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
