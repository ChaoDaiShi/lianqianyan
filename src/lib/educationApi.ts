import { api, extractApiData } from '@/lib/api';
import type {
  DiagnosisResult,
  DiagnosisStatus,
  LearnerProfile,
  PersistedStudyPlan,
  PersistedStudyPlanSummary,
  PersistedStudyTask,
  PlanStatus,
  PlanStrategy,
  PlannerActionType,
  PlannerReasonCode,
  AnswerGradingStatus,
  ExamAnalytics,
  ExamAnswerValue,
  ExamAttempt,
  ExamAttemptStatus,
  ExamAttemptSummary,
  ExamCatalogItem,
  ExamDefinition,
  ExamGenerationInput,
  ExamGenerationResult,
  ExamDraftInput,
  ExamQuestion,
  ExamQuestionType,
  ExamResult,
  ExamResultAnswer,
  ExamStatus,
  ExamUpdateInput,
  GradingStrategy,
  KnowledgeExamPerformance,
  QuestionCreateInput,
  QuestionResponseKind,
  QuestionTypeCreateInput,
  QuestionTypeUpdateInput,
  QuestionUpdateInput,
  ReviewQueueItem,
} from '@/domain';

/** EducationMind —— 前端 API 客户端。 */

export interface HealthResponse {
  status: string;
  service: string;
}

export interface LearningEvidence {
  id: string;
  learnerId: string;
  evidenceType: 'learning_started' | 'practice_answer_evaluated' | 'exam_answer_evaluated';
  source: 'current_study_plan' | 'recommended_path' | 'learning_space' | 'exam_system';
  courseId?: string;
  knowledgePointId?: string;
  questionId?: string;
  sessionId?: string;
  masteryDelta?: number;
  payload: Record<string, unknown>;
  occurredAt: string;
}

export interface LearningStartResult {
  message: string;
  evidence: LearningEvidence;
  sessionId: string;
}

export interface PracticeEvaluationRequest {
  learnerId: string;
  courseId: string;
  knowledgePointId: string;
  questionId: string;
  isCorrect: boolean;
  score: number;
  difficulty: number;
}

export type ReplanningReasonCode =
  | 'PRIMARY_FOCUS_CHANGED'
  | 'TASK_ACTION_CHANGED'
  | 'TASK_SET_CHANGED'
  | 'TASK_ORDER_CHANGED'
  | 'TOP_TASK_RESOLVED'
  | 'NO_MATERIAL_CHANGE'
  | 'NO_ACTIVE_PLAN';

export type ReplanningStatus = 'not_needed' | 'performed' | 'failed';

export interface ReplanningTaskPreview {
  knowledgePointId: string;
  knowledgePointName: string;
  actionType: PlannerActionType;
}

export interface ReplanningResult {
  status: ReplanningStatus;
  performed: boolean;
  reasonCodes: ReplanningReasonCode[];
  previousPlanId: string | null;
  newPlan: PersistedStudyPlan | null;
  previousTopTask: ReplanningTaskPreview | null;
  newTopTask: ReplanningTaskPreview | null;
}

export interface PracticeEvaluationResponse {
  evidence: LearningEvidence;
  masteryBefore: number;
  masteryAfter: number;
  confidence: number;
  evidenceCount: number;
  message: string;
  replanning: ReplanningResult;
}

export interface MasteryState {
  knowledgePointId: string;
  masteryScore: number;
  confidence: number;
  evidenceCount: number;
  updatedAt: string;
}

export interface TutorChatRequest {
  learnerId: string;
  courseId: string;
  message: string;
}

export interface TutorChatResponse {
  answer: string;
  contextUsed: string[];
  suggestedActions: string[];
  source: 'llm' | 'fallback';
  provider: string;
  model: string | null;
  sources: KnowledgeSource[];
}

export interface KnowledgeSource {
  id: string;
  title: string;
  section: string;
  knowledgePointId: string;
  excerpt: string;
}

export interface RetrievedKnowledge {
  chunkId: string;
  documentId: string;
  title: string;
  section: string;
  knowledgePointId: string;
  content: string;
  score: number;
  source: string;
}

export interface KnowledgePointContent {
  knowledgePointId: string;
  title: string;
  sections: Array<{ title: string; content: string }>;
}

export interface LlmStatus {
  provider: string;
  model: string | null;
  configured: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  capability: string;
  readOnly: boolean;
  inputSchema: Record<string, unknown>;
}

export interface NetworkSearchResult {
  title: string;
  summary: string;
  url: string;
  sourceDomain: string;
}

export interface NetworkSearchResponse {
  provider: 'wikipedia';
  query: string;
  results: NetworkSearchResult[];
}

export type CompileStageName =
  | 'preprocess'
  | 'syntax'
  | 'semantic'
  | 'link'
  | 'run';

export interface CompileStage {
  name: CompileStageName;
  label: string;
  status: 'passed' | 'failed' | 'skipped';
}

export interface CompileDiagnostic {
  stage: CompileStageName;
  severity: 'error' | 'warning';
  line: number | null;
  code: string;
  message: string;
}

export interface CompileSimulationResponse {
  success: boolean;
  language: 'c-edu';
  mode: 'simulation';
  stages: CompileStage[];
  diagnostics: CompileDiagnostic[];
  stdout: string;
  safetyNotice: string;
}

export type ResourceType =
  | 'study_sheet'
  | 'flashcards'
  | 'quiz'
  | 'mind_map'
  | 'study_plan';

