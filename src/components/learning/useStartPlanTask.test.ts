import { describe, expect, it, vi } from 'vitest';
import type { PersistedStudyPlan, PersistedStudyTask } from '@/domain';
import type { LearningStartResult } from '@/lib/educationApi';
import { startPlanTaskLearning } from './useStartPlanTask';

const task: PersistedStudyTask = {
  id: 'task-1',
  planId: 'plan-1',
  draftKey: 'draft-1',
  knowledgePointId: 'kp-deadlock',
  knowledgePointName: 'Deadlock',
  actionType: 'remediate',
  priority: 1,
  estimatedMinutes: 20,
  reasonCodes: ['PRIMARY_FOCUS'],
  sourceStatus: 'weak',
  sourcePriorityScore: 1,
  order: 1,
  createdAt: '2026-08-22T10:00:00.000Z',
};

const plan: PersistedStudyPlan = {
  id: 'plan-1',
  learnerId: 'learner-1',
  courseId: 'course-1',
  status: 'active',
  strategy: 'diagnosis_driven',
  generatedAt: '2026-08-22T09:00:00.000Z',
  sourceDiagnosisGeneratedAt: '2026-08-22T08:30:00.000Z',
  reasonCodes: ['PRIMARY_FOCUS'],
  createdAt: '2026-08-22T09:00:00.000Z',
  updatedAt: '2026-08-22T09:00:00.000Z',
  tasks: [task],
};

const result: LearningStartResult = {
  message: 'Learning started',
  sessionId: 'session-current',
  evidence: {
    id: 'evidence-learning-1',
    learnerId: 'learner-1',
    evidenceType: 'learning_started',
    source: 'current_study_plan',
    courseId: 'course-1',
    knowledgePointId: 'kp-deadlock',
    sessionId: 'session-current',
    payload: {},
    occurredAt: '2026-08-22T10:01:00.000Z',
  },
};

describe('startPlanTaskLearning', () => {
  it('records the returned real session under the selected task id', async () => {
    const startLearning = vi.fn().mockResolvedValue(result);
    const setLearningSessionId = vi.fn();

    await expect(
      startPlanTaskLearning({
        plan,
        task,
        startLearning,
        setLearningSessionId,
      }),
    ).resolves.toBe(result);

    expect(startLearning).toHaveBeenCalledWith({
      source: 'current_study_plan',
      courseId: 'course-1',
      knowledgePointId: 'kp-deadlock',
      topic: 'Deadlock',
    });
    expect(setLearningSessionId).toHaveBeenCalledWith(
      'task-1',
      'session-current',
    );
  });

  it('does not record a session when startLearning fails', async () => {
    const setLearningSessionId = vi.fn();

    await expect(
      startPlanTaskLearning({
        plan,
        task,
        startLearning: vi.fn().mockResolvedValue(null),
        setLearningSessionId,
      }),
    ).resolves.toBeNull();

    expect(setLearningSessionId).not.toHaveBeenCalled();
  });
});
