import { api } from './api';

export type ActionType =
  | 'diagnostic_probe'
  | 'contrastive_teaching'
  | 'prerequisite_repair'
  | 'guided_practice'
  | 'transfer_challenge'
  | 'retrieval_practice';
export type ExperimentGroup = 'A' | 'B' | 'C' | 'D';
export type LeapAblation =
  'none' | 'misconception' | 'prerequisites' | 'ranking';
export type QuestionNovelty = 'new' | 'review';
export interface LeapQuestion {
  id: string;
  version?: string;
  novelty?: QuestionNovelty;
  prompt: string;
  options: { id: string; text: string }[];
  responseMode: 'choice' | 'text';
}
export interface LeapStrategy {
  type: ActionType;
  label: string;
  minutes: number;
  description: string;
}
export interface LeapTopic {
  id: string;
  knowledgePointId: string;
  name: string;
  description: string;
  misconceptionCode: string;
  misconceptionTitle: string;
  prerequisites: { id: string; name: string }[];
  diagnosticQuestion: LeapQuestion;
  strategies: LeapStrategy[];
}
export interface LeapCatalog {
  version: string;
  policyVersion: string;
  reviewStatus: string;
  topics: LeapTopic[];
}
export interface LeapKnowledgeState {
  knowledgePointId: string;
  name: string;
  mastery: number | null;
  uncertainty: number;
  evidenceCount: number;
  misconceptions: { code: string; probability: number }[];
  modelVersion: string;
}
export interface LeapEvidence {
  id: string;
  kind: 'diagnostic' | 'intervention' | 'practice' | 'probe' | 'retest';
  questionId: string | null;
  answer: string | null;
  score: number | null;
  hintUsed: boolean;
  createdAt: string;
  summary: string;
}
export interface LeapDiagnosis {
  misconceptionCode: string | null;
  title: string;
  reason: string;
  confidence: number;
  needsProbe: boolean;
  prerequisites: {
    id: string;
    name: string;
    status: 'unknown' | 'gap' | 'supported';
  }[];
  evidenceIds: string[];
}
export interface LeapCandidate {
  actionType: ActionType;
  label: string;
  score: number;
  reason: string;
  factors: {
    misconception: number;
    prerequisite: number;
    information: number;
    time: number;
    cost: number;
  };
}
export interface LeapDecision {
  actionType: ActionType;
  label: string;
  title: string;
  reason: string;
  estimatedMinutes: number;
  policyVersion: string;
  evidenceIds: string[];
  candidates: LeapCandidate[];
}
export interface LeapTeaching {
  actionType: ActionType;
  title: string;
  introduction: string;
  panels: {
    label: string;
    title: string;
    body: string;
    complexity?: string;
    steps?: string[];
  }[];
  reflectionPrompt: string;
  steps: string[];
}
export interface LeapOutcome {
  id: string;
  interventionId: string | null;
  questionId: string;
  correct: boolean;
  score: number;
  feedback: string;
  independent: boolean;
  hintUsed: boolean;
  durationSeconds: number;
  preScore: number | null;
  postScore: number;
  scoreComparable: boolean;
  comparisonReason: string | null;
  observedGain: number | null;
  misconceptionStatus: 'repaired' | 'persisting' | 'uncertain';
  retestScore: number | null;
  completedAt: string;
}
export interface LeapSession {
  id: string;
  learnerId: string;
  courseId: string;
  topicId: string;
  topicName: string;
  knowledgePointId: string;
  policy: 'leap' | 'fixed';
  experimentGroup: ExperimentGroup;
  ablation: LeapAblation;
  catalogVersion: string;
  policyVersion: string;
  phase: 'diagnostic' | 'decision' | 'teaching' | 'probe' | 'completed';
  createdAt: string;
  updatedAt: string;
  diagnosticQuestion: LeapQuestion;
  practiceQuestion: LeapQuestion | null;
  probeQuestion: LeapQuestion | null;
  retestQuestion: LeapQuestion | null;
  diagnosis: LeapDiagnosis | null;
  decision: LeapDecision | null;
  teaching: LeapTeaching | null;
  outcome: LeapOutcome | null;
  state: LeapKnowledgeState;
  evidence: LeapEvidence[];
  nextStep: {
    title: string;
    reason: string;
    actionType: ActionType;
    topicId: string;
  } | null;
  retestDueAt: string | null;
  assessmentStatus: 'pending' | 'saved';
  replanning: {
    status: 'not_needed' | 'performed' | 'failed' | string;
    reasonCodes: string[];
    previousPlanId: string | null;
    newPlanId: string | null;
  };
  questionAvailability: Record<
    'practice' | 'probe' | 'retest',
    {
      status: 'available' | 'exhausted';
      novelty: QuestionNovelty | null;
      message: string;
    }
  >;
  /** POST answer endpoints add these fields when a saved assessment is replayed. */
  alreadyRecorded?: boolean;
  savedAssessment?: LeapSavedAssessment;
}
export interface LeapSavedAssessment {
  questionId: string;
  questionVersion?: string;
  stage?: 'diagnostic' | 'practice' | 'probe' | 'retest';
  gradingVersion?: string;
  score: number;
  isCorrect?: boolean;
  feedback?: string | null;
  independent?: boolean;
  hintUsed?: boolean;
  countsForMastery?: boolean;
  evidenceId?: string | null;
}
export interface LeapExperiment {
  group: ExperimentGroup;
  label: string;
  count: number;
  completed: number;
  preMean: number | null;
  postMean: number | null;
  meanGain: number | null;
  retentionMean: number | null;
}
export interface LeapOverview {
  catalogVersion: string;
  questionBankVersion: string | null;
  policyVersion: string;
  sessions: LeapSession[];
  states: LeapKnowledgeState[];
  stats: {
    totalSessions: number;
    completedSessions: number;
    independentCorrect: number;
    independentTotal: number;
    misconceptionsRepaired: number;
    delayedDue: number;
  };
  experiments: LeapExperiment[];
  limitations: string[];
}
export interface LeapAnswer {
  answer: string;
  optionId?: string;
  durationSeconds: number;
}
export interface CreateLeapSession {
  learnerId: string;
  courseId: string;
  topicId: string;
  policy: 'leap' | 'fixed';
  experimentGroup: ExperimentGroup;
  ablation?: LeapAblation;
  timeBudgetMinutes?: number;
  fromSessionId?: string;
}
const scope = (learnerId: string, courseId: string) => ({
  learner_id: learnerId,
  course_id: courseId,
});
export const fetchLeapCatalog = async () =>
  (await api.get<LeapCatalog>('/api/adaptive/catalog')).data;
