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
      '语音输出文字会发送到部署方配置的语音服务（Genie-TTS 或 GPT-SoVITS）',
    );
    expect(html).toContain('GPT-SOVITS项目作者为花儿不哭');
  });

  it('links to the embed page without competition routes', async () => {
    const { AboutPage } = await import('./PlaceholderPages');
    const html = renderToStaticMarkup(<AboutPage />);

    expect(html).toContain('href="/agent"');
    expect(html).toContain('跨平台智能体');
    expect(html).not.toContain('/demo');
    expect(html).not.toContain('/showcase');
    expect(html).not.toContain('比赛展示');
  });
});
