import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SourceReferences } from './SourceReferences';

describe('SourceReferences', () => {
  it('keeps the returned course section and excerpt available for inspection', () => {
    const html = renderToStaticMarkup(
      <SourceReferences
        sources={[
          {
            id: 'source-1',
            title: '死锁 · 必要条件',
            section: '四个必要条件',
            knowledgePointId: 'kp-deadlock',
            excerpt: '互斥、请求并保持、不可抢占和循环等待。',
          },
        ]}
      />,
    );

    expect(html).toContain('data-source-references="true"');
    expect(html).toContain('死锁 · 必要条件');
    expect(html).toContain('四个必要条件');
    expect(html).toContain('互斥、请求并保持、不可抢占和循环等待。');
  });
});
