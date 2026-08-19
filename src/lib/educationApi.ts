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

/**
 * EducationMind —— 前端 API 客户端。
 *
 * 每个方法对应 Education API（apps/api）的一条路由。
 *
 * 路由前缀（由 Vite 代理 / 同源部署决定）：
 *   /api/health
 *   /api/learning/start
 *   /api/learning/evidence
 *   /api/practice/evaluate
 *   /api/profile/mastery/{kp}
 *   /api/profile/{learner_id}
 *   /api/diagnosis/{learner_id}
 */

export interface HealthResponse {
  status: string;
  service: string;
}

/** LearningEvidence 输出（服务端返回）。 */
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

/** POST /api/learning/start 的响应。 */
export interface LearningStartResult {
  message: string;
  evidence: LearningEvidence;
  sessionId: string;
}

/** POST /api/practice/evaluate 请求。 */
export interface PracticeEvaluationRequest {
  learnerId: string;
  courseId: string;
  knowledgePointId: string;
  questionId: string;
  isCorrect: boolean;
  /** 0.0 ~ 1.0 */
  score: number;
  /** 0.0 ~ 1.0 */
  difficulty: number;
}

/** POST /api/practice/evaluate 响应 —— before/after 由服务端计算。 */
export interface PracticeEvaluationResponse {
  evidence: LearningEvidence;
  masteryBefore: number;
  masteryAfter: number;
  confidence: number;
  evidenceCount: number;
  message: string;
}

/** GET /api/profile/mastery/{kp} 响应。 */
export interface MasteryState {
  knowledgePointId: string;
  masteryScore: number;
  confidence: number;
  evidenceCount: number;
  updatedAt: string;
}

/** POST /api/tutor/chat 请求 —— 客户端只提交「学生问了什么」。 */
export interface TutorChatRequest {
  learnerId: string;
  courseId: string;
  message: string;
}

/**
 * POST /api/tutor/chat 响应。
 * - `contextUsed`：本次回答实际使用的学习上下文（profile / diagnosis / study_plan / evidence）
 * - `suggestedActions`：确定性生成的下一步学习建议
 * - `source`：`llm`（模型回答）或 `fallback`（LLM 失败后的兜底回答）
 */
export interface TutorChatResponse {
  answer: string;
  contextUsed: string[];
  suggestedActions: string[];
  source: 'llm' | 'fallback';
}

/** GET /api/health */
export async function fetchHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>('/api/health');
  return extractApiData<HealthResponse>(response);
}

/**
 * POST /api/tutor/chat —— 学生提问 → 小涟结合学习上下文回答。
 * 学习上下文（画像 / 诊断 / 计划 / 最近记录）全部由服务端确定性构建。
 */
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

/**
 * POST /api/learning/start —— 开启一段学习。
 * 记录 `learning_started` 行为证据（不改变掌握度）。
 */
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
  const response = await api.post<Record<string, unknown>>(
    `/api/learning/start?${query.toString()}`
  );
  const raw = extractApiData(response);
  const evidenceRaw = raw['evidence'] as Record<string, unknown>;
  return {
    message: raw['message'] as string,
    sessionId: raw['session_id'] as string,
    evidence: {
      id: evidenceRaw['id'] as string,
      learnerId: evidenceRaw['learner_id'] as string,
      evidenceType: evidenceRaw['evidence_type'] as
        | 'learning_started'
        | 'practice_answer_evaluated',
      source: evidenceRaw['source'] as
        | 'current_study_plan'
        | 'recommended_path'
        | 'learning_space',
      courseId: evidenceRaw['course_id'] as string | undefined,
      knowledgePointId: evidenceRaw['knowledge_point_id'] as string | undefined,
      questionId: evidenceRaw['question_id'] as string | undefined,
      sessionId: evidenceRaw['session_id'] as string | undefined,
      masteryDelta: evidenceRaw['mastery_delta'] as number | undefined,
      payload: (evidenceRaw['payload'] as Record<string, unknown>) ?? {},
      occurredAt: evidenceRaw['occurred_at'] as string,
    },
  };
}

/**
 * POST /api/practice/evaluate —— 提交一道练习的评价结果。
 * mastery_before / after / confidence / evidence_count 均由服务端计算。
 */
