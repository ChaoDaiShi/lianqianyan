import { describe, expect, it } from 'vitest';
import type { ExamDraftInput, ExamResult } from '@/domain';
import {
  answerIsComplete,
  buildResultCsv,
  formatExamScore,
  gradingStrategyLabel,
  responseKindLabel,
  validateExamDraft,
} from './examPresentation';

describe('exam presentation helpers', () => {
  it('uses stable Chinese labels for safe response and grading kinds', () => {
    expect(responseKindLabel('multiple_choice')).toBe('多选');
    expect(responseKindLabel('long_text')).toBe('长文本');
    expect(gradingStrategyLabel('keyword')).toBe('关键词部分评分');
    expect(gradingStrategyLabel('manual')).toBe('人工评分');
  });

  it('detects complete answers without treating false as empty', () => {
    expect(answerIsComplete(false)).toBe(true);
    expect(answerIsComplete('  ')).toBe(false);
    expect(answerIsComplete([])).toBe(false);
    expect(answerIsComplete(['互斥'])).toBe(true);
  });

  it('formats points and pending score honestly', () => {
    expect(formatExamScore(8, 10, 0)).toBe('8 / 10 分');
    expect(formatExamScore(8, 20, 10)).toBe('已得 8 分 · 10 分待批');
  });

  it('validates the full publishable draft instead of only the title', () => {
    const invalid: ExamDraftInput = {
      courseId: 'course-os',
      title: '  ',
      description: '',
      durationMinutes: 0,
      passPercentage: 120,
      shuffleQuestions: false,
      items: [],
    };

    expect(validateExamDraft(invalid)).toEqual([
      '请填写试卷标题',
      '考试时长应为 1–480 分钟',
      '及格线应为 0–100%',
      '至少选择一道有效题目',
    ]);
  });

  it('exports a result CSV with spreadsheet-formula protection and quoting', () => {
    const result = {
      id: 'attempt-1',
      examId: 'exam-1',
      learnerId: 'learner-1',
      examTitle: '=阶段,"测评"',
      status: 'graded',
      startedAt: '2026-08-25T08:00:00',
      expiresAt: '2026-08-25T08:30:00',
      submittedAt: '2026-08-25T08:10:00',
      awardedScore: 8,
      maxScore: 10,
      pendingScore: 0,
      percentage: 80,
      passed: true,
      answers: [
        {
          answerId: 'answer-1',
          questionId: 'question-1',
          questionTypeName: '简答题',
          responseKind: 'short_text',
          gradingStrategy: 'exact',
          prompt: '解释,"互斥"',
          options: [],
          userAnswer: '+危险开头',
          correctAnswer: '参考',
          keywords: [],
          explanation: '解析',
          points: 10,
          awardedScore: 8,
          isCorrect: false,
          gradingStatus: 'auto',
          feedback: '继续复习',
        },
      ],
    } satisfies ExamResult;

    const csv = buildResultCsv(result);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain("'=阶段");
    expect(csv).toContain("'+危险开头");
    expect(csv).toContain('"解释,""互斥"""');
  });
});

