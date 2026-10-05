import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MarkdownText } from './MarkdownText';

describe('MarkdownText', () => {
  it('renders common tutor markdown as semantic, readable content', () => {
    const html = renderToStaticMarkup(
      <MarkdownText
        content={[
          '## 死锁条件',
          '',
          '1. **互斥**：资源只能被一个进程使用。',
          '2. **循环等待**：形成等待环。',
          '',
          '> 破坏任一条件即可预防死锁。',
          '',
          '使用 `mutex` 表示互斥锁。',
        ].join('\n')}
      />,
    );

    expect(html).toContain('<h2');
    expect(html).toContain('text-[15px]');
    expect(html).toContain('sm:text-base');
    expect(html).toContain('leading-7');
    expect(html).toContain('sm:leading-7');
    expect(html).toContain('space-y-4');
    expect(html).toContain('text-xl');
    expect(html).toContain('<ol');
    expect(html).toContain('<strong>互斥</strong>');
    expect(html).toContain('<blockquote');
    expect(html).toContain('<code');
    expect(html).toContain('>mutex</code>');
    expect(html).not.toContain('**互斥**');
  });

  it('escapes unsupported HTML instead of injecting it', () => {
    const html = renderToStaticMarkup(
      <MarkdownText content={'<script>alert("x")</script>\n\n[课程](https://example.edu/course)'} />,
    );

    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('href="https://example.edu/course"');
    expect(html).toContain('rel="noreferrer"');
  });
});
