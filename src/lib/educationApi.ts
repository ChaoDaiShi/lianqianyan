import axios from 'axios';
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
} from '@/domain';

/** EducationMind —— 前端 API 客户端。 */

export interface HealthResponse {
  status: string;
  service: string;
}

export interface LearningEvidence {
  id: string;
  learnerId: string;
  evidenceType: 'learning_started' | 'practice_answer_evaluated';
  source: 'current_study_plan' | 'recommended_path' | 'learning_space';
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

export interface PracticeEvaluationResponse {
  evidence: LearningEvidence;
  masteryBefore: number;
  masteryAfter: number;
  confidence: number;
  evidenceCount: number;
  message: string;
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
}

export type AgentCapability = 'diagnosis' | 'planning' | 'tutoring' | 'assessment';

export interface AgentTraceItem {
  agent: AgentCapability;
  label: string;
  status: string;
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
}

export interface AgentChatResponse {
  answer: string;
  selectedCapability: AgentCapability;
  provider: string;
  responseMode: 'provider' | 'fallback';
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
  });
  const raw = extractApiData(response);
  return {
    answer: raw['answer'] as string,
    selectedCapability: raw['selected_capability'] as AgentCapability,
    provider: (raw['provider'] as string) ?? 'none',
    responseMode: (raw['response_mode'] as 'provider' | 'fallback') ?? 'provider',
    contextUsed: (raw['context_used'] as string[]) ?? [],
    suggestedActions: ((raw['suggested_actions'] as unknown[]) ?? []).map((item) => {
      const action = item as Record<string, unknown>;
      return { type: action['type'] as string, label: action['label'] as string };
    }),
    agentTrace: ((raw['agent_trace'] as unknown[]) ?? []).map((item) => {
      const trace = item as Record<string, unknown>;
      return {
        agent: trace['agent'] as AgentCapability,
        label: trace['label'] as string,
        status: trace['status'] as string,
      };
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
  };
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

export async function fetchCurrentPlan(learnerId: string, courseId = 'course-os'): Promise<PersistedStudyPlan | null> {
  try {
    const response = await api.get<Record<string, unknown>>('/api/plans/current', { params: { learner_id: learnerId, course_id: courseId } });
    return mapPlanFromRaw(extractApiData(response));
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
}

export async function generatePlan(learnerId: string, courseId = 'course-os'): Promise<PersistedStudyPlan> {
  const response = await api.post<Record<string, unknown>>('/api/plans/generate', { learner_id: learnerId, course_id: courseId });
  return mapPlanFromRaw(extractApiData(response));
}

export async function fetchPlanDetail(planId: string): Promise<PersistedStudyPlan> {
  const response = await api.get<Record<string, unknown>>(`/api/plans/${planId}`);
  return mapPlanFromRaw(extractApiData(response));
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
