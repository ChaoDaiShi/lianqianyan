import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NetworkSearchPanel } from './NetworkSearchPanel';

describe('NetworkSearchPanel presentation', () => {
  it('names the real provider and keeps a clear evidence boundary', () => {
    const html = renderToStaticMarkup(<NetworkSearchPanel />);

    expect(html).toContain('联网学习检索 · Wikipedia');
    expect(html).toContain('补充资料');
    expect(html).toContain('不会写入学习诊断');
    expect(html).toContain('输入至少 2 个字符');
    expect(html).toContain('value="操作系统 死锁"');
    expect(html).toContain('检索联网资料');
    expect(html).not.toContain('全网搜索');
  });
});
