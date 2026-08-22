import { describe, expect, it } from 'vitest';
import type { KnowledgePointContent } from '@/lib/educationApi';
import {
  getReflectionPageStatus,
  REFLECTION_FEEDBACK_DISCLAIMER,
} from './reflectionPresentation';

describe('reflection presentation', () => {
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
