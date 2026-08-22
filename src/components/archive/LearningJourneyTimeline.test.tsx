import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { PersistedStudyPlan } from '@/domain';
import type {
  LearningEvidence,
  PracticeEvaluationResponse,
} from '@/lib/educationApi';
import { LearningJourneyTimeline } from './LearningJourneyTimeline';

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

function createEvidence(
  overrides: Partial<LearningEvidence> = {},
): LearningEvidence {
  return {
    id: 'evidence-learning-1',
    learnerId: 'learner-1',
    evidenceType: 'learning_started',
    source: 'current_study_plan',
    courseId: 'course-1',
    knowledgePointId: 'kp-deadlock',
    sessionId: 'session-1',
    payload: {},
    occurredAt: '2026-08-22T08:00:00.000Z',
    ...overrides,
  };
}

function createEvaluation(): PracticeEvaluationResponse {
  return {
    evidence: createEvidence({
      id: 'evidence-practice-1',
      evidenceType: 'practice_answer_evaluated',
      source: 'learning_space',
      questionId: 'question-1',
      occurredAt: '2026-08-22T09:00:00.000Z',
    }),
    masteryBefore: 0.4,
    masteryAfter: 0.5,
    confidence: 0.7,
    evidenceCount: 2,
    message: '练习评价已记录。',
    replanning: {
      status: 'not_needed',
      performed: false,
      reasonCodes: ['NO_MATERIAL_CHANGE'],
      previousPlanId: 'plan-1',
      newPlan: null,
      previousTopTask: null,
      newTopTask: null,
    },
  };
}

function renderTimeline(
  overrides: Partial<ComponentProps<typeof LearningJourneyTimeline>> = {},
) {
  return renderToStaticMarkup(
    <LearningJourneyTimeline
      evidence={[]}
      plan={null}
      practiceEvaluations={[]}
      knowledgeNames={{ 'kp-deadlock': '死锁' }}
      learnerId="learner-1"
      courseId="course-1"
      loading={false}
      error={false}
      onRetry={vi.fn()}
      {...overrides}
    />,
  );
}

describe('LearningJourneyTimeline', () => {
  it('keeps Current Plan context visible when Evidence fails and offers retry', () => {
    const html = renderTimeline({ plan, error: true });

    expect(html).toContain('当前学习计划生成');
    expect(html).toContain('计划任务：死锁');
    expect(html).toContain('计划上下文，不表示已完成学习');
    expect(html).toContain('Current Plan');
    expect(html).toContain('最近学习证据暂时无法读取');
    expect(html).toContain('重新加载学习证据');
    expect(html).toContain('dateTime="2026-08-22T07:00:01.000Z"');
  });

  it('renders real learning and practice sources with their source timestamps', () => {
    const learningEvidence = createEvidence();
    const evaluation = createEvaluation();
    const html = renderTimeline({
      evidence: [learningEvidence],
      practiceEvaluations: [evaluation],
    });

    expect(html).toContain('开始学习：死锁');
    expect(html).toContain('练习评价：死锁');
    expect(html).toContain('LearningEvidence');
    expect(html).toContain('PracticeEvaluationResponse');
    expect(html).toContain(`dateTime="${learningEvidence.occurredAt}"`);
    expect(html).toContain(`dateTime="${evaluation.evidence.occurredAt}"`);
  });

  it('shows an honest empty state when no journey events exist', () => {
    const html = renderTimeline();

    expect(html).toContain('还没有可展示的学习旅程记录');
    expect(html).toContain('不会把计划任务当作已完成学习');
  });
});
