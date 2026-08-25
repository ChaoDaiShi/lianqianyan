import type {
  DiagnosisStatus,
  ExamAnalytics,
  LearnerProfile,
} from '@/domain';

export type ProfileRadarKey =
  | 'mastery'
  | 'confidence'
  | 'coverage'
  | 'assessment';

export interface ProfileRadarAxis {
  key: ProfileRadarKey;
  label: string;
  value: number | null;
}

export interface KnowledgePerformanceRow {
  knowledgePointId: string;
  knowledgePointName: string;
  mastery: number | null;
  confidence: number | null;
  evidenceCount: number;
  status: DiagnosisStatus;
  examScore: number | null;
  examAnsweredCount: number;
}

export interface ProfileVisualizationModel {
  radar: ProfileRadarAxis[];
  assessment: ExamAnalytics | null;
  knowledge: KnowledgePerformanceRow[];
  statusTotal: number;
}

function toPercentage(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  return Math.round(Math.min(1, Math.max(0, value)) * 100);
}

function boundPercentage(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  return Math.round(Math.min(100, Math.max(0, value)));
}

export function buildProfileVisualization(
  profile: LearnerProfile,
  analytics: ExamAnalytics | null,
): ProfileVisualizationModel {
  const examByKnowledgePoint = new Map(
    (analytics?.knowledgePoints ?? []).map((item) => [
      item.knowledgePointId,
      item,
    ]),
  );

  return {
    radar: [
      {
        key: 'mastery',
        label: '综合掌握',
        value: toPercentage(profile.overallMastery),
      },
      {
        key: 'confidence',
        label: '画像可信',
        value: toPercentage(profile.overallConfidence),
      },
      {
        key: 'coverage',
        label: '证据覆盖',
        value: toPercentage(profile.coverage),
      },
      {
        key: 'assessment',
        label: '考试表现',
        value: boundPercentage(analytics?.averagePercentage ?? null),
      },
    ],
    assessment: analytics,
    knowledge: profile.knowledgePoints.map((point) => {
      const exam = examByKnowledgePoint.get(point.knowledgePointId);
      const assessed = ![
        'unassessed',
        'insufficient_evidence',
      ].includes(point.status);
      return {
        knowledgePointId: point.knowledgePointId,
        knowledgePointName: point.knowledgePointName,
        mastery: assessed ? toPercentage(point.masteryScore) : null,
        confidence: assessed ? toPercentage(point.confidence) : null,
        evidenceCount: point.evidenceCount,
        status: point.status,
        examScore: exam ? toPercentage(exam.averageScoreRatio) : null,
        examAnsweredCount: exam?.answeredCount ?? 0,
      };
    }),
    statusTotal: Object.values(profile.statusCounts).reduce(
      (total, count) => total + count,
      0,
    ),
  };
}
