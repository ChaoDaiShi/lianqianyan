import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DiagnosisResult, ExamAnalytics, LearnerProfile } from '@/domain';
import { LearnerPortraitDashboard } from './LearnerPortraitDashboard';

const point = {
  knowledgePointId: 'kp-deadlock',
  knowledgePointName: '死锁',
  masteryScore: 0.46,
  confidence: 0.45,
  evidenceCount: 3,
  status: 'weak' as const,
  priorityScore: 0.8,
  reasonCodes: ['LOW_MASTERY' as const],
};
const profile: LearnerProfile = {
  learnerId: 'learner-1',
  courseId: 'course-os',
  courseName: '操作系统',
  overallMastery: 0.46,
  overallConfidence: 0.45,
  insufficientData: false,
  coverage: 0.8,
  totalKnowledgePoints: 5,
  assessedCount: 4,
  unassessedCount: 1,
  statusCounts: { unassessed: 1, insufficient_evidence: 0, weak: 1, developing: 2, proficient: 1, mastered: 0 },
  knowledgePoints: [point],
  updatedAt: '2026-08-25T08:00:00',
};
const diagnosis: DiagnosisResult = {
  learnerId: 'learner-1',
  courseId: 'course-os',
  courseName: '操作系统',
  primaryFocus: point,
  priorityInterventions: [point],
  strengths: [],
  weakPoints: [point],
  developingPoints: [],
  unassessedPoints: [],
  summaryCodes: ['LOW_MASTERY'],
  diagnosisGeneratedAt: '2026-08-25T08:00:00',
};
const analytics: ExamAnalytics = {
  learnerId: 'learner-1',
  courseId: 'course-os',
  submittedCount: 3,
  gradedCount: 2,
  averagePercentage: 76,
  bestPercentage: 88,
  passRate: 0.5,
  objectiveAccuracy: 0.7,
  pendingReviewCount: 1,
  knowledgePoints: [{ knowledgePointId: 'kp-deadlock', knowledgePointName: '死锁', answeredCount: 2, averageScoreRatio: 0.6 }],
};

describe('LearnerPortraitDashboard', () => {
  it('renders accessible real-data visuals and assessment snapshot', () => {
    const html = renderToStaticMarkup(<LearnerPortraitDashboard profile={profile} diagnosis={diagnosis} analytics={analytics} analyticsLoading={false} analyticsError={false} onRetryAnalytics={() => undefined} />);

    expect(html).toContain('证据驱动成长画像');
    expect(html).toContain('role="img"');
    expect(html).toContain('综合掌握 46%');
    expect(html).toContain('平均成绩');
    expect(html).toContain('76%');
    expect(html).toContain('1 题待批');
    expect(html).toContain('死锁');
  });

  it('labels absent exam data as missing rather than zero performance', () => {
    const html = renderToStaticMarkup(<LearnerPortraitDashboard profile={profile} diagnosis={diagnosis} analytics={null} analyticsLoading={false} analyticsError={false} onRetryAnalytics={() => undefined} />);

    expect(html).toContain('评测数据暂无');
    expect(html).toContain('尚无已评分考试');
    expect(html).not.toContain('平均成绩 0%');
  });
});

