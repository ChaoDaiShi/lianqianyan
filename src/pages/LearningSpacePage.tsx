import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, RotateCw } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/design/GlassPanel';
import { QuestCard } from '@/components/design/QuestCard';
import { LearningState } from '@/components/feedback/LearningState';
import { MarkdownText } from '@/components/content/MarkdownText';
import { LearningEntryDialog } from '@/components/learning/LearningEntryDialog';
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
import { MaterialProvenance } from '@/components/knowledge/MaterialProvenance';
import { SpaceTutor } from '@/components/learning/SpaceTutor';
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
import { resolveQuickQuestions } from '@/content/learningContent';
import { selectLearningSpaceFeedback } from './learningSpacePresentation';
import { LeapEntryCard } from '@/components/adaptive/LeapEntryCard';
import { cn } from '@/lib/utils';

type SidePanelKind = 'guide' | 'artifacts' | 'history' | 'context' | 'sources';
const SIDE_PANEL_CHOICES: Array<{ id: SidePanelKind; label: string }> = [
  { id: 'guide', label: '小涟答疑' },
  { id: 'artifacts', label: '学习产物' },
  { id: 'history', label: '历史记录' },
  { id: 'context', label: '学习上下文' },
  { id: 'sources', label: '课程来源' },
];

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
        <LeapEntryCard compact />
        {!currentTask && (
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">小涟学习工作台</h1>
            <p className="mt-2 text-sm text-[var(--em-muted-ink)]">围绕当前真实任务对话、练习，并留下可核验的学习产物。</p>
          </div>
        )}

        {loading && <LearningState kind="loading" title="正在加载当前学习计划" />}
        {error && !currentTask && <LearningState kind="error" title="暂时无法读取学习计划" action={<Button variant="outline" onClick={refetch} className="gap-2"><RotateCw className="h-4 w-4" />重新加载</Button>} />}
        {!loading && !error && !currentTask && <div className="space-y-5"><LearningState kind="empty" title="请选择一个学习任务开始" description="学习工作台由真实 Current Plan 任务进入。" action={<Button asChild variant="outline"><Link to="/" className="gap-2"><ArrowLeft className="h-4 w-4" />返回首页</Link></Button>} />{tasks.length > 0 && <GlassPanel className="p-5 sm:p-6"><h2 className="text-lg font-bold">当前计划任务</h2><div className="mt-4 space-y-3">{tasks.slice(0, 3).map((task, index) => <QuestCard key={task.id} task={task} index={index} pending={startingTaskId === task.id} onStart={() => handleStartTask(task)} />)}</div>{startError && <p className="mt-3 text-sm text-[var(--em-danger)]">{startError}</p>}</GlassPanel>}</div>}

        {!loading && currentTask && <>
          {plan && <WorkbenchTaskHeader plan={plan} task={currentTask} state={companionJourneyState} onOpenPanel={setSidePanel} />}
          {feedback ? <XiaolianFeedbackBubble {...feedback} /> : null}
          <div className={cn('grid min-w-0 items-start gap-4', sidePanel ? 'xl:grid-cols-[minmax(14rem,1fr)_minmax(0,2fr)_minmax(15rem,1fr)]' : 'xl:grid-cols-[minmax(14rem,1fr)_minmax(0,2fr)_4.5rem]')}>
            <aside aria-label="模块大纲与检查点" className="min-w-0 space-y-4">
              <GlassPanel className="p-4">
                <h2 className="text-sm font-semibold">模块大纲</h2>
                {currentKnowledgeLoading && <p className="mt-3 text-xs text-[var(--em-muted-ink)]">正在读取当前课程章节…</p>}
                {!currentKnowledgeLoading && currentKnowledge?.sections.length ? <ol className="mt-3 space-y-1">{currentKnowledge.sections.map((section, index) => <li key={`${section.title}:${index}`}><a href={`#learning-section-${index}`} className="block rounded-lg px-2.5 py-2 text-xs leading-5 text-[var(--em-muted-ink)] hover:bg-[var(--em-primary-subtle)] hover:text-[var(--em-primary)]">{String(index + 1).padStart(2, '0')} · {section.title}</a></li>)}</ol> : <p className="mt-3 text-xs leading-5 text-[var(--em-muted-ink)]">当前知识点没有可展示的课程章节。</p>}
              </GlassPanel>
              <GlassPanel className="p-4">
                <h2 className="text-sm font-semibold">阶段检查点</h2>
                <p className="mt-1 text-[11px] leading-5 text-[var(--em-muted-ink)]">状态来自本任务已观察到的学习互动。</p>
                <ol className="mt-3 space-y-2">{stages.map((stage) => <li key={stage.id} aria-current={stage.status === 'current' ? 'step' : undefined} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--em-border)] px-3 py-2"><span className="text-xs font-medium">{stage.label}</span><span className="text-[10px] text-[var(--em-muted-ink)]">{stage.status === 'completed' ? '已记录' : stage.status === 'current' ? '当前阶段' : '等待'}</span></li>)}</ol>
              </GlassPanel>
            </aside>

            <main aria-label="课程材料与练习" className="min-w-0 space-y-4">
              <GlassPanel className="p-5">
                <p className="text-[10px] font-semibold text-[var(--em-primary-deep)]">课程材料</p>
                <h2 className="mt-1 text-lg font-semibold">{currentKnowledge?.title ?? currentTask.knowledgePointName}</h2>
                {currentKnowledge && <MaterialProvenance material={currentKnowledge} />}
                {currentKnowledgeLoading && <p className="mt-3 text-sm text-[var(--em-muted-ink)]">正在读取当前知识点内容…</p>}
                {knowledge.error && <p role="alert" className="mt-3 text-sm text-[var(--em-danger)]">课程材料暂时无法读取。</p>}
                {!currentKnowledgeLoading && !knowledge.error && currentKnowledge?.sections.length ? <div className="mt-4 space-y-4">{currentKnowledge.sections.map((section, index) => <section id={`learning-section-${index}`} key={`${section.title}:${index}`} className="scroll-mt-6 border-t border-[var(--em-border)] pt-4 first:border-0 first:pt-0"><h3 className="text-sm font-semibold">{section.title}</h3><MarkdownText className="mt-2 text-sm leading-7 text-[var(--em-muted-ink)]" content={section.content} showLineNumbers /></section>)}</div> : !currentKnowledgeLoading && !knowledge.error && <p className="mt-3 text-sm leading-6 text-[var(--em-muted-ink)]">当前知识点没有返回可展示的课程正文。</p>}
              </GlassPanel>
              <ModulePractice key={currentTask.id} taskId={currentTask.id} knowledgePointId={currentTask.knowledgePointId} knowledgePointName={currentTask.knowledgePointName} onEvaluationPendingChange={handleEvaluationPending} onEvaluationComplete={handleEvaluationComplete} onPracticeComplete={async (replanning) => { const [profileUpdated, diagnosisUpdated, planUpdated, evidenceUpdated] = await Promise.all([profile.refetch(), diagnosis.refetch(), replanning.status === 'performed' ? refetch() : Promise.resolve(true), evidence.refetch()]); return profileUpdated && diagnosisUpdated && planUpdated && evidenceUpdated; }} />
              {currentEvaluation && <Link to={buildReflectionHref(currentTask)} className="flex items-center justify-between rounded-xl border border-[var(--em-border)] bg-[var(--em-primary-subtle)] px-4 py-3 text-sm font-semibold text-[var(--em-primary)]"><span>练习结果已记录 · 继续复盘</span><ArrowRight className="h-4 w-4" /></Link>}
            </main>

            <aside aria-label="小涟与学习证据" className="min-w-0">
              {sidePanel ? <GlassPanel className="min-w-0 p-3">
                <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2">{sidePanel === 'guide' && <XiaolianCharacter runtimeState={runtimeState} companionState={companionState} size="sm" speaking={tutorSpeaking} />}<h2 className="text-sm font-semibold">{SIDE_PANEL_CHOICES.find((item) => item.id === sidePanel)?.label}</h2></div><button type="button" aria-label="折叠学伴与证据" onClick={() => setSidePanel(null)} className="rounded-lg border border-[var(--em-border)] px-2 py-1 text-xs text-[var(--em-muted-ink)]">收起</button></div>
                <nav aria-label="学伴与证据面板" className="mt-3 grid grid-cols-2 gap-1">{SIDE_PANEL_CHOICES.map((item) => <button key={item.id} type="button" aria-pressed={sidePanel === item.id} onClick={() => setSidePanel(item.id)} className={cn('rounded-lg border px-2 py-1.5 text-[10px]', sidePanel === item.id ? 'border-[var(--em-primary)] bg-[var(--em-primary-subtle)] text-[var(--em-primary)]' : 'border-[var(--em-border)] text-[var(--em-muted-ink)]')}>{item.label}</button>)}</nav>
                <div className="mt-3 min-w-0">
                  {sidePanel === 'guide' && <SpaceTutor key={currentTask.id} knowledgePointId={currentTask.knowledgePointId} knowledgePointName={currentTask.knowledgePointName} knowledge={currentKnowledge} quickQuestions={resolveQuickQuestions(currentTask.knowledgePointId, currentTask.knowledgePointName)} onPendingChange={handleTutorPending} onResponse={handleTutorResponse} onOpenSources={openSourcesPanel} onSpeakingChange={setTutorSpeaking} />}
                  {sidePanel === 'artifacts' && <WorkspaceArtifactsPanel scope={artifactScope} onScopeChange={setArtifactScope} task={currentTask} knowledge={currentKnowledge} knowledgeLoading={currentKnowledgeLoading} knowledgeError={knowledge.error} currentDiagnosis={currentDiagnosis} isPrimaryFocus={diagnosis.data?.primaryFocus?.knowledgePointId === currentTask.knowledgePointId} sources={currentTutorResponse?.sources ?? []} practiceEvaluation={currentEvaluation} reflection={storedReflectionResult} evidenceLearningStarted={currentEvidence.learningStarted.length} evidencePracticeEvaluated={currentEvidence.practiceEvaluated.length} />}
                  {sidePanel === 'history' && <WorkspaceHistoryPanel tasks={tasks} evidence={evidence.data ?? []} practiceEvaluations={storedPracticeEvaluations} reflectionResults={storedReflectionResults} loading={evidence.loading} error={evidence.error} onRetry={() => void evidence.refetch()} />}
                  {sidePanel === 'context' && <WorkspaceContextPanel courseName={profile.data?.courseName ?? ACTIVE_COURSE_ID} task={currentTask} planTaskCount={tasks.length} currentDiagnosis={currentDiagnosis} diagnosisLoading={diagnosis.loading} learnerId={ACTIVE_LEARNER_ID} courseId={ACTIVE_COURSE_ID} evidence={evidence.data ?? []} evidenceLoading={evidence.loading} evidenceError={evidence.error} onRetryEvidence={() => void evidence.refetch()} response={currentTutorResponse} />}
                  {sidePanel === 'sources' && ((sidePanelSources.length > 0 ? sidePanelSources : currentTutorResponse?.sources ?? []).length > 0 ? <SourceReferences sources={sidePanelSources.length > 0 ? sidePanelSources : currentTutorResponse?.sources ?? []} /> : <p className="text-xs leading-5 text-[var(--em-muted-ink)]">小涟最近一次回答没有返回课程来源。</p>)}
                </div>
              </GlassPanel> : <button type="button" aria-expanded="false" onClick={() => setSidePanel('guide')} className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-3 text-center text-xs font-semibold text-[var(--em-muted-ink)] hover:border-[var(--em-primary)] hover:bg-[var(--em-primary-subtle)]"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--em-surface-subtle)] text-[var(--em-primary)]"><ArrowLeft className="h-4 w-4" /></span><span className="xl:[writing-mode:vertical-rl]">展开小涟与证据</span><span className="text-[10px] font-normal">{currentEvidence.learningStarted.length + currentEvidence.practiceEvaluated.length} 条本任务记录</span></button>}
            </aside>
          </div>
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
