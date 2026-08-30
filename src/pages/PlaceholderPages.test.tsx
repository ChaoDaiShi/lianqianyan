import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

vi.mock('@/components/design/GlassPanel', () => ({
  GlassPanel: ({ children }: { children: ReactNode }) => <section>{children}</section>,
}));

vi.mock('@/components/xiaolian/XiaolianCharacter', () => ({
  XiaolianCharacter: () => <div>xiaolian-character</div>,
}));

vi.mock('@/config/learnerContext', () => ({
  ACTIVE_LEARNER_CONTEXT: {
    learnerId: 'account-test',
    courseId: 'course-os',
    source: 'account',
  },
}));

describe('formal account information pages', () => {
  it('explains account, password and voice privacy boundaries', async () => {
    const { SettingsPage } = await import('./PlaceholderPages');
    const html = renderToStaticMarkup(<SettingsPage />);

    expect(html).toContain('账号与学习设置');
    expect(html).toContain('已认证账号档案');
    expect(html).toContain('密码只保存 scrypt 哈希');
    expect(html).toContain('再次登录即可恢复');
    expect(html).toContain('原始音频不会上传');
    expect(html).toContain(
      '语音输出文字只会发送到部署方配置的 MiniMax 云端服务',
    );
    expect(html).not.toContain('GPT-SoVITS');
  });

  it('links to developer and settings pages without duplicate chat or competition routes', async () => {
    const { AboutPage } = await import('./PlaceholderPages');
    const html = renderToStaticMarkup(<AboutPage />);

    expect(html).toContain('href="/about/capabilities"');
    expect(html).not.toContain('href="/agent"');
    expect(html).not.toContain('/demo');
    expect(html).not.toContain('/showcase');
    expect(html).not.toContain('比赛展示');
  });
});
