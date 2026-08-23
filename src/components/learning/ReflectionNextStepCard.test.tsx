import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { PersistedStudyTask } from '@/domain';
import type { ReflectionResult } from './learningLoop';
import { ReflectionNextStepCard } from './ReflectionNextStepCard';

const result: ReflectionResult = {
  learnerId: 'learner-1',
  courseId: 'course-1',
  taskId: 'task-1',
  knowledgePointId: 'kp-deadlock',
  knowledgePointName: '死锁',
  submittedText: '互斥、占有等待和循环等待会共同造成死锁。',
  submittedAt: '2026-08-23T10:00:00.000Z',
  coveredConcepts: ['互斥条件'],
  missingConcepts: ['不可剥夺'],
  nextSuggestion: '回看不可剥夺条件，再补充一次复述。',
};

const nextTask: PersistedStudyTask = {
  id: 'task-2',
  planId: 'plan-1',
  draftKey: 'draft-2',
  knowledgePointId: 'kp-scheduling',
  knowledgePointName: '进程调度',
  actionType: 'remediate',
  priority: 2,
  estimatedMinutes: 15,
  reasonCodes: ['PRIMARY_FOCUS'],
  sourceStatus: 'developing',
  sourcePriorityScore: 0.8,
  order: 2,
  createdAt: '2026-08-23T08:00:02.000Z',
};

describe('ReflectionNextStepCard', () => {
  it('renders Xiaolian guidance from ReflectionResult and the next real plan task', () => {
    const html = renderToStaticMarkup(
      <ReflectionNextStepCard
        result={result}
        nextTask={nextTask}
        starting={false}
        onPrepareNext={vi.fn()}
      />,
    );

    expect(html).toContain(result.nextSuggestion);
    expect(html).toContain(nextTask.knowledgePointName);
    expect(html).toContain('继续下一任务');
  });

  it('states truthfully when CurrentPlan has no next task', () => {
    const html = renderToStaticMarkup(
      <ReflectionNextStepCard
        result={result}
        nextTask={null}
        starting={false}
        onPrepareNext={vi.fn()}
      />,
    );

    expect(html).toContain('当前计划已经没有下一项真实任务');
    expect(html).toContain('不会自动新增任务');
  });
});