export interface GeneratedResource {
  title: string;
  resourceType: ResourceType;
  format: 'markdown';
  content: string;
  generationMode: 'course_template';
  sourceSections: string[];
  filename: string;
}

export type AgentCapability = 'diagnosis' | 'planning' | 'tutoring' | 'assessment';

export interface AgentTraceItem {
  agent: AgentCapability | string;
  name?: string | null;
  label: string;
  status: string;
  type: 'agent' | 'tool';
}

export interface SuggestedAction {
  type: string;
  label: string;
}

export interface AgentChatRequest {
  learnerId: string;
  courseId: string;
  message: string;
  capability?: AgentCapability | null;
  knowledgePointId?: string;
}

export interface AgentChatResponse {
  answer: string;
  selectedCapability: AgentCapability;
  provider: string;
  model: string | null;
  responseMode: 'provider' | 'fallback';
  sources: KnowledgeSource[];
  contextUsed: string[];
  suggestedActions: SuggestedAction[];
  agentTrace: AgentTraceItem[];
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>('/api/health');
  return extractApiData<HealthResponse>(response);
}

export async function chatWithTutor(
  request: TutorChatRequest
): Promise<TutorChatResponse> {
  const response = await api.post<Record<string, unknown>>('/api/tutor/chat', {
    learner_id: request.learnerId,
    course_id: request.courseId,
    message: request.message,
  });
  const raw = extractApiData(response);
  return {
    answer: raw['answer'] as string,
    contextUsed: (raw['context_used'] as string[]) ?? [],
    suggestedActions: (raw['suggested_actions'] as string[]) ?? [],
    source: raw['source'] as 'llm' | 'fallback',
    provider: (raw['provider'] as string) ?? 'none',
    model: (raw['model'] as string | null) ?? null,
    sources: mapSources(raw['sources']),
  };
}

export async function chatWithAgents(
  request: AgentChatRequest
): Promise<AgentChatResponse> {
  const response = await api.post<Record<string, unknown>>('/api/agents/chat', {
    learner_id: request.learnerId,
    course_id: request.courseId,
    message: request.message,
    capability: request.capability ?? null,
    knowledge_point_id: request.knowledgePointId ?? null,
  });
  const raw = extractApiData(response);
  return {
    answer: raw['answer'] as string,
    selectedCapability: raw['selected_capability'] as AgentCapability,
    provider: (raw['provider'] as string) ?? 'none',
    model: (raw['model'] as string | null) ?? null,
    responseMode: (raw['response_mode'] as 'provider' | 'fallback') ?? 'provider',
    sources: mapSources(raw['sources']),
    contextUsed: (raw['context_used'] as string[]) ?? [],
    suggestedActions: ((raw['suggested_actions'] as unknown[]) ?? []).map((item) => {
      const action = item as Record<string, unknown>;
      return { type: action['type'] as string, label: action['label'] as string };
    }),
    agentTrace: ((raw['agent_trace'] as unknown[]) ?? []).map((item) => {
      const trace = item as Record<string, unknown>;
      return {
        agent: trace['agent'] as AgentTraceItem['agent'],
        name: (trace['name'] as string | null) ?? null,
        label: trace['label'] as string,
        status: trace['status'] as string,
        type: (trace['type'] as 'agent' | 'tool') ?? 'agent',
      };
    }),
  };
}

export async function fetchToolCatalog(): Promise<ToolDefinition[]> {
  const response = await api.get<unknown[]>('/api/tools');
  const raw = extractApiData<unknown[]>(response);
  return ((raw as Record<string, unknown>[]) ?? []).map((item) => ({
    name: item['name'] as string,
    description: item['description'] as string,
    capability: item['capability'] as string,
    readOnly: item['read_only'] as boolean,
    inputSchema: (item['input_schema'] as Record<string, unknown>) ?? {},
  }));
}

export async function fetchLlmStatus(): Promise<LlmStatus> {
  const response = await api.get<Record<string, unknown>>('/api/system/llm');
  const raw = extractApiData(response);
  return {
    provider: raw['provider'] as string,
    model: (raw['model'] as string | null) ?? null,
    configured: raw['configured'] as boolean,
  };
}

export function mapNetworkSearch(
  raw: Record<string, unknown>,
): NetworkSearchResponse {
  return {
    provider: raw['provider'] as 'wikipedia',
    query: raw['query'] as string,
    results: ((raw['results'] as unknown[]) ?? []).map((item) => {
      const result = item as Record<string, unknown>;
      return {
        title: result['title'] as string,
        summary: result['summary'] as string,
        url: result['url'] as string,
        sourceDomain: result['source_domain'] as string,
      };
    }),
  };
}

export async function searchNetwork(params: {
  query: string;
  limit?: number;
  language?: 'zh' | 'en';
}): Promise<NetworkSearchResponse> {
  const response = await api.post<Record<string, unknown>>(
    '/api/network/search',
    {
      query: params.query,
      limit: params.limit ?? 4,
      language: params.language ?? 'zh',
    },
  );
  return mapNetworkSearch(extractApiData(response));
}

