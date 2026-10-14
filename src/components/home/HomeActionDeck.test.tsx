import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { HomeActionDeck } from './HomeActionDeck';
vi.mock('@/store', () => ({ ACTIVE_COURSE_ID: 'course-ds' }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...actual,
    Link: ({ to, children }: { to: string; children: ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  };
});

describe('HomeActionDeck', () => {
  it('gives a real first-step diagnosis route for an account without evidence', () => {
    const html = renderToStaticMarkup(
      <HomeActionDeck
        diagnosis={null}
        plan={null}
        task={null}
        evidenceCount={0}
        loading={false}
        error={false}
        generating={false}
        starting={false}
        onGeneratePlan={vi.fn()}
        onPrepareTask={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(html).toContain('尚未完成课程诊断');
    expect(html).toContain('href="/adaptive"');
    expect(html).toContain('先完成一次短诊断');
    expect(html).not.toContain('5 分钟快速水平摸底诊断');
    expect(html).not.toContain('0%');
  });

  it('keeps the diagnosis call to action when learning evidence exists without a recorded diagnosis', () => {
    const html = renderToStaticMarkup(
      <HomeActionDeck
        diagnosis={null}
        plan={null}
        task={null}
        evidenceCount={3}
        loading={false}
        error={false}
        generating={false}
        starting={false}
        onGeneratePlan={vi.fn()}
        onPrepareTask={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(html).toContain('已有 3 条学习行为记录');
    expect(html).toContain('它们不代表诊断结果');
    expect(html).toContain('href="/adaptive"');
    expect(html).toContain('开始诊断');
    expect(html).not.toContain('诊断已记录，尚未生成计划');
    expect(html).not.toContain('生成学习计划');
  });
});
