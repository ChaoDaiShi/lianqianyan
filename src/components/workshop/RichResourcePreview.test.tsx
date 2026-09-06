import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RichResourcePreview } from './RichResourcePreview';

describe('RichResourcePreview', () => {
  it('renders markdown structure with emphasized and red callout spans', () => {
    const html = renderToStaticMarkup(
      <RichResourcePreview content={'# 死锁\n\n> 生成说明\n\n- **要点**一\n\n<span style="color:#dc2626">注意</span>警告'} />,
    );
    expect(html).toContain('<h1');
    expect(html).toContain('<aside');
    expect(html).toContain('<strong>要点</strong>');
    expect(html).toContain('text-red-600');
    expect(html).not.toContain('<figure');
  });

  it('embeds the course illustration inside the preview flow instead of above it', () => {
    const html = renderToStaticMarkup(
      <RichResourcePreview
        content={'# 死锁\n\n正文'}
        imageUrl="https://cdn.example.edu/deadlock.png"
        imageCaption="课程信息图 · MiniMax image-01"
      />,
    );
    expect(html).toContain('<article');
    expect(html).toContain('<figure');
    expect(html).toContain('https://cdn.example.edu/deadlock.png');
    expect(html).toContain('课程信息图 · MiniMax image-01');
    // 配图在正文之后（嵌入内容流），而不是预览容器之前
    expect(html.indexOf('正文')).toBeLessThan(html.indexOf('<figure'));
  });
});