export function mapCompileSimulation(
  raw: Record<string, unknown>,
): CompileSimulationResponse {
  return {
    success: raw['success'] as boolean,
    language: raw['language'] as 'c-edu',
    mode: raw['mode'] as 'simulation',
    stages: ((raw['stages'] as unknown[]) ?? []).map((item) => {
      const stage = item as Record<string, unknown>;
      return {
        name: stage['name'] as CompileStageName,
        label: stage['label'] as string,
        status: stage['status'] as CompileStage['status'],
      };
    }),
    diagnostics: ((raw['diagnostics'] as unknown[]) ?? []).map((item) => {
      const diagnostic = item as Record<string, unknown>;
      return {
        stage: diagnostic['stage'] as CompileStageName,
        severity: diagnostic['severity'] as CompileDiagnostic['severity'],
        line: (diagnostic['line'] as number | null) ?? null,
        code: diagnostic['code'] as string,
        message: diagnostic['message'] as string,
      };
    }),
    stdout: raw['stdout'] as string,
    safetyNotice: raw['safety_notice'] as string,
  };
}

export async function simulateCompile(
  code: string,
): Promise<CompileSimulationResponse> {
  const response = await api.post<Record<string, unknown>>(
    '/api/lab/compile-simulate',
    { language: 'c-edu', code },
  );
  return mapCompileSimulation(extractApiData(response));
}

export function mapGeneratedResource(
  raw: Record<string, unknown>,
): GeneratedResource {
  return {
    title: raw['title'] as string,
    resourceType: raw['resource_type'] as ResourceType,
    format: raw['format'] as 'markdown',
    content: raw['content'] as string,
    generationMode: raw['generation_mode'] as 'course_template',
    sourceSections: (raw['source_sections'] as string[]) ?? [],
    filename: raw['filename'] as string,
  };
}

export async function generateLearningResource(params: {
  courseId: string;
  knowledgePointId: string;
  resourceType: ResourceType;
}): Promise<GeneratedResource> {
  const response = await api.post<Record<string, unknown>>(
    '/api/resources/generate',
    {
      course_id: params.courseId,
      knowledge_point_id: params.knowledgePointId,
      resource_type: params.resourceType,
    },
  );
  return mapGeneratedResource(extractApiData(response));
}

export async function searchKnowledge(params: {
  courseId: string;
  query: string;
  knowledgePointId?: string;
  topK?: number;
}): Promise<RetrievedKnowledge[]> {
  const response = await api.post<Record<string, unknown>>('/api/knowledge/search', {
    course_id: params.courseId,
    query: params.query,
    knowledge_point_id: params.knowledgePointId ?? null,
    top_k: params.topK ?? 4,
  });
  const raw = extractApiData(response);
  return ((raw['results'] as unknown[]) ?? []).map((item) => {
    const value = item as Record<string, unknown>;
    return {
      chunkId: value['chunk_id'] as string,
      documentId: value['document_id'] as string,
      title: value['title'] as string,
      section: value['section'] as string,
      knowledgePointId: value['knowledge_point_id'] as string,
      content: value['content'] as string,
      score: value['score'] as number,
      source: value['source'] as string,
    };
  });
}

export async function fetchKnowledgePoint(
  knowledgePointId: string,
  courseId = 'course-os'
): Promise<KnowledgePointContent> {
  const response = await api.get<Record<string, unknown>>(
    `/api/knowledge/points/${knowledgePointId}`,
    { params: { course_id: courseId } }
  );
  const raw = extractApiData(response);
  return {
    knowledgePointId: raw['knowledge_point_id'] as string,
    title: raw['title'] as string,
    sections: ((raw['sections'] as unknown[]) ?? []).map((item) => {
      const section = item as Record<string, unknown>;
      return { title: section['title'] as string, content: section['content'] as string };
    }),
  };
}

export async function startLearning(params: {
  learnerId: string;
  source: 'current_study_plan' | 'recommended_path';
  knowledgePointId?: string;
  courseId?: string;
  topic?: string;
}): Promise<LearningStartResult> {
  const query = new URLSearchParams();
  query.set('learner_id', params.learnerId);
  query.set('source', params.source);
  if (params.knowledgePointId) query.set('knowledge_point_id', params.knowledgePointId);
  if (params.courseId) query.set('course_id', params.courseId);
  if (params.topic) query.set('topic', params.topic);
  const response = await api.post<Record<string, unknown>>(`/api/learning/start?${query.toString()}`);
  const raw = extractApiData(response);
  const evidenceRaw = raw['evidence'] as Record<string, unknown>;
  return {
    message: raw['message'] as string,
    sessionId: raw['session_id'] as string,
    evidence: mapEvidence(evidenceRaw),
  };
}

export async function evaluatePractice(
  request: PracticeEvaluationRequest
): Promise<PracticeEvaluationResponse> {
  const response = await api.post<Record<string, unknown>>('/api/practice/evaluate', {
    learner_id: request.learnerId,
    course_id: request.courseId,
    knowledge_point_id: request.knowledgePointId,
    question_id: request.questionId,
    is_correct: request.isCorrect,
    score: request.score,
    difficulty: request.difficulty,
  });
  const raw = extractApiData(response);
  return {
    evidence: mapEvidence(raw['evidence'] as Record<string, unknown>),
    masteryBefore: raw['mastery_before'] as number,
    masteryAfter: raw['mastery_after'] as number,
    confidence: raw['confidence'] as number,
    evidenceCount: raw['evidence_count'] as number,
    message: raw['message'] as string,
    replanning: mapReplanningResult(raw['replanning'] as Record<string, unknown>),
  };
}

export async function replanPlan(
  learnerId: string,
  courseId = 'course-os'
): Promise<ReplanningResult> {
  const response = await api.post<Record<string, unknown>>('/api/plans/replan', {
    learner_id: learnerId,
    course_id: courseId,
  });
  return mapReplanningResult(extractApiData(response));
}

