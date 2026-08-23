import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CompanionJourney } from './CompanionJourney';

describe('CompanionJourney', () => {
  it('shows the six learner-facing stages without technical progress or percentages', () => {
    const html = renderToStaticMarkup(
      <CompanionJourney state="thinking" />,
    );

    for (const label of ['准备', '学习', '思考', '练习', '复述', '完成']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('这是学习体验状态，不是 Agent 技术执行状态');
    expect(html).toContain('aria-current="step"');
    expect(html).not.toContain('%');
  });
});
