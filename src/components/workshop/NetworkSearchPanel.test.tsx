// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/educationApi', () => ({ searchNetwork: vi.fn() }));
import { searchNetwork } from '@/lib/educationApi';
import { NetworkSearchPanel } from './NetworkSearchPanel';

describe('NetworkSearchPanel presentation', () => {
  it('names the real provider and keeps a clear evidence boundary', () => {
    const html = renderToStaticMarkup(<NetworkSearchPanel />);

    expect(html).toContain('联网学习检索 · AnySearch');
    expect(html).toContain('补充资料');
    expect(html).toContain('不会写入学习诊断');
    expect(html).toContain('输入至少 2 个字符');
    expect(html).toContain('value="操作系统 死锁"');
    expect(html).toContain('检索联网资料');
    expect(html).toContain('02 · 处理过程');
    expect(html).toContain('响应没有可信度等级字段，因此不评级。');
    expect(html).not.toContain('全网搜索');
    expect(html).not.toContain('可信度：高');
  });

  it('shows the actual provider, source URL, response receipt time, and missing credibility field', async () => {
    vi.mocked(searchNetwork).mockResolvedValue({
      provider: 'anysearch',
      query: '操作系统 死锁',
      results: [{ title: '死锁定义', summary: '原始摘要', url: 'https://example.edu/deadlock', sourceDomain: 'example.edu' }],
    });
    render(<NetworkSearchPanel />);

    fireEvent.click(screen.getByRole('button', { name: '检索联网资料' }));

    await waitFor(() => expect(screen.getByText('anysearch')).toBeTruthy());
    expect(screen.getByRole('link', { name: /查看原文/ }).getAttribute('href')).toBe('https://example.edu/deadlock');
    expect(screen.getByText('响应接收时间（本机）')).toBeTruthy();
    expect(screen.getByText('可信度等级：未提供（检索响应没有该字段）')).toBeTruthy();
  });
});
