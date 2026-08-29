import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/layout/AppShell', () => ({ AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock('@/theme/ThemeProvider', () => ({ useTheme: () => ({ preference: 'system', setPreference: vi.fn() }) }));
vi.mock('@/lib/settingsApi', () => ({
  fetchAccountSettings: vi.fn(), listMcpTokens: vi.fn(), createMcpToken: vi.fn(), createModelProfile: vi.fn(),
  deleteModelProfile: vi.fn(), revokeMcpToken: vi.fn(), selectModelProfile: vi.fn(),
}));

import { SettingsPage } from './SettingsPage';

describe('SettingsPage preference space', () => {
  it('shows preference categories while keeping credentials out of the first view', () => {
    const html = renderToStaticMarkup(<SettingsPage />);

    expect(html).toContain('偏好与服务');
    expect(html).toContain('外观与主题');
    expect(html).toContain('模型与智能');
    expect(html).toContain('语音与小涟');
    expect(html).toContain('MCP 与服务');
    expect(html).toContain('账号与安全');
    expect(html).not.toContain('API Key（加密保存，可选）');
    expect(html).not.toContain('创建令牌');
  });
});
