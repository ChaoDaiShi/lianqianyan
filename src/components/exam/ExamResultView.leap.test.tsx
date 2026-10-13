// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExamResult } from '@/domain';
import { ExamResultView } from './ExamResultView';

const lookups = vi.hoisted(() => ({
  fetchExamQuestions: vi.fn(),
  fetchLeapCatalog: vi.fn(),
}));
vi.mock('@/lib/educationApi', () => ({ fetchExamQuestions: lookups.fetchExamQuestions }));
vi.mock('@/lib/adaptiveApi', () => ({ fetchLeapCatalog: lookups.fetchLeapCatalog }));

const result: ExamResult = {
  id: 'attempt-1', examId: 'exam-1', learnerId: 'learner-1', examTitle: '测评',
  status: 'graded', startedAt: '2026-10-13T08:00:00Z', expiresAt: '2026-10-13T08:30:00Z',
  submittedAt: '2026-10-13T08:20:00Z', awardedScore: 0, maxScore: 10, pendingScore: 0,
  percentage: 0, passed: false,
  answers: [{
    answerId: 'answer-1', questionId: 'q-1', questionTypeName: '单选题', responseKind: 'single_choice',
    gradingStrategy: 'exact', prompt: '链表题', options: ['A'], userAnswer: 'A', correctAnswer: 'B',
    keywords: [], explanation: '', points: 10, awardedScore: 0, isCorrect: false,
    gradingStatus: 'auto', feedback: '回答不正确',
  }],
};

afterEach(() => {
  cleanup();
  lookups.fetchExamQuestions.mockReset();
  lookups.fetchLeapCatalog.mockReset();
});

describe('ExamResultView LEAP links', () => {
  it('links a lost question only after matching its course question to a supported LEAP topic', async () => {
    lookups.fetchExamQuestions.mockResolvedValue([{ id: 'q-1', knowledgePointId: 'kp-list' }]);
    lookups.fetchLeapCatalog.mockResolvedValue({ topics: [{ id: 'linked-list', name: '链表', knowledgePointId: 'kp-list' }] });

    render(<MemoryRouter><ExamResultView result={result} courseId="course-ds" /></MemoryRouter>);

    const link = await screen.findByRole('link', { name: '前往 LEAP：链表（1 道错题）' });
    expect(link.getAttribute('href')).toBe('/adaptive?topic=linked-list');
    expect(lookups.fetchExamQuestions).toHaveBeenCalledWith('course-ds');
    await waitFor(() => expect(lookups.fetchLeapCatalog).toHaveBeenCalledOnce());
  });
});
