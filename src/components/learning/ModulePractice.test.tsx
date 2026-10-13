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
  ACTIVE_COURSE_ID: 'course-ds',
}));

import { ModulePractice } from './ModulePractice';

const question = {
  id: 'ds-sq-practice-01',
  version: 'ds-bank-v2',
  knowledgePointId: 'kp-stack-queue',
  objectiveId: 'stack-queue-order',
  prompt: '空栈 push(A)、push(B) 后 pop 返回什么？',
  options: [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
  ],
};

describe('ModulePractice server question flow', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the current knowledge point and restores an already recorded answer without submitting it again', async () => {
    apiMocks.fetchPracticeQuestions.mockResolvedValue({
      version: 'ds-bank-v2',
      questions: [
        {
          ...question,
          recordedResult: {
            optionId: 'b',
            isCorrect: false,
            score: 0,
            feedback: '正确答案是 A。',
          },
        },
      ],
    });

    render(
      <ModulePractice
        taskId="task-1"
        knowledgePointId="kp-stack-queue"
        knowledgePointName="栈与队列"
      />,
    );

    expect(await screen.findByText(question.prompt)).toBeTruthy();
    expect(apiMocks.fetchPracticeQuestions).toHaveBeenCalledWith({
      learnerId: 'learner-ui',
      courseId: 'course-ds',
      knowledgePointId: 'kp-stack-queue',
    });
    expect(screen.getByRole('button', { name: /B/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('正确答案是 A。')).toBeTruthy();
    expect(screen.getByRole('button', { name: '已记录' }).hasAttribute('disabled')).toBe(true);
    expect(apiMocks.evaluatePractice).not.toHaveBeenCalled();
  });

  it('submits only the selected option ID and locks the item after server scoring', async () => {
    apiMocks.fetchPracticeQuestions.mockResolvedValue({
      version: 'ds-bank-v2',
      questions: [{ ...question, recordedResult: null }],
    });
    apiMocks.evaluatePractice.mockResolvedValue({
      evidence: { id: 'evidence-1' },
      masteryBefore: 0.4,
      masteryAfter: 0.45,
      confidence: 0.6,
      evidenceCount: 3,
      message: '记录完成',
      replanning: { status: 'not_needed', performed: false },
      isCorrect: true,
      score: 1,
      feedback: '服务端评分正确。',
      gradingVersion: 'server-objective-choice-v1',
      alreadyRecorded: false,
    });

    render(
      <ModulePractice
        taskId="task-2"
        knowledgePointId="kp-stack-queue"
        knowledgePointName="栈与队列"
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: /B/ }));
    fireEvent.click(screen.getByRole('button', { name: '提交答案' }));

    await screen.findByText('服务端评分正确。');
    expect(apiMocks.evaluatePractice).toHaveBeenCalledOnce();
    expect(apiMocks.evaluatePractice).toHaveBeenCalledWith({
      learnerId: 'learner-ui',
      courseId: 'course-ds',
      knowledgePointId: 'kp-stack-queue',
      questionId: 'ds-sq-practice-01',
      optionId: 'b',
    });
    expect(screen.getByRole('button', { name: '已记录' }).hasAttribute('disabled')).toBe(true);
  });

  it('shows an empty catalog without falling back to local demo questions', async () => {
    apiMocks.fetchPracticeQuestions.mockResolvedValue({ version: 'empty', questions: [] });

    render(
      <ModulePractice
        taskId="task-empty"
        knowledgePointId="kp-sorting-search"
        knowledgePointName="查找与排序"
      />,
    );

    expect(await screen.findByText(/当前知识点暂未配置可用练习题/)).toBeTruthy();
    expect(apiMocks.fetchPracticeQuestions).toHaveBeenCalledWith({
      learnerId: 'learner-ui',
      courseId: 'course-ds',
      knowledgePointId: 'kp-sorting-search',
    });
  });
});
