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
  it('leads with the assessment workspace and folds authoring behind secondary entries', () => {
    const html = renderToStaticMarkup(<ExamPage />);

    expect(html).toContain('测评工作台');
    expect(html).toContain('当前测评');
    expect(html).toContain('我的结果');
    expect(html).toContain('题库与题型');
    expect(html).toContain('试卷与批阅');
    expect(html).toContain('AI 智能组卷');
    expect(html).toContain('考试与成绩');
    expect(html).toContain('出题与组卷');
    expect(html).toContain('当前账号');
    expect(html).not.toContain('匿名学习档案');
    expect(html).not.toContain('不构成账号权限或监考保证');
    expect(html).not.toContain('单学习者演示');
    expect(html).toContain('catalog-panel');
    expect(html).toContain('history-panel');
    expect(html).toContain('question-bank-panel');
    expect(html).toContain('builder-panel');
    expect(html).toContain('generator-panel');
  });
});
