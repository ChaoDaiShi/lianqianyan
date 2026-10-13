// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  fetchPracticeQuestions: vi.fn(),
  evaluatePractice: vi.fn(),
}));

vi.mock('@/lib/educationApi', () => apiMocks);
vi.mock('@/store', () => ({
  ACTIVE_LEARNER_ID: 'learner-ui',
  ACTIVE_COURSE_ID: 'course-os',
}));

import { PracticeCard } from './PracticeCard';

describe('PracticeCard server question flow', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads PV practice questions and sends only the selected option ID for scoring', async () => {
    apiMocks.fetchPracticeQuestions.mockResolvedValue({
      version: 'course-os-practice-v1',
      questions: [
        {
          id: 'question-pv-demo-001',
          version: 'course-os-practice-v1',
          knowledgePointId: 'kp-pv',
          objectiveId: 'semaphore-p-operation',
          prompt: 'P 操作成功后信号量变化如何？',
          options: [
            { id: 'a', label: '信号量变为 0' },
            { id: 'b', label: '信号量变为 1' },
          ],
          recordedResult: null,
        },
      ],
    });
    apiMocks.evaluatePractice.mockResolvedValue({
      evidence: { id: 'evidence-pv' },
      masteryBefore: 0.4,
      masteryAfter: 0.45,
      confidence: 0.5,
      evidenceCount: 2,
      message: '记录完成',
      replanning: { status: 'not_needed', performed: false },
      isCorrect: true,
      score: 1,
      feedback: '服务端判定正确。',
      gradingVersion: 'server-objective-choice-v1',
      alreadyRecorded: false,
    });

    render(<PracticeCard />);

    expect(await screen.findByText('P 操作成功后信号量变化如何？')).toBeTruthy();
    expect(apiMocks.fetchPracticeQuestions).toHaveBeenCalledWith({
      learnerId: 'learner-ui',
      courseId: 'course-os',
      knowledgePointId: 'kp-pv',
    });
    fireEvent.click(screen.getByRole('button', { name: /信号量变为 0/ }));
    fireEvent.click(screen.getByRole('button', { name: '提交答案' }));
    expect(await screen.findByText('服务端判定正确。')).toBeTruthy();
    expect(apiMocks.evaluatePractice).toHaveBeenCalledWith({
      learnerId: 'learner-ui',
      courseId: 'course-os',
      knowledgePointId: 'kp-pv',
      questionId: 'question-pv-demo-001',
      optionId: 'a',
    });
  });
});
