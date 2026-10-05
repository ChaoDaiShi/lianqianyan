import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SourceReferences } from './SourceReferences';

describe('SourceReferences', () => {
  it('renders course sources at a readable result scale', () => {
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
    expect(html).toContain('text-[13px]');
    expect(html).toContain('leading-[1.65]');
    expect(html).toContain('px-4 py-3');
  });
});