export async function fetchMastery(learnerId: string, knowledgePointId: string): Promise<MasteryState> {
  const response = await api.get<Record<string, unknown>>(`/api/profile/mastery/${knowledgePointId}`, {
    params: { learner_id: learnerId },
  });
  const raw = extractApiData(response);
  return {
    knowledgePointId: raw['knowledge_point_id'] as string,
    masteryScore: raw['mastery_score'] as number,
    confidence: raw['confidence'] as number,
    evidenceCount: raw['evidence_count'] as number,
    updatedAt: raw['updated_at'] as string,
  };
}

export async function fetchLearnerProfile(learnerId: string, courseId = 'course-os'): Promise<LearnerProfile> {
  const response = await api.get<Record<string, unknown>>(`/api/profile/${learnerId}`, { params: { course_id: courseId } });
  const raw = extractApiData(response);
  return {
    learnerId: raw['learner_id'] as string,
    courseId: raw['course_id'] as string,
    courseName: raw['course_name'] as string,
    overallMastery: (raw['overall_mastery'] as number | null) ?? null,
    overallConfidence: (raw['overall_confidence'] as number | null) ?? null,
    insufficientData: raw['insufficient_data'] as boolean,
    coverage: raw['coverage'] as number,
    totalKnowledgePoints: raw['total_knowledge_points'] as number,
    assessedCount: raw['assessed_count'] as number,
    unassessedCount: raw['unassessed_count'] as number,
    statusCounts: raw['status_counts'] as LearnerProfile['statusCounts'],
    knowledgePoints: ((raw['knowledge_points'] as unknown[]) ?? []).map((kp) => mapKpDiagnosis(kp as Record<string, unknown>)),
    updatedAt: raw['updated_at'] as string,
  };
}

export async function fetchDiagnosis(learnerId: string, courseId = 'course-os'): Promise<DiagnosisResult> {
  const response = await api.get<Record<string, unknown>>(`/api/diagnosis/${learnerId}`, { params: { course_id: courseId } });
  const raw = extractApiData(response);
  const list = (key: string) => ((raw[key] as unknown[]) ?? []).map((kp) => mapKpDiagnosis(kp as Record<string, unknown>));
  return {
    learnerId: raw['learner_id'] as string,
    courseId: raw['course_id'] as string,
    courseName: raw['course_name'] as string,
    primaryFocus: raw['primary_focus'] ? mapKpDiagnosis(raw['primary_focus'] as Record<string, unknown>) : null,
    priorityInterventions: list('priority_interventions'),
    strengths: list('strengths'),
    weakPoints: list('weak_points'),
    developingPoints: list('developing_points'),
    unassessedPoints: list('unassessed_points'),
    summaryCodes: raw['summary_codes'] as DiagnosisResult['summaryCodes'],
    diagnosisGeneratedAt: raw['diagnosis_generated_at'] as string,
  };
}

export async function fetchPlanHistory(learnerId: string, courseId = 'course-os'): Promise<PersistedStudyPlanSummary[]> {
  const response = await api.get<unknown[]>('/api/plans', { params: { learner_id: learnerId, course_id: courseId } });
  const raw = extractApiData<unknown[]>(response);
  return ((raw as Record<string, unknown>[]) ?? []).map(mapPlanSummary);
}

export function isCurrentPlanResponseStatus(status: number): boolean {
  return (status >= 200 && status < 300) || status === 404;
}

export async function fetchCurrentPlan(learnerId: string, courseId = 'course-os'): Promise<PersistedStudyPlan | null> {
  const response = await api.get<Record<string, unknown>>('/api/plans/current', {
    params: { learner_id: learnerId, course_id: courseId },
    validateStatus: isCurrentPlanResponseStatus,
  });
  return response.status === 404
    ? null
    : mapPlanFromRaw(extractApiData(response));
}

export async function generatePlan(learnerId: string, courseId = 'course-os'): Promise<PersistedStudyPlan> {
  const response = await api.post<Record<string, unknown>>('/api/plans/generate', { learner_id: learnerId, course_id: courseId });
  return mapPlanFromRaw(extractApiData(response));
}

export async function fetchPlanDetail(planId: string): Promise<PersistedStudyPlan> {
  const response = await api.get<Record<string, unknown>>(`/api/plans/${planId}`);
  return mapPlanFromRaw(extractApiData(response));
}

function mapReplanningResult(raw: Record<string, unknown>): ReplanningResult {
  const mapPreview = (value: unknown): ReplanningTaskPreview | null => {
    if (!value) return null;
    const preview = value as Record<string, unknown>;
    return {
      knowledgePointId: preview['knowledge_point_id'] as string,
      knowledgePointName: preview['knowledge_point_name'] as string,
      actionType: preview['action_type'] as PlannerActionType,
    };
  };
  return {
    status: raw['status'] as ReplanningStatus,
    performed: raw['performed'] as boolean,
    reasonCodes: (raw['reason_codes'] as ReplanningReasonCode[]) ?? [],
    previousPlanId: (raw['previous_plan_id'] as string | null) ?? null,
    newPlan: raw['new_plan'] ? mapPlanFromRaw(raw['new_plan'] as Record<string, unknown>) : null,
    previousTopTask: mapPreview(raw['previous_top_task']),
    newTopTask: mapPreview(raw['new_top_task']),
  };
}

