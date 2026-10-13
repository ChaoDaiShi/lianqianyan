import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

vi.mock('@/components/xiaolian/XiaolianCharacter', () => ({
  XiaolianCharacter: () => <div>live2d-xiaolian</div>,
}));

vi.mock('@/components/workshop/ResourceGenerator', () => ({
  ResourceGenerator: () => <div>resource-generator-panel</div>,
}));

vi.mock('@/components/workshop/NetworkSearchPanel', () => ({
  NetworkSearchPanel: () => <div>network-search-panel</div>,
}));

vi.mock('@/components/workshop/CompilerLab', () => ({
  CompilerLab: () => <div>compiler-lab-panel</div>,
}));

import { ResourcesPage } from './ResourcesPage';

describe('ResourcesPage learning workshop', () => {
  it('leads with a creation workspace and keeps supporting tools secondary', () => {
    const html = renderToStaticMarkup(<ResourcesPage />);

    expect(html).toContain('创作工作台');
    expect(html).toContain('输入参数');
    expect(html).toContain('处理过程');
    expect(html).toContain('产物预览');
    expect(html).toContain('资源生成');
    expect(html).toContain('联网检索');
    expect(html).toContain('编译实验');
    expect(html).toContain('resource-generator-panel');
    expect(html).toContain('network-search-panel');
    expect(html).toContain('compiler-lab-panel');
    expect(html).toContain('输入参数');
    expect(html).toContain('扩展工具');
    expect(html).toContain('live2d-xiaolian');
  });
});
