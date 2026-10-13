import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MarkdownText } from './MarkdownText';

describe('MarkdownText', () => {
  it('renders curriculum complexity tables with semantic columns and inline code', () => {
    const html = renderToStaticMarkup(<MarkdownText content={'| 操作 | 成本 |\n| --- | --- |\n| 二分查找 | `O(log n)` |\n| 线性扫描 | O(n) |'} />);
    expect(html).toContain('<table');
    expect(html).toContain('scope="col"');
    expect(html).toContain('二分查找');
    expect(html).toContain('>O(log n)</code>');
    expect(html).not.toContain('| --- |');
  });
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

  it('renders inline and display LaTeX with KaTeX markup', () => {
    const html = renderToStaticMarkup(
      <MarkdownText content={'行内 $O(n^2)$。\n\n$$\\frac{a}{b}=c$$'} />,
    );

    expect(html).toContain('class="katex"');
    expect(html).toContain('class="katex-display"');
    expect(html).toContain('katex-html');
  });

  it('highlights explicitly labeled C++ code and preserves its source text', () => {
    const html = renderToStaticMarkup(
      <MarkdownText content={'```cpp\nint next = 1;\n```'} />,
    );

    expect(html).toContain('class="hljs');
    expect(html).toContain('hljs-type');
    expect(html).toContain('int');
    expect(html).toContain('next');
  });
});
