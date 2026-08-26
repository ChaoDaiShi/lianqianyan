/** EducationMind 考试领域前端契约。 */

export type QuestionResponseKind =
  | 'single_choice'
  | 'multiple_choice'
  | 'boolean'
  | 'short_text'
  | 'long_text';

export type GradingStrategy =
  | 'exact'
  | 'set_exact'
  | 'keyword'
  | 'manual'
  | 'ai_semantic';
export type ExamStatus = 'draft' | 'published' | 'archived';
export type ExamAttemptStatus = 'in_progress' | 'needs_review' | 'graded';
export type AnswerGradingStatus =
  | 'ungraded'
  | 'auto'
  | 'pending_manual'
  | 'manual'
  | 'pending_ai'
  | 'ai'
  | 'auto_fallback';
export type ExamAnswerValue = string | string[] | boolean | null;

export interface ExamQuestionType {
  id: string;
  name: string;
  description: string;
  responseKind: QuestionResponseKind;
  gradingStrategy: GradingStrategy;
  isBuiltin: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionTypeCreateInput {
  name: string;
  description?: string;
  responseKind: QuestionResponseKind;
  gradingStrategy: GradingStrategy;
}

export interface QuestionTypeUpdateInput {
  name?: string;
  description?: string;
  responseKind?: QuestionResponseKind;
  gradingStrategy?: GradingStrategy;
  isArchived?: boolean;
}

export interface ExamQuestion {
  id: string;
  courseId: string;
  knowledgePointId: string | null;
  questionTypeId: string;
  questionTypeName: string;
  responseKind: QuestionResponseKind;
  gradingStrategy: GradingStrategy;
  prompt: string;
  options: string[];
  correctAnswer: ExamAnswerValue;
  keywords: string[];
  explanation: string;
  difficulty: number;
  defaultScore: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionCreateInput {
  courseId: string;
  knowledgePointId?: string | null;
  questionTypeId: string;
  prompt: string;
  options?: string[];
  correctAnswer?: ExamAnswerValue;
  keywords?: string[];
  explanation?: string;
  difficulty: number;
  defaultScore: number;
}

export interface QuestionUpdateInput {
  knowledgePointId?: string | null;
  questionTypeId?: string;
  prompt?: string;
  options?: string[];
  correctAnswer?: ExamAnswerValue;
  keywords?: string[];
  explanation?: string;
  difficulty?: number;
  defaultScore?: number;
  isArchived?: boolean;
}

export interface ExamDraftItemInput {
  questionId: string;
  points: number;
  position: number;
}

export interface ExamDraftInput {
  courseId: string;
  title: string;
  description: string;
  durationMinutes: number;
  passPercentage: number;
  shuffleQuestions: boolean;
  items: ExamDraftItemInput[];
}

export interface ExamUpdateInput {
  title?: string;
  description?: string;
  durationMinutes?: number;
  passPercentage?: number;
  shuffleQuestions?: boolean;
  items?: ExamDraftItemInput[];
}

export interface ExamItem {
  id: string;
  questionId: string;
  points: number;
  position: number;
  question: ExamQuestion;
}

export interface ExamDefinition {
  id: string;
  courseId: string;
  title: string;
  description: string;
  durationMinutes: number;
  passPercentage: number;
  shuffleQuestions: boolean;
  status: ExamStatus;
  items: ExamItem[];
  totalPoints: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface ExamAttemptQuestion {
  questionId: string;
  questionTypeName: string;
  responseKind: QuestionResponseKind;
  prompt: string;
  options: string[];
  points: number;
  position: number;
  userAnswer: ExamAnswerValue;
  savedAt: string | null;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  learnerId: string;
  examTitle: string;
  status: ExamAttemptStatus;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  questions: ExamAttemptQuestion[];
}

export interface ExamAttemptSummary {
  id: string;
  examId: string;
  learnerId: string;
  examTitle: string;
  status: ExamAttemptStatus;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  awardedScore: number;
  maxScore: number;
  pendingScore: number;
  percentage: number;
  passed: boolean | null;
}

export interface ExamCatalogItem {
  id: string;
  courseId: string;
  title: string;
  description: string;
  durationMinutes: number;
  passPercentage: number;
  questionCount: number;
  totalPoints: number;
  publishedAt: string;
  latestAttempt: ExamAttemptSummary | null;
}

export interface ExamResultAnswer {
  answerId: string;
  questionId: string;
  questionTypeName: string;
  responseKind: QuestionResponseKind;
  gradingStrategy: GradingStrategy;
  prompt: string;
  options: string[];
  userAnswer: ExamAnswerValue;
  correctAnswer: ExamAnswerValue;
  keywords: string[];
  explanation: string;
  points: number;
  awardedScore: number | null;
  isCorrect: boolean | null;
  gradingStatus: AnswerGradingStatus;
  feedback: string;
}

export interface ExamResult extends ExamAttemptSummary {
  answers: ExamResultAnswer[];
}

export interface ReviewQueueItem {
  answerId: string;
  attemptId: string;
  examId: string;
  examTitle: string;
  learnerId: string;
  questionId: string;
  prompt: string;
  userAnswer: ExamAnswerValue;
  referenceAnswer: ExamAnswerValue;
  points: number;
  submittedAt: string;
}

export interface KnowledgeExamPerformance {
  knowledgePointId: string;
  knowledgePointName: string;
  answeredCount: number;
  averageScoreRatio: number;
}

export interface ExamAnalytics {
  learnerId: string;
  courseId: string;
  submittedCount: number;
  gradedCount: number;
  averagePercentage: number | null;
  bestPercentage: number | null;
  passRate: number | null;
  objectiveAccuracy: number | null;
  pendingReviewCount: number;
  knowledgePoints: KnowledgeExamPerformance[];
}

export type ExamGenerationPurpose = 'exam' | 'practice';
export type ExamGenerationMode = 'llm' | 'course_grounded';

export interface ExamGenerationInput {
  courseId: string;
  knowledgePointIds: string[];
  purpose: ExamGenerationPurpose;
  title: string;
  questionCount: number;
  difficulty: number;
  durationMinutes: number;
  publishImmediately: boolean;
  includeAiReviewQuestion: boolean;
}

export interface ExamGenerationResult {
  exam: ExamDefinition;
  generationMode: ExamGenerationMode;
  provider: string | null;
  model: string | null;
  sourceSections: string[];
  warnings: string[];
}
