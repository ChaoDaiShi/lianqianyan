import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MemoryCapsule } from './MemoryCapsule';

describe('MemoryCapsule', () => {
  it('keeps the first version empty without generating preferences', () => {
    const html = renderToStaticMarkup(
      <MemoryCapsule confirmedPreferences={[]} />,
    );

    expect(html).toContain('暂无已确认的学习偏好');
    expect(html).toContain('不会自动生成长期记忆');
    expect(html).not.toContain('我记得你说过');
  });

  it('renders only explicitly confirmed preferences', () => {
    const html = renderToStaticMarkup(
      <MemoryCapsule confirmedPreferences={['先看例题，再独立练习']} />,
    );

    expect(html).toContain('先看例题，再独立练习');
    expect(html).not.toContain('暂无已确认的学习偏好');
  });
});