function mapPlanFromRaw(raw: Record<string, unknown>): PersistedStudyPlan {
  return {
    id: raw['id'] as string,
    learnerId: raw['learner_id'] as string,
    courseId: raw['course_id'] as string,
    status: raw['status'] as PlanStatus,
    strategy: raw['strategy'] as PlanStrategy,
    generatedAt: raw['generated_at'] as string,
    sourceDiagnosisGeneratedAt: raw['source_diagnosis_generated_at'] as string,
    reasonCodes: (raw['reason_codes'] as PlannerReasonCode[]) ?? [],
    createdAt: raw['created_at'] as string,
    updatedAt: raw['updated_at'] as string,
    tasks: ((raw['tasks'] as unknown[]) ?? []).map((task) => mapTaskFromRaw(task as Record<string, unknown>)),
  };
}

function mapPlanSummary(raw: Record<string, unknown>): PersistedStudyPlanSummary {
  return {
    id: raw['id'] as string,
    learnerId: raw['learner_id'] as string,
    courseId: raw['course_id'] as string,
    strategy: raw['strategy'] as PlanStrategy,
    status: raw['status'] as PlanStatus,
    generatedAt: raw['generated_at'] as string,
    createdAt: raw['created_at'] as string,
    taskCount: raw['task_count'] as number,
    reasonCodes: (raw['reason_codes'] as PlannerReasonCode[]) ?? [],
  };
}

function mapTaskFromRaw(raw: Record<string, unknown>): PersistedStudyTask {
  return {
    id: raw['id'] as string,
    planId: raw['plan_id'] as string,
    draftKey: raw['draft_key'] as string,
    knowledgePointId: raw['knowledge_point_id'] as string,
    knowledgePointName: raw['knowledge_point_name'] as string,
    actionType: raw['action_type'] as PlannerActionType,
    priority: raw['priority'] as number,
    estimatedMinutes: raw['estimated_minutes'] as number,
    reasonCodes: (raw['reason_codes'] as PlannerReasonCode[]) ?? [],
    sourceStatus: raw['source_status'] as DiagnosisStatus,
    sourcePriorityScore: raw['source_priority_score'] as number,
    order: raw['order'] as number,
    createdAt: raw['created_at'] as string,
  };
}

export async function fetchRecentEvidence(): Promise<LearningEvidence[]> {
  const response = await api.get<unknown[]>('/api/learning/evidence');
  const raw = extractApiData<unknown[]>(response);
  return ((raw as Record<string, unknown>[]) ?? []).map(mapEvidence);
}

function mapSources(raw: unknown): KnowledgeSource[] {
  return ((raw as unknown[]) ?? []).map((item) => {
    const source = item as Record<string, unknown>;
    return {
      id: source['id'] as string,
      title: source['title'] as string,
      section: source['section'] as string,
      knowledgePointId: source['knowledge_point_id'] as string,
      excerpt: source['excerpt'] as string,
    };
  });
}

function mapEvidence(raw: Record<string, unknown>): LearningEvidence {
  return {
    id: raw['id'] as string,
    learnerId: raw['learner_id'] as string,
    evidenceType: raw['evidence_type'] as LearningEvidence['evidenceType'],
    source: raw['source'] as LearningEvidence['source'],
    courseId: raw['course_id'] as string | undefined,
    knowledgePointId: raw['knowledge_point_id'] as string | undefined,
    questionId: raw['question_id'] as string | undefined,
    sessionId: raw['session_id'] as string | undefined,
    masteryDelta: raw['mastery_delta'] as number | undefined,
    payload: (raw['payload'] as Record<string, unknown>) ?? {},
    occurredAt: raw['occurred_at'] as string,
  };
}

function mapKpDiagnosis(raw: Record<string, unknown>) {
  return {
    knowledgePointId: raw['knowledge_point_id'] as string,
    knowledgePointName: raw['knowledge_point_name'] as string,
    masteryScore: raw['mastery_score'] as number,
    confidence: raw['confidence'] as number,
    evidenceCount: raw['evidence_count'] as number,
    status: raw['status'] as DiagnosisStatus,
    priorityScore: raw['priority_score'] as number,
    reasonCodes: raw['reason_codes'] as DiagnosisResult['summaryCodes'],
  };
}

export function mapQuestionType(raw: Record<string, unknown>): ExamQuestionType {
  return {
    id: raw['id'] as string,
    name: raw['name'] as string,
    description: (raw['description'] as string) ?? '',
    responseKind: raw['response_kind'] as QuestionResponseKind,
    gradingStrategy: raw['grading_strategy'] as GradingStrategy,
    isBuiltin: raw['is_builtin'] as boolean,
    isArchived: raw['is_archived'] as boolean,
    createdAt: raw['created_at'] as string,
    updatedAt: raw['updated_at'] as string,
  };
}

export function mapQuestion(raw: Record<string, unknown>): ExamQuestion {
  return {
    id: raw['id'] as string,
    courseId: raw['course_id'] as string,
    knowledgePointId: (raw['knowledge_point_id'] as string | null) ?? null,
    questionTypeId: raw['question_type_id'] as string,
    questionTypeName: raw['question_type_name'] as string,
    responseKind: raw['response_kind'] as QuestionResponseKind,
    gradingStrategy: raw['grading_strategy'] as GradingStrategy,
    prompt: raw['prompt'] as string,
    options: (raw['options'] as string[]) ?? [],
    correctAnswer: (raw['correct_answer'] as ExamAnswerValue) ?? null,
    keywords: (raw['keywords'] as string[]) ?? [],
    explanation: (raw['explanation'] as string) ?? '',
    difficulty: raw['difficulty'] as number,
    defaultScore: raw['default_score'] as number,
    isArchived: raw['is_archived'] as boolean,
    createdAt: raw['created_at'] as string,
    updatedAt: raw['updated_at'] as string,
  };
}

