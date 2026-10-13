// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExamAttempt } from '@/domain';
import { ExamRunner } from './ExamRunner';

const api = vi.hoisted(() => ({
  saveExamAnswer: vi.fn().mockResolvedValue({ answerId: 'answer-1', savedAt: '2026-10-13T00:00:00Z' }),
  submitExamAttempt: vi.fn().mockResolvedValue({ id: 'attempt-1' }),
}));

vi.mock('@/lib/educationApi', () => api);
vi.mock('@/components/digital-human/useSpeechSynthesis', () => ({
  useSpeechSynthesis: () => ({
    supported: true,
    speaking: false,
    mode: 'browser',
    provider: null,
    error: null,
    speak: vi.fn(),
    stop: vi.fn(),
  }),
}));
vi.mock('@/components/digital-human/useSpeechRecognition', () => ({
  useSpeechRecognition: () => ({
    supported: false,
    listening: false,
    interimTranscript: '',
    error: null,
    start: vi.fn(),
    stop: vi.fn(),
    resetError: vi.fn(),
  }),
}));
vi.mock('@/components/digital-human/SpeechControls', () => ({
  SpeechControls: () => null,
}));
vi.mock('@/components/digital-human/VoiceAttributionNotice', () => ({
  VoiceAttributionNotice: () => null,
}));
vi.mock('@/components/digital-human/VoiceInputButton', () => ({
  VoiceInputButton: () => null,
}));

const attempt: ExamAttempt = {
  id: 'attempt-1',
  examId: 'exam-1',
  learnerId: 'learner-1',
  examTitle: '阶段测评',
  status: 'in_progress',
  startedAt: '2099-10-13T08:00:00Z',
  expiresAt: '2099-10-13T08:30:00Z',
  submittedAt: null,
  questions: [
    {
      questionId: 'question-1',
      questionTypeName: '单选题',
      responseKind: 'single_choice',
      prompt: '第一个问题',
      options: ['A'],
      points: 10,
      position: 1,
      userAnswer: null,
      savedAt: null,
    },
    {
      questionId: 'question-2',
      questionTypeName: '简答题',
      responseKind: 'short_text',
      prompt: '第二个问题',
      options: [],
      points: 10,
      position: 2,
      userAnswer: null,
      savedAt: null,
    },
  ],
};

afterEach(() => {
  cleanup();
  api.saveExamAnswer.mockClear();
  api.submitExamAttempt.mockClear();
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
});

let scrollSpy: ReturnType<typeof vi.fn>;
beforeEach(() => {
  scrollSpy = vi.fn();
  HTMLElement.prototype.scrollIntoView = scrollSpy;
});

describe('ExamRunner interactions', () => {
  it('jumps from the answer grid and keeps a review mark visible', () => {
    render(<ExamRunner attempt={attempt} onSubmitted={vi.fn()} onExit={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /^第 2 题/ }));
    expect(screen.getByText('第二个问题')).not.toBeNull();
    expect(scrollSpy).toHaveBeenCalledWith({ block: 'start' });

    fireEvent.click(screen.getByRole('button', { name: '标记第 2 题待核验' }));
    expect(screen.getByRole('button', { name: '第 2 题，未作答，待核验' })).not.toBeNull();
  });

  it('shows unanswered count and requires a second confirmation before manual submission', async () => {
    render(<ExamRunner attempt={attempt} onSubmitted={vi.fn()} onExit={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '交卷' }));
    expect(screen.getByText('仍有 2 道题未作答')).not.toBeNull();
    expect(api.submitExamAttempt).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '确认交卷' }));
    await waitFor(() => expect(api.submitExamAttempt).toHaveBeenCalledOnce());
  });
});
