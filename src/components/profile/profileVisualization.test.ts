import { describe, expect, it } from 'vitest';
import type { ExamAnalytics, LearnerProfile } from '@/domain';
import { buildProfileVisualization } from './profileVisualization';

const profile: LearnerProfile = {
  learnerId: 'learner-1',
  courseId: 'course-os',
  courseName: '操作系统',
  overallMastery: 0.4,
  overallConfidence: 0.7,
  insufficientData: false,
  coverage: 1,
  totalKnowledgePoints: 2,
  assessedCount: 2,
  unassessedCount: 0,
  statusCounts: {
    unassessed: 0,
    insufficient_evidence: 0,
    weak: 1,
    developing: 0,
    proficient: 1,
    mastered: 0,
  },
  knowledgePoints: [
    {
      knowledgePointId: 'kp-deadlock',
      knowledgePointName: '死锁',
      masteryScore: 0.4,
      confidence: 0.7,
      evidenceCount: 3,
      status: 'weak',
      priorityScore: 0.8,
      reasonCodes: ['LOW_MASTERY'],
    },
    {
      knowledgePointId: 'kp-process',
      knowledgePointName: '进程基础',
      masteryScore: 0.8,
      confidence: 0.6,
      evidenceCount: 5,
      status: 'proficient',
      priorityScore: 0.1,
      reasonCodes: ['ADEQUATE_MASTERY'],
    },
  ],
  updatedAt: '2026-08-25T08:00:00',
};

const analytics: ExamAnalytics = {
  learnerId: 'learner-1',
  courseId: 'course-os',
  submittedCount: 2,
  gradedCount: 2,
  averagePercentage: 80,
  bestPercentage: 90,
  passRate: 0.5,
  objectiveAccuracy: 0.75,
  pendingReviewCount: 0,
  knowledgePoints: [
    {
      knowledgePointId: 'kp-deadlock',
      knowledgePointName: '死锁',
      answeredCount: 4,
      averageScoreRatio: 0.65,
    },
  ],
};

describe('profile visualization derivation', () => {
  it('derives bounded radar dimensions from real profile and exam values', () => {
    const view = buildProfileVisualization(profile, analytics);

    expect(view.radar.map((axis) => [axis.key, axis.value])).toEqual([
      ['mastery', 40],
      ['confidence', 70],
      ['coverage', 100],
      ['assessment', 80],
    ]);
    expect(view.assessment?.bestPercentage).toBe(90);
  });

  it('keeps missing exam performance null instead of manufacturing zero', () => {
    const view = buildProfileVisualization(profile, null);

    expect(view.radar.find((axis) => axis.key === 'assessment')?.value).toBeNull();
    expect(view.assessment).toBeNull();
    expect(view.knowledge[0].examScore).toBeNull();
  });

  it('joins per-knowledge exam samples without dropping untested points', () => {
    const view = buildProfileVisualization(profile, analytics);

    expect(view.knowledge).toEqual([
      expect.objectContaining({
        knowledgePointId: 'kp-deadlock',
        mastery: 40,
        examScore: 65,
        examAnsweredCount: 4,
      }),
      expect.objectContaining({
        knowledgePointId: 'kp-process',
        mastery: 80,
        examScore: null,
        examAnsweredCount: 0,
      }),
    ]);
    expect(view.statusTotal).toBe(2);
  });

  it('does not render unassessed knowledge as zero mastery', () => {
    const unassessed: LearnerProfile = {
      ...profile,
      knowledgePoints: [
        {
          ...profile.knowledgePoints[0],
          masteryScore: 0,
          confidence: 0,
          evidenceCount: 0,
          status: 'unassessed',
          reasonCodes: ['NO_EVIDENCE'],
        },
      ],
    };

    const view = buildProfileVisualization(unassessed, null);

    expect(view.knowledge[0].mastery).toBeNull();
  });
});
