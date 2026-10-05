import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AgentToolTrace } from './AgentToolTrace';

const items = [
  {
    agent: 'search_course_knowledge',
    name: 'search_course_knowledge',
    label: '课程知识检索',
    status: 'completed',
    type: 'tool' as const,
  },
  {
    agent: 'tutoring',
    name: null,
    label: '小涟辅导',
    status: 'completed',
    type: 'agent' as const,
  },
];

describe('AgentToolTrace', () => {
  it('renders compact execution details as a visible ordered timeline', () => {
    const html = renderToStaticMarkup(
      <AgentToolTrace items={items} compact />,
    );

    expect(html).toContain('data-agent-trace="timeline"');
    expect(html).toContain('<ol');
    expect(html).toContain('课程知识检索');
    expect(html).toContain('小涟辅导');
    expect(html.indexOf('课程知识检索')).toBeLessThan(
      html.indexOf('小涟辅导'),
    );
    expect(html).not.toContain('执行记录');
  });
});
