import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ExamResult } from '@/domain';
import { ExamResultView } from './ExamResultView';

const result: ExamResult = {
  id: 'attempt-1',
  examId: 'exam-1',
  learnerId: 'learner-1',
  examTitle: '操作系统阶段测评',
  status: 'needs_review',
  startedAt: '2026-08-25T08:00:00',
  expiresAt: '2026-08-25T08:30:00',
  submittedAt: '2026-08-25T08:20:00',
  awardedScore: 8,
  maxScore: 20,
  pendingScore: 10,
  percentage: 40,
  passed: null,
  answers: [
    {
      answerId: 'answer-1',
      questionId: 'question-1',
      questionTypeName: '关键词简答题',
      responseKind: 'short_text',
      gradingStrategy: 'keyword',
      prompt: '列出死锁条件。',
      options: [],
      userAnswer: '互斥和循环等待',
      correctAnswer: '',
      keywords: ['互斥', '循环等待', '不可抢占'],
      explanation: '需要说明四个必要条件。',
      points: 10,
      awardedScore: 8,
      isCorrect: false,
      gradingStatus: 'auto',
      feedback: '还需补充不可抢占。',
    },
    {
      answerId: 'answer-2',
      questionId: 'question-2',
      questionTypeName: '人工论述题',
      responseKind: 'long_text',
      gradingStrategy: 'manual',
      prompt: '解释避免算法。',
      options: [],
      userAnswer: '检查安全状态。',
      correctAnswer: '参考答案',
      keywords: [],
      explanation: '',
      points: 10,
      awardedScore: null,
      isCorrect: null,
      gradingStatus: 'pending_manual',
      feedback: '等待人工批阅',
    },
  ],
};

describe('ExamResultView', () => {
  it('shows provisional scoring, per-question review and export actions', () => {
    const html = renderToStaticMarkup(<ExamResultView result={result} />);

    expect(html).toContain('成绩复盘');
    expect(html).toContain('10 分待批');
    expect(html).toContain('暂不判定是否通过');
    expect(html).toContain('还需补充不可抢占');
    expect(html).toContain('等待人工批阅');
    expect(html).toContain('导出 CSV');
    expect(html).toContain('导出 JSON');
  });
});

