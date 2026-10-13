// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/layout/AppShell', () => ({ AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock('@/theme/ThemeProvider', () => ({ useTheme: () => ({ preference: 'system', setPreference: vi.fn() }) }));
vi.mock('@/lib/settingsApi', () => ({
  fetchAccountSettings: vi.fn(), listMcpTokens: vi.fn(), createMcpToken: vi.fn(), createModelProfile: vi.fn(),
  deleteModelProfile: vi.fn(), revokeMcpToken: vi.fn(), selectModelProfile: vi.fn(),
}));
vi.mock('@/lib/educationApi', () => ({ fetchHealth: vi.fn() }));
vi.mock('@/lib/voiceApi', () => ({ fetchVoiceStatus: vi.fn() }));

import { SettingsPage } from './SettingsPage';
import { fetchHealth } from '@/lib/educationApi';
import { fetchVoiceStatus } from '@/lib/voiceApi';
import { fetchAccountSettings, listMcpTokens } from '@/lib/settingsApi';

describe('SettingsPage preference space', () => {
  it('shows preference categories while keeping credentials out of the first view', () => {
    const html = renderToStaticMarkup(<SettingsPage />);

    expect(html).toContain('偏好与服务');
    expect(html).toContain('外观与主题');
    expect(html).toContain('模型与智能');
    expect(html).toContain('云端能力');
    expect(html).toContain('MiniMax · AnySearch');
    expect(html).toContain('MCP 与服务');
    expect(html).toContain('账号与安全');
    expect(html).not.toContain('API Key（加密保存，可选）');
    expect(html).not.toContain('创建令牌');
  });

  it('measures only existing non-billable status requests and labels the client timing', async () => {
    vi.mocked(fetchAccountSettings).mockResolvedValue({
      theme: 'system', selected_llm_profile_id: null, selected_tts_profile_id: null,
      profiles: [], default_llm: { configured: false, provider: 'default', model: null },
      default_tts: { configured: false, provider: 'unavailable', model: null },
      custom_model_hosts: [], secret_storage_configured: false,
    });
    vi.mocked(listMcpTokens).mockResolvedValue([]);
    vi.mocked(fetchHealth).mockResolvedValue({ status: 'ok', service: 'education' });
    vi.mocked(fetchVoiceStatus).mockResolvedValue({ provider: 'minimax', configured: true });

    render(<SettingsPage />);
    fireEvent.click(screen.getAllByRole('button', { name: /云端能力/ })[1]);
    fireEvent.click(screen.getByRole('button', { name: '检查服务状态' }));

    await waitFor(() => expect(screen.getByText('服务端状态：ok')).toBeTruthy());
    expect(screen.getByText('minimax 已配置')).toBeTruthy();
    expect(screen.getAllByText(/状态检查请求耗时：\d+ ms/)).toHaveLength(2);
    expect(screen.getByText('此接口只返回服务配置状态，不代表已完成上游语音调用。')).toBeTruthy();
  });
});
