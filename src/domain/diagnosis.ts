/**
 * EducationMind —— 学习诊断领域模型（TS 版）。
 *
 * 与 apps/api（Python）保持一致：status / reason_codes 使用机器可读枚举值，
 * 中文显示由前端负责转换（尚未评估 / 证据不足 / 薄弱 / 发展中 / 熟练 / 掌握）。
 */

/** 知识点诊断状态（机器可读）。 */
export type DiagnosisStatus =
  | 'unassessed'
  | 'insufficient_evidence'
  | 'weak'
  | 'developing'
  | 'proficient'
  | 'mastered';

/** 机器可读诊断原因代码（前端翻译为自然语言）。 */
export type DiagnosisReasonCode =
  | 'NO_EVIDENCE'
  | 'LIMITED_EVIDENCE'
  | 'LOW_MASTERY'
  | 'ADEQUATE_MASTERY'
  | 'STRONG_MASTERY';

/** 单个知识点诊断。 */
export interface KnowledgePointDiagnosis {
  knowledgePointId: string;
  knowledgePointName: string;
  masteryScore: number;
  confidence: number;
  evidenceCount: number;
  status: DiagnosisStatus;
  /** 0.0 ~ 1.0 */
  priorityScore: number;
  reasonCodes: DiagnosisReasonCode[];
}

/** 按状态统计计数。 */
export interface StatusCounts {
  unassessed: number;
  insufficient_evidence: number;
  weak: number;
  developing: number;
  proficient: number;
  mastered: number;
}

/** LearnerProfile —— Derived Read Model。 */
export interface LearnerProfile {
  learnerId: string;
  courseId: string;
  courseName: string;
  overallMastery: number | null;
  overallConfidence: number | null;
  insufficientData: boolean;
  coverage: number;
  totalKnowledgePoints: number;
  assessedCount: number;
  unassessedCount: number;
  statusCounts: StatusCounts;
  knowledgePoints: KnowledgePointDiagnosis[];
  updatedAt: string;
}

/** 结构化 Diagnosis 结果。 */
export interface DiagnosisResult {
  learnerId: string;
  courseId: string;
  courseName: string;
  primaryFocus: KnowledgePointDiagnosis | null;
  priorityInterventions: KnowledgePointDiagnosis[];
  strengths: KnowledgePointDiagnosis[];
  weakPoints: KnowledgePointDiagnosis[];
  developingPoints: KnowledgePointDiagnosis[];
  unassessedPoints: KnowledgePointDiagnosis[];
  summaryCodes: DiagnosisReasonCode[];
  diagnosisGeneratedAt: string;
}

/** 前端：诊断状态 → 中文显示。 */
export const DIAGNOSIS_STATUS_LABEL: Record<DiagnosisStatus, string> = {
  unassessed: '尚未评估',
  insufficient_evidence: '证据不足',
  weak: '薄弱',
  developing: '发展中',
  proficient: '熟练',
  mastered: '掌握',
};

/** 前端：诊断原因代码 → 自然语言说明。 */
export const DIAGNOSIS_REASON_TEXT: Record<DiagnosisReasonCode, string> = {
  NO_EVIDENCE: '尚未完成有效评估。',
  LIMITED_EVIDENCE: '当前有效练习记录较少，暂无法可靠判断，建议先完成一次快速测评。',
  LOW_MASTERY: '当前掌握度偏低。',
  ADEQUATE_MASTERY: '当前掌握情况尚可。',
  STRONG_MASTERY: '当前掌握情况良好。',
};
