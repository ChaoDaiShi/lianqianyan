import { describe, expect, it } from 'vitest';
import type { KnowledgePointContent } from '@/lib/educationApi';
import {
  buildLearningSpaceHref,
  buildReflectionHref,
  getReflectionPageStatus,
  REFLECTION_FEEDBACK_DISCLAIMER,
} from './reflectionPresentation';

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
});
