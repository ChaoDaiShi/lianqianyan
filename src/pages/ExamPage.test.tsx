import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/components/exam/ExamCatalog', () => ({ ExamCatalog: () => <div>catalog-panel</div> }));
vi.mock('@/components/exam/ExamHistory', () => ({ ExamHistory: () => <div>history-panel</div> }));
vi.mock('@/components/exam/QuestionBank', () => ({ QuestionBank: () => <div>question-bank-panel</div> }));
vi.mock('@/components/exam/ExamBuilder', () => ({ ExamBuilder: () => <div>builder-panel</div> }));
vi.mock('@/components/exam/ExamGenerator', () => ({ ExamGenerator: () => <div>generator-panel</div> }));

import { ExamPage } from './ExamPage';

describe('ExamPage', () => {
  it('exposes the complete student and authoring workflow with honest boundaries', () => {
    const html = renderToStaticMarkup(<ExamPage />);

    expect(html).toContain('考试中心');
    expect(html).toContain('我的结果');
    expect(html).toContain('题库与题型');
    expect(html).toContain('命题与批阅');
    expect(html).toContain('AI 智能组卷');
    expect(html).toContain('服务端计时');
    expect(html).toContain('发布后锁定');
    expect(html).toContain('匿名学习档案');
    expect(html).toContain('不构成账号权限或监考保证');
    expect(html).not.toContain('单学习者演示');
    expect(html).toContain('catalog-panel');
    expect(html).toContain('history-panel');
    expect(html).toContain('question-bank-panel');
    expect(html).toContain('builder-panel');
    expect(html).toContain('generator-panel');
  });
});
