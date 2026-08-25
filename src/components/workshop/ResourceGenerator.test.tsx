import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ResourceGenerator } from './ResourceGenerator';

describe('ResourceGenerator presentation', () => {
  it('offers all grounded resource choices without claiming LLM generation', () => {
    const html = renderToStaticMarkup(<ResourceGenerator />);

    expect(html).toContain('选择知识点');
    expect(html).toContain('选择资源类型');
    expect(html).toContain('学习单');
    expect(html).toContain('复习闪卡');
    expect(html).toContain('章节自测');
    expect(html).toContain('思维导图');
    expect(html).toContain('学习计划');
    expect(html).toContain('基于课程材料模板生成');
    expect(html).toContain('生成学习资源');
    expect(html).not.toContain('AI 自动生成');
    expect(html).not.toContain('大模型生成');
  });
});