export function mapExam(raw: Record<string, unknown>): ExamDefinition {
  return {
    id: raw['id'] as string,
    courseId: raw['course_id'] as string,
    title: raw['title'] as string,
    description: (raw['description'] as string) ?? '',
    durationMinutes: raw['duration_minutes'] as number,
    passPercentage: raw['pass_percentage'] as number,
    shuffleQuestions: raw['shuffle_questions'] as boolean,
    status: raw['status'] as ExamStatus,
    items: ((raw['items'] as unknown[]) ?? []).map((item) => {
      const value = item as Record<string, unknown>;
      return {
        id: value['id'] as string,
        questionId: value['question_id'] as string,
        points: value['points'] as number,
        position: value['position'] as number,
        question: mapQuestion(value['question'] as Record<string, unknown>),
      };
    }),
    totalPoints: raw['total_points'] as number,
    createdAt: raw['created_at'] as string,
    updatedAt: raw['updated_at'] as string,
    publishedAt: (raw['published_at'] as string | null) ?? null,
  };
}

export function mapExamGenerationResult(
  raw: Record<string, unknown>,
): ExamGenerationResult {
  return {
    exam: mapExam(raw['exam'] as Record<string, unknown>),
    generationMode: raw['generation_mode'] as ExamGenerationResult['generationMode'],
    provider: (raw['provider'] as string | null) ?? null,
    model: (raw['model'] as string | null) ?? null,
    sourceSections: (raw['source_sections'] as string[]) ?? [],
    warnings: (raw['warnings'] as string[]) ?? [],
  };
}

export function mapExamAttempt(raw: Record<string, unknown>): ExamAttempt {
  return {
    id: raw['id'] as string,
    examId: raw['exam_id'] as string,
    learnerId: raw['learner_id'] as string,
    examTitle: raw['exam_title'] as string,
    status: raw['status'] as ExamAttemptStatus,
    startedAt: raw['started_at'] as string,
    expiresAt: raw['expires_at'] as string,
    submittedAt: (raw['submitted_at'] as string | null) ?? null,
    questions: ((raw['questions'] as unknown[]) ?? []).map((item) => {
      const value = item as Record<string, unknown>;
      return {
        questionId: value['question_id'] as string,
        questionTypeName: value['question_type_name'] as string,
        responseKind: value['response_kind'] as QuestionResponseKind,
        prompt: value['prompt'] as string,
        options: (value['options'] as string[]) ?? [],
        points: value['points'] as number,
        position: value['position'] as number,
        userAnswer: (value['user_answer'] as ExamAnswerValue) ?? null,
        savedAt: (value['saved_at'] as string | null) ?? null,
      };
    }),
  };
}

export function mapExamAttemptSummary(
  raw: Record<string, unknown>,
): ExamAttemptSummary {
  return {
    id: raw['id'] as string,
    examId: raw['exam_id'] as string,
    learnerId: raw['learner_id'] as string,
    examTitle: raw['exam_title'] as string,
    status: raw['status'] as ExamAttemptStatus,
    startedAt: raw['started_at'] as string,
    expiresAt: raw['expires_at'] as string,
    submittedAt: (raw['submitted_at'] as string | null) ?? null,
    awardedScore: raw['awarded_score'] as number,
    maxScore: raw['max_score'] as number,
    pendingScore: raw['pending_score'] as number,
    percentage: raw['percentage'] as number,
    passed: (raw['passed'] as boolean | null) ?? null,
  };
}

export function mapExamResult(raw: Record<string, unknown>): ExamResult {
  const summary = mapExamAttemptSummary(raw);
  return {
    ...summary,
    answers: ((raw['answers'] as unknown[]) ?? []).map((item) => {
      const value = item as Record<string, unknown>;
      return {
        answerId: value['answer_id'] as string,
        questionId: value['question_id'] as string,
        questionTypeName: value['question_type_name'] as string,
        responseKind: value['response_kind'] as QuestionResponseKind,
        gradingStrategy: value['grading_strategy'] as GradingStrategy,
        prompt: value['prompt'] as string,
        options: (value['options'] as string[]) ?? [],
        userAnswer: (value['user_answer'] as ExamAnswerValue) ?? null,
        correctAnswer: (value['correct_answer'] as ExamAnswerValue) ?? null,
        keywords: (value['keywords'] as string[]) ?? [],
        explanation: (value['explanation'] as string) ?? '',
        points: value['points'] as number,
        awardedScore: (value['awarded_score'] as number | null) ?? null,
        isCorrect: (value['is_correct'] as boolean | null) ?? null,
        gradingStatus: value['grading_status'] as AnswerGradingStatus,
        feedback: (value['feedback'] as string) ?? '',
      } satisfies ExamResultAnswer;
    }),
  };
}

