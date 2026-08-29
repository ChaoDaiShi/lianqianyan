import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { PersistedStudyPlan } from '@/domain';
import type { LearningEvidence } from '@/lib/educationApi';
import { LearningStoryTimeline } from './LearningStoryTimeline';

const plan: PersistedStudyPlan = {
  id: 'plan-1',
  learnerId: 'learner-1',
  courseId: 'course-1',
  status: 'active',
  strategy: 'diagnosis_driven',
  generatedAt: '2026-08-22T07:00:00.000Z',
  sourceDiagnosisGeneratedAt: '2026-08-22T06:30:00.000Z',
  reasonCodes: ['PRIMARY_FOCUS'],
  createdAt: '2026-08-22T07:00:00.000Z',
  updatedAt: '2026-08-22T07:30:00.000Z',
  tasks: [
    {
      id: 'task-1',
      planId: 'plan-1',
      draftKey: 'draft-1',
      knowledgePointId: 'kp-deadlock',
      knowledgePointName: '死锁',
      actionType: 'remediate',
      priority: 1,
      estimatedMinutes: 20,
      reasonCodes: ['PRIMARY_FOCUS'],
      sourceStatus: 'weak',
      sourcePriorityScore: 1,
      order: 1,
      createdAt: '2026-08-22T07:00:01.000Z',
    },
  ],
};

const learningEvidence: LearningEvidence = {
  id: 'evidence-learning-1',
  learnerId: 'learner-1',
  evidenceType: 'learning_started',
  source: 'current_study_plan',
  courseId: 'course-1',
  knowledgePointId: 'kp-deadlock',
  sessionId: 'session-1',
  payload: {},
  occurredAt: '2026-08-22T08:00:00.000Z',
};

describe('LearningStoryTimeline', () => {
  it('renders real learning evidence and labels plan tasks as context only', () => {
    const html = renderToStaticMarkup(
      <LearningStoryTimeline
        evidence={[learningEvidence]}
        plan={plan}
        practiceEvaluations={[]}
        reflectionResults={[]}
        knowledgeNames={{ 'kp-deadlock': '死锁' }}
        learnerId="learner-1"
        courseId="course-1"
        loading={false}
        error={false}
        onRetry={vi.fn()}
      />,
    );

    expect(html).toContain('学习成长故事');
    expect(html).toContain('一次学习行动开始了');
    expect(html).toContain('LearningEvidence');
    expect(html).toContain('学习计划安排了下一站');
    expect(html).toContain('计划上下文，不表示已完成学习');
    expect(html).toContain('Current Plan');
    expect(html).not.toContain('diagnosis_driven');
    expect(html).not.toContain('remediate');
  });

  it('does not invent a story when every real source is empty', () => {
    const html = renderToStaticMarkup(
      <LearningStoryTimeline
        evidence={[]}
        plan={null}
        practiceEvaluations={[]}
        reflectionResults={[]}
        knowledgeNames={{}}
        learnerId="learner-1"
        courseId="course-1"
        loading={false}
        error={false}
        onRetry={vi.fn()}
      />,
    );

    expect(html).toContain('还没有可展示的成长故事');
    expect(html).toContain('不会根据空白状态自动编写学习经历');
  });
});
