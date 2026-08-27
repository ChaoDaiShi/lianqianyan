import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AuthScreen } from './AuthScreen';

describe('AuthScreen', () => {
  it('presents real login and registration instead of default learning', () => {
    const html = renderToStaticMarkup(
      <AuthScreen onLogin={vi.fn()} onRegister={vi.fn()} busy={false} error={null} />,
    );
    expect(html).toContain('登录学习空间');
    expect(html).toContain('创建账号');
    expect(html).toContain('登录后才会加载你的学习数据');
    expect(html).not.toContain('默认学习');
  });
});
