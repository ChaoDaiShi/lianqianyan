import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TutorExplanationCard } from './TutorExplanationCard';

describe('TutorExplanationCard knowledge mode', () => {
  it('uses only KnowledgePointContent for proactive teaching preparation', () => {
    const html = renderToStaticMarkup(
      <TutorExplanationCard
        mode="knowledge"
        knowledgePointName="死锁"
        knowledge={{
          knowledgePointId: 'kp-deadlock',
          title: '死锁',
          sections: [
            { title: '互斥条件', content: '资源不能被多个进程同时占用。' },
            { title: '循环等待', content: '进程之间形成环形等待链。' },
          ],
        }}
        loading={false}
        error={false}
      />,
    );

    expect(html).toContain('核心概念');
    expect(html).toContain('学习重点');
    expect(html).toContain('小涟提醒');
    expect(html).toContain('互斥条件');
    expect(html).toContain('循环等待');
    expect(html).toContain('只整理 KnowledgePointContent');
    expect(html).toContain('不替代真实 Tutor API 讲解');
  });

  it('labels an unconfigured provider as grounded basic tutoring', () => {
    const html = renderToStaticMarkup(
      <TutorExplanationCard
        knowledgePointName="死锁"
        knowledge={null}
        response={{
          answer: '根据当前课程材料，先检查四个必要条件。',
          selectedCapability: 'tutoring',
          provider: 'unavailable',
          model: null,
          responseMode: 'fallback',
          sources: [],
          contextUsed: ['course_knowledge'],
          suggestedActions: [],
          agentTrace: [],
        }}
      />,
    );

    expect(html).toContain('基础辅导模式');
    expect(html).toContain('Provider：unavailable · 基础辅导');
    expect(html).not.toContain('本地演示');
  });

  it('does not invent teaching content when knowledge content is unavailable', () => {
    const html = renderToStaticMarkup(
      <TutorExplanationCard
        mode="knowledge"
        knowledgePointName="死锁"
        knowledge={null}
        loading={false}
        error={false}
      />,
    );

    expect(html).toContain('当前没有可整理的真实课程章节');
    expect(html).not.toContain('核心概念');
  });
});