export async function evaluatePractice(
  request: PracticeEvaluationRequest
): Promise<PracticeEvaluationResponse> {
  const response = await api.post<Record<string, unknown>>(
    '/api/practice/evaluate',
    {
      learner_id: request.learnerId,
      course_id: request.courseId,
      knowledge_point_id: request.knowledgePointId,
      question_id: request.questionId,
      is_correct: request.isCorrect,
      score: request.score,
      difficulty: request.difficulty,
    }
  );
  const raw = extractApiData(response);
  const evidenceRaw = raw['evidence'] as Record<string, unknown>;
  return {
    evidence: {
      id: evidenceRaw['id'] as string,
      learnerId: evidenceRaw['learner_id'] as string,
      evidenceType: evidenceRaw['evidence_type'] as
        | 'learning_started'
        | 'practice_answer_evaluated',
      source: evidenceRaw['source'] as
        | 'current_study_plan'
        | 'recommended_path'
        | 'learning_space',
      courseId: evidenceRaw['course_id'] as string | undefined,
      knowledgePointId: evidenceRaw['knowledge_point_id'] as string | undefined,
      questionId: evidenceRaw['question_id'] as string | undefined,
      sessionId: evidenceRaw['session_id'] as string | undefined,
      masteryDelta: evidenceRaw['mastery_delta'] as number | undefined,
      payload: (evidenceRaw['payload'] as Record<string, unknown>) ?? {},
      occurredAt: evidenceRaw['occurred_at'] as string,
    },
    masteryBefore: raw['mastery_before'] as number,
    masteryAfter: raw['mastery_after'] as number,
    confidence: raw['confidence'] as number,
    evidenceCount: raw['evidence_count'] as number,
    message: raw['message'] as string,
  };
}

/** GET /api/profile/mastery/{kp} —— 读取某知识点真实掌握状态。 */
export async function fetchMastery(
  learnerId: string,
  knowledgePointId: string
): Promise<MasteryState> {
  const response = await api.get<{
    knowledge_point_id: string;
    mastery_score: number;
    confidence: number;
    evidence_count: number;
    updated_at: string;
  }>(`/api/profile/mastery/${knowledgePointId}`, {
    params: { learner_id: learnerId },
  });
  const raw = extractApiData(response);
  return {
    knowledgePointId: raw.knowledge_point_id,
    masteryScore: raw.mastery_score,
    confidence: raw.confidence,
    evidenceCount: raw.evidence_count,
    updatedAt: raw.updated_at,
  };
}

/** GET /api/profile/{learner_id} —— 读取某课程学习画像（Derived Read Model）。 */
export async function fetchLearnerProfile(
  learnerId: string,
  courseId = 'course-os'
): Promise<LearnerProfile> {
  const response = await api.get<Record<string, unknown>>(
    `/api/profile/${learnerId}`,
    { params: { course_id: courseId } }
  );
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
    knowledgePoints: ((raw['knowledge_points'] as unknown[]) ?? []).map(
      (kp) => mapKpDiagnosis(kp as Record<string, unknown>)
    ),
    updatedAt: raw['updated_at'] as string,
  };
}

/** GET /api/diagnosis/{learner_id} —— 读取某课程结构化学习诊断。 */
export async function fetchDiagnosis(
  learnerId: string,
  courseId = 'course-os'
): Promise<DiagnosisResult> {
  const response = await api.get<Record<string, unknown>>(
    `/api/diagnosis/${learnerId}`,
    { params: { course_id: courseId } }
  );
  const raw = extractApiData(response);
  const list = (key: string) =>
    ((raw[key] as unknown[]) ?? []).map((kp) =>
      mapKpDiagnosis(kp as Record<string, unknown>)
    );
  return {
    learnerId: raw['learner_id'] as string,
    courseId: raw['course_id'] as string,
    courseName: raw['course_name'] as string,
    primaryFocus: raw['primary_focus']
      ? mapKpDiagnosis(raw['primary_focus'] as Record<string, unknown>)
      : null,
    priorityInterventions: list('priority_interventions'),
    strengths: list('strengths'),
    weakPoints: list('weak_points'),
    developingPoints: list('developing_points'),
    unassessedPoints: list('unassessed_points'),
    summaryCodes: raw['summary_codes'] as DiagnosisResult['summaryCodes'],
    diagnosisGeneratedAt: raw['diagnosis_generated_at'] as string,
  };
}