function mapCatalogExam(raw: Record<string, unknown>): ExamCatalogItem {
  return {
    id: raw['id'] as string,
    courseId: raw['course_id'] as string,
    title: raw['title'] as string,
    description: (raw['description'] as string) ?? '',
    durationMinutes: raw['duration_minutes'] as number,
    passPercentage: raw['pass_percentage'] as number,
    questionCount: raw['question_count'] as number,
    totalPoints: raw['total_points'] as number,
    publishedAt: raw['published_at'] as string,
    latestAttempt: raw['latest_attempt']
      ? mapExamAttemptSummary(raw['latest_attempt'] as Record<string, unknown>)
      : null,
  };
}

function mapReviewQueueItem(raw: Record<string, unknown>): ReviewQueueItem {
  return {
    answerId: raw['answer_id'] as string,
    attemptId: raw['attempt_id'] as string,
    examId: raw['exam_id'] as string,
    examTitle: raw['exam_title'] as string,
    learnerId: raw['learner_id'] as string,
    questionId: raw['question_id'] as string,
    prompt: raw['prompt'] as string,
    userAnswer: (raw['user_answer'] as ExamAnswerValue) ?? null,
    referenceAnswer: (raw['reference_answer'] as ExamAnswerValue) ?? null,
    points: raw['points'] as number,
    submittedAt: raw['submitted_at'] as string,
  };
}

export function mapExamAnalytics(raw: Record<string, unknown>): ExamAnalytics {
  return {
    learnerId: raw['learner_id'] as string,
    courseId: raw['course_id'] as string,
    submittedCount: raw['submitted_count'] as number,
    gradedCount: raw['graded_count'] as number,
    averagePercentage: (raw['average_percentage'] as number | null) ?? null,
    bestPercentage: (raw['best_percentage'] as number | null) ?? null,
    passRate: (raw['pass_rate'] as number | null) ?? null,
    objectiveAccuracy: (raw['objective_accuracy'] as number | null) ?? null,
    pendingReviewCount: raw['pending_review_count'] as number,
    knowledgePoints: ((raw['knowledge_points'] as unknown[]) ?? []).map((item) => {
      const value = item as Record<string, unknown>;
      return {
        knowledgePointId: value['knowledge_point_id'] as string,
        knowledgePointName: value['knowledge_point_name'] as string,
        answeredCount: value['answered_count'] as number,
        averageScoreRatio: value['average_score_ratio'] as number,
      } satisfies KnowledgeExamPerformance;
    }),
  };
}

export async function fetchExamQuestionTypes(): Promise<ExamQuestionType[]> {
  const response = await api.get<unknown[]>('/api/exams/question-types');
  return (extractApiData<unknown[]>(response) as Record<string, unknown>[]).map(
    mapQuestionType,
  );
}

export async function createExamQuestionType(
  input: QuestionTypeCreateInput,
): Promise<ExamQuestionType> {
  const response = await api.post<Record<string, unknown>>(
    '/api/exams/question-types',
    {
      name: input.name,
      description: input.description ?? '',
      response_kind: input.responseKind,
      grading_strategy: input.gradingStrategy,
    },
  );
  return mapQuestionType(extractApiData(response));
}

export async function updateExamQuestionType(
  questionTypeId: string,
  input: QuestionTypeUpdateInput,
): Promise<ExamQuestionType> {
  const response = await api.patch<Record<string, unknown>>(
    `/api/exams/question-types/${questionTypeId}`,
    {
      name: input.name,
      description: input.description,
      response_kind: input.responseKind,
      grading_strategy: input.gradingStrategy,
      is_archived: input.isArchived,
    },
  );
  return mapQuestionType(extractApiData(response));
}

export async function fetchExamQuestions(courseId: string): Promise<ExamQuestion[]> {
  const response = await api.get<unknown[]>('/api/exams/questions', {
    params: { course_id: courseId },
  });
  return (extractApiData<unknown[]>(response) as Record<string, unknown>[]).map(
    mapQuestion,
  );
}

function questionPayload(input: QuestionCreateInput | QuestionUpdateInput) {
  return {
    course_id: 'courseId' in input ? input.courseId : undefined,
    knowledge_point_id: input.knowledgePointId,
    question_type_id: input.questionTypeId,
    prompt: input.prompt,
    options: input.options,
    correct_answer: input.correctAnswer,
    keywords: input.keywords,
    explanation: input.explanation,
    difficulty: input.difficulty,
    default_score: input.defaultScore,
    is_archived: 'isArchived' in input ? input.isArchived : undefined,
  };
}

export async function createExamQuestion(
  input: QuestionCreateInput,
): Promise<ExamQuestion> {
  const response = await api.post<Record<string, unknown>>(
    '/api/exams/questions',
    {
      ...questionPayload(input),
      knowledge_point_id: input.knowledgePointId ?? null,
      options: input.options ?? [],
      correct_answer: input.correctAnswer ?? null,
      keywords: input.keywords ?? [],
      explanation: input.explanation ?? '',
    },
  );
  return mapQuestion(extractApiData(response));
}

export async function updateExamQuestion(
  questionId: string,
  input: QuestionUpdateInput,
): Promise<ExamQuestion> {
  const response = await api.patch<Record<string, unknown>>(
    `/api/exams/questions/${questionId}`,
    questionPayload(input),
  );
  return mapQuestion(extractApiData(response));
}

function examPayload(input: ExamDraftInput | ExamUpdateInput) {
  return {
    course_id: 'courseId' in input ? input.courseId : undefined,
    title: input.title,
    description: input.description,
    duration_minutes: input.durationMinutes,
    pass_percentage: input.passPercentage,
    shuffle_questions: input.shuffleQuestions,
    items: input.items?.map((item) => ({
      question_id: item.questionId,
      points: item.points,
      position: item.position,
    })),
  };
}

