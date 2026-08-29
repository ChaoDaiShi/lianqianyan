import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AuthScreen } from './AuthScreen';

describe('AuthScreen', () => {
  const renderScreen = ({
    busy = false,
    error = null,
  }: {
    busy?: boolean;
    error?: string | null;
  } = {}) =>
    renderToStaticMarkup(
      <AuthScreen
        onLogin={vi.fn()}
        onRegister={vi.fn()}
        busy={busy}
        error={error}
      />
    );

  it('presents the supplied learning-space background as the companion scene', () => {
    const html = renderScreen();

    expect(html).toContain('data-auth-entry="companion"');
    expect(html).toContain('data-auth-scene="illustrated"');
    expect(html).toContain('data-auth-background="learning-space"');
    expect(html).toContain('/brand/learning-space-background.png');
    expect(html).toContain('data-auth-card="true"');
    expect(html).toContain('data-auth-brand="true"');
    expect(html).toContain('进入我的学习空间');
    expect(html).toContain('没有账号？');
    expect(html).toContain('忆涟千言—教');
    expect(html).toContain('bg-[#7766E8]');
    expect(html).not.toContain('bg-gradient-to-r');
    expect(html).not.toContain('新账号没有预设计划');
    expect(html).not.toContain('学习记录与账号隔离');
    expect(html).not.toContain('持续调整辅导');
    expect(html).not.toContain('/brand/cyrene-learning-welcome.webp');
  });

  it('keeps truthful login and registration states in the focused entry', () => {
    expect(renderScreen({ busy: true })).toContain('正在登录…');
    expect(renderScreen({ error: '用户名或密码不正确。' })).toContain('role="alert"');
    expect(renderScreen()).toContain('创建账号');
  });

  it('keeps the real credential constraints and account switch available', () => {
    const html = renderScreen();
    expect(html).toContain('name="username"');
    expect(html).toContain('minLength="3"');
    expect(html).toContain('maxLength="32"');
    expect(html).toContain('name="password"');
    expect(html).toContain('minLength="8"');
    expect(html).toContain('maxLength="128"');
    expect(html).toContain('创建账号');
    expect(html).not.toContain('默认学习');
  });

  it('shows restrained real loading and inline error states', () => {
    const busyHtml = renderScreen({ busy: true });
    const errorHtml = renderScreen({ error: '用户名或密码不正确。' });

    expect(busyHtml).toContain('disabled=""');
    expect(busyHtml).toContain('正在登录…');
    expect(busyHtml).not.toContain('小涟正在思考');
    expect(errorHtml).toContain('role="alert"');
    expect(errorHtml).toContain('用户名或密码不正确。');
    expect(errorHtml).toContain('bg-[#FFF5F6]');
  });
});
