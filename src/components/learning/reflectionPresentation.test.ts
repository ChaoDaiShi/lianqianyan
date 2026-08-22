import { describe, expect, it } from 'vitest';
import type { PersistedStudyPlan, PersistedStudyTask } from '@/domain';
import type { KnowledgePointContent } from '@/lib/educationApi';
import {
  buildLearningSpaceHref,
  buildReflectionHref,
  getReflectionPageStatus,
  getReflectionTaskStatus,
  REFLECTION_FEEDBACK_DISCLAIMER,
} from './reflectionPresentation';

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
  courseId: 'course-os',
  status: 'active',
  strategy: 'diagnosis_driven',
  generatedAt: '2026-08-22T09:00:00.000Z',
  sourceDiagnosisGeneratedAt: '2026-08-22T08:30:00.000Z',
  reasonCodes: ['PRIMARY_FOCUS'],
  createdAt: '2026-08-22T09:00:00.000Z',
  updatedAt: '2026-08-22T09:00:00.000Z',
  tasks: [task],
};

describe('reflection presentation', () => {
  it('carries the exact current task identity into the reflection route', () => {
    expect(
      buildReflectionHref({
        id: 'task/retry 2',
        knowledgePointId: 'kp/deadlock',
        knowledgePointName: 'Deadlock & recovery',
      }),
    ).toBe(
      '/reflection?task_id=task%2Fretry%202&knowledge_point_id=kp%2Fdeadlock&knowledge_point_name=Deadlock%20%26%20recovery',
    );
  });

  it('preserves explicit task and knowledge-point identity when returning to space', () => {
    expect(
      buildLearningSpaceHref({
        taskId: 'task/retry 2',
        knowledgePointId: 'kp/deadlock',
      }),
    ).toBe(
      '/space?task_id=task%2Fretry%202&knowledge_point_id=kp%2Fdeadlock',
    );
  });

  it('uses the exact required Chinese feedback disclaimer', () => {
    expect(REFLECTION_FEEDBACK_DISCLAIMER).toBe(
      '当前为前端教学反馈演示，不代表 AI 自动评分',
    );
  });

  it('treats mismatched query data as loading before the hook flag updates', () => {
    const staleData: KnowledgePointContent = {
      knowledgePointId: 'kp-previous',
      title: '旧知识点',
      sections: [{ title: '旧章节', content: '旧内容' }],
    };

    expect(
      getReflectionPageStatus({
        requestedKnowledgePointId: 'kp-next',
        data: staleData,
        loading: false,
        error: false,
      }),
    ).toBe('loading');
  });

  it('rejects a route whose task and knowledge-point identities disagree', () => {
    expect(
      getReflectionTaskStatus({
        taskId: 'task-1',
        knowledgePointId: 'kp-paging',
        plan,
        loading: false,
        error: false,
      }),
    ).toBe('mismatch');
  });

  it('accepts only the knowledge point owned by the real current-plan task', () => {
    expect(
      getReflectionTaskStatus({
        taskId: 'task-1',
        knowledgePointId: 'kp-deadlock',
        plan,
        loading: false,
        error: false,
      }),
    ).toBe('ready');
  });
});
