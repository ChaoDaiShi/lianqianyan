import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AgentPage } from './AgentPage';

vi.mock('@/pages/XiaolianPage', () => ({
  XiaolianWorkspace: ({ embedded }: { embedded?: boolean }) => (
    <div data-workspace-embedded={String(Boolean(embedded))}>agent-workspace</div>
  ),
}));

vi.mock('@/components/design/NebulaBackground', () => ({
  NebulaBackground: () => <div data-nebula="true" />,
}));

describe('AgentPage', () => {
  it('renders the standalone workspace without the full application shell', () => {
    const html = renderToStaticMarkup(<AgentPage />);

    expect(html).toContain('独立智能体');
    expect(html).toContain('data-agent-embed="true"');
    expect(html).toContain('data-workspace-embedded="true"');
    expect(html).not.toContain('学习星轨');
  });
});