/* ---------------------------------------------------------------------------
 * StudyPlan API
 *   GET  /api/plans?learner_id=&course_id=   → PersistedStudyPlanSummary[]（History，最新在前）
 *   GET  /api/plans/current                  → PersistedStudyPlan（当前 ACTIVE 计划；无 → null）
 *   POST /api/plans/generate                 → PersistedStudyPlan（完整 Plan + Tasks；旧 ACTIVE 自动 supersede）
 *   GET  /api/plans/{plan_id}                → PersistedStudyPlan
 * ------------------------------------------------------------------------- */

/**
 * GET /api/plans —— Plan History（不含 tasks，latest 在前）。
 * History 含已 supersede 的计划，用于「历史计划」列表。
 */
export async function fetchPlanHistory(
  learnerId: string,
  courseId: string = 'course-os'
): Promise<PersistedStudyPlanSummary[]> {
  const response = await api.get<unknown[]>('/api/plans', {
    params: { learner_id: learnerId, course_id: courseId },
  });
  const raw = extractApiData<unknown[]>(response);
  return ((raw as Record<string, unknown>[]) ?? []).map(mapPlanSummary);
}

/**
 * GET /api/plans/current —— 当前 ACTIVE 计划（Phase 3-1 起至多一个）。
 * - 存在 → 完整 Plan + Tasks；
 * - 不存在（从未生成 / 已被 Empty Plan 取代）→ null（合法的空状态，不抛错）。
 */
export async function fetchCurrentPlan(
  learnerId: string,
  courseId: string = 'course-os'
): Promise<PersistedStudyPlan | null> {
  try {
    const response = await api.get<Record<string, unknown>>('/api/plans/current', {
      params: { learner_id: learnerId, course_id: courseId },
    });
    return mapPlanFromRaw(extractApiData(response));
  } catch (err) {
    // 404 = 无当前计划（诚实空状态）；其余错误（网络 / 500）继续向上抛。
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

/** POST /api/plans/generate —— 显式生成诊断驱动 StudyPlan（客户端只提交 learner/course）。 */
export async function generatePlan(
  learnerId: string,
  courseId: string = 'course-os'
): Promise<PersistedStudyPlan> {
  const response = await api.post<Record<string, unknown>>('/api/plans/generate', {
    learner_id: learnerId,
    course_id: courseId,
  });
  const raw = extractApiData(response);
  return mapPlanFromRaw(raw);
}

/** GET /api/plans/{plan_id} —— 读取完整 Plan + Tasks（无副作用）。 */
export async function fetchPlanDetail(planId: string): Promise<PersistedStudyPlan> {
  const response = await api.get<Record<string, unknown>>(`/api/plans/${planId}`);
  const raw = extractApiData(response);
  return mapPlanFromRaw(raw);
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
    tasks: ((raw['tasks'] as unknown[]) ?? []).map((t) =>
      mapTaskFromRaw(t as Record<string, unknown>)
    ),
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

/** GET /api/learning/evidence —— 读取最近学习证据（报告 / 闭环展示用）。 */
export async function fetchRecentEvidence(): Promise<LearningEvidence[]> {
  const response = await api.get<unknown[]>('/api/learning/evidence');
  const raw = extractApiData<unknown[]>(response);
  return ((raw as Record<string, unknown>[]) ?? []).map((e) => {
    const r = e as Record<string, unknown>;
    return {
      id: r['id'] as string,
      learnerId: r['learner_id'] as string,
      evidenceType: r['evidence_type'] as LearningEvidence['evidenceType'],
      source: r['source'] as LearningEvidence['source'],
      courseId: r['course_id'] as string | undefined,
      knowledgePointId: r['knowledge_point_id'] as string | undefined,
      questionId: r['question_id'] as string | undefined,
      sessionId: r['session_id'] as string | undefined,
      masteryDelta: r['mastery_delta'] as number | undefined,
      payload: (r['payload'] as Record<string, unknown>) ?? {},
      occurredAt: r['occurred_at'] as string,
    };
  });
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