export async function fetchExamDefinitions(courseId: string): Promise<ExamDefinition[]> {
  const response = await api.get<unknown[]>('/api/exams', {
    params: { course_id: courseId },
  });
  return (extractApiData<unknown[]>(response) as Record<string, unknown>[]).map(
    mapExam,
  );
}

export async function createExamDefinition(
  input: ExamDraftInput,
): Promise<ExamDefinition> {
  const response = await api.post<Record<string, unknown>>(
    '/api/exams',
    examPayload(input),
  );
  return mapExam(extractApiData(response));
}

export async function generateExam(
  input: ExamGenerationInput,
): Promise<ExamGenerationResult> {
  const response = await api.post<Record<string, unknown>>(
    '/api/exams/generate',
    {
      course_id: input.courseId,
      knowledge_point_ids: input.knowledgePointIds,
      purpose: input.purpose,
      title: input.title,
      question_count: input.questionCount,
      difficulty: input.difficulty,
      duration_minutes: input.durationMinutes,
      publish_immediately: input.publishImmediately,
      include_ai_review_question: input.includeAiReviewQuestion,
    },
  );
  return mapExamGenerationResult(extractApiData(response));
}

export async function updateExamDefinition(
  examId: string,
  input: ExamUpdateInput,
): Promise<ExamDefinition> {
  const response = await api.patch<Record<string, unknown>>(
    `/api/exams/${examId}`,
    examPayload(input),
  );
  return mapExam(extractApiData(response));
}

export async function publishExam(examId: string): Promise<ExamDefinition> {
  const response = await api.post<Record<string, unknown>>(
    `/api/exams/${examId}/publish`,
  );
  return mapExam(extractApiData(response));
}

export async function fetchExamCatalog(
  learnerId: string,
  courseId: string,
): Promise<ExamCatalogItem[]> {
  const response = await api.get<unknown[]>('/api/exams/catalog', {
    params: { learner_id: learnerId, course_id: courseId },
  });
  return (extractApiData<unknown[]>(response) as Record<string, unknown>[]).map(
    mapCatalogExam,
  );
}

export async function startExamAttempt(
  examId: string,
  learnerId: string,
): Promise<ExamAttempt> {
  const response = await api.post<Record<string, unknown>>(
    `/api/exams/${examId}/attempts`,
    { learner_id: learnerId },
  );
  return mapExamAttempt(extractApiData(response));
}

export async function fetchExamAttempt(
  attemptId: string,
  learnerId: string,
): Promise<ExamAttempt> {
  const response = await api.get<Record<string, unknown>>(
    `/api/exams/attempts/${attemptId}`,
    { params: { learner_id: learnerId } },
  );
  return mapExamAttempt(extractApiData(response));
}

export async function saveExamAnswer(
  attemptId: string,
  questionId: string,
  learnerId: string,
  answer: ExamAnswerValue,
): Promise<{ answerId: string; savedAt: string }> {
  const response = await api.put<Record<string, unknown>>(
    `/api/exams/attempts/${attemptId}/answers/${questionId}`,
    { learner_id: learnerId, answer },
  );
  const raw = extractApiData(response);
  return { answerId: raw['answer_id'] as string, savedAt: raw['saved_at'] as string };
}

export async function submitExamAttempt(
  attemptId: string,
  learnerId: string,
): Promise<ExamAttemptSummary> {
  const response = await api.post<Record<string, unknown>>(
    `/api/exams/attempts/${attemptId}/submit`,
    { learner_id: learnerId },
  );
  return mapExamAttemptSummary(extractApiData(response));
}

export async function fetchExamResult(
  attemptId: string,
  learnerId: string,
): Promise<ExamResult> {
  const response = await api.get<Record<string, unknown>>(
    `/api/exams/attempts/${attemptId}/result`,
    { params: { learner_id: learnerId } },
  );
  return mapExamResult(extractApiData(response));
}

export async function fetchExamResults(
  learnerId: string,
  courseId: string,
): Promise<ExamAttemptSummary[]> {
  const response = await api.get<unknown[]>('/api/exams/results', {
    params: { learner_id: learnerId, course_id: courseId },
  });
  return (extractApiData<unknown[]>(response) as Record<string, unknown>[]).map(
    mapExamAttemptSummary,
  );
}

export async function fetchExamReviewQueue(courseId: string): Promise<ReviewQueueItem[]> {
  const response = await api.get<unknown[]>('/api/exams/review-queue', {
    params: { course_id: courseId },
  });
  return (extractApiData<unknown[]>(response) as Record<string, unknown>[]).map(
    mapReviewQueueItem,
  );
}

export async function gradeExamAnswer(
  answerId: string,
  score: number,
  feedback: string,
): Promise<ExamAttemptSummary> {
  const response = await api.patch<Record<string, unknown>>(
    `/api/exams/answers/${answerId}/grade`,
    { score, feedback },
  );
  return mapExamAttemptSummary(extractApiData(response));
}

export async function fetchExamAnalytics(
  learnerId: string,
  courseId: string,
): Promise<ExamAnalytics> {
  const response = await api.get<Record<string, unknown>>('/api/exams/analytics', {
    params: { learner_id: learnerId, course_id: courseId },
  });
  return mapExamAnalytics(extractApiData(response));
}