export const fetchLeapSessions = async (learnerId: string, courseId: string) =>
  (
    await api.get<LeapSession[]>('/api/adaptive/sessions', {
      params: scope(learnerId, courseId),
    })
  ).data;
export const fetchLeapOverview = async (learnerId: string, courseId: string) =>
  (
    await api.get<LeapOverview>('/api/adaptive/overview', {
      params: scope(learnerId, courseId),
    })
  ).data;
export const fetchLeapSession = async (id: string) =>
  (await api.get<LeapSession>(`/api/adaptive/sessions/${id}`)).data;
export const createLeapSession = async (payload: CreateLeapSession) =>
  (await api.post<LeapSession>('/api/adaptive/sessions', payload)).data;
export const diagnoseLeapSession = async (id: string, payload: LeapAnswer) =>
  (
    await api.post<LeapSession>(
      `/api/adaptive/sessions/${id}/diagnose`,
      payload
    )
  ).data;
export const startLeapIntervention = async (
  id: string,
  actionType?: ActionType
) =>
  (
    await api.post<LeapSession>(`/api/adaptive/sessions/${id}/intervene`, {
      actionType,
    })
  ).data;
export const practiceLeapSession = async (
  id: string,
  payload: LeapAnswer & { hintUsed: boolean }
) =>
  (
    await api.post<LeapSession>(
      `/api/adaptive/sessions/${id}/practice`,
      payload
    )
  ).data;
export const prepareLeapProbe = async (id: string) =>
  (await api.post<LeapSession>(`/api/adaptive/sessions/${id}/ready-probe`, {}))
    .data;
export const prepareLeapRetest = async (id: string) =>
  (await api.post<LeapSession>(`/api/adaptive/sessions/${id}/ready-retest`, {}))
    .data;
export const submitLeapProbe = async (id: string, payload: LeapAnswer) =>
  (await api.post<LeapSession>(`/api/adaptive/sessions/${id}/probe`, payload))
    .data;
export const submitLeapRetest = async (id: string, payload: LeapAnswer) =>
  (await api.post<LeapSession>(`/api/adaptive/sessions/${id}/retest`, payload))
    .data;
export const exportLeapExperiments = async (
  learnerId: string,
  courseId: string
) =>
  (
    await api.get<{
      version: string;
      exportedAt: string;
      sessions: LeapSession[];
      experiments: LeapExperiment[];
    }>('/api/adaptive/experiments/export', {
      params: scope(learnerId, courseId),
    })
  ).data;
