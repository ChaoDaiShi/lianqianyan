import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ExamAttempt } from '@/domain';
import { ExamRunner } from './ExamRunner';

vi.mock('@/components/digital-human/useSpeechSynthesis', () => ({
  useSpeechSynthesis: () => ({
    supported: true,
    speaking: false,
    speak: vi.fn(),
    stop: vi.fn(),
  }),
}));

vi.mock('@/components/digital-human/useSpeechRecognition', () => ({
  useSpeechRecognition: () => ({
    supported: true,
    listening: false,
    interimTranscript: '',
    error: null,
    start: vi.fn(),
    stop: vi.fn(),
    resetError: vi.fn(),
  }),
}));

const attempt: ExamAttempt = {
  id: 'attempt-1',
  examId: 'exam-1',
  learnerId: 'learner-1',
  examTitle: '操作系统阶段测评',
  status: 'in_progress',
  startedAt: '2099-08-25T08:00:00',
  expiresAt: '2099-08-25T08:30:00',
  submittedAt: null,
  questions: [
    {
      questionId: 'question-1',
      questionTypeName: '单选题',
      responseKind: 'single_choice',
      prompt: '死锁的必要条件是？',
      options: ['互斥', '可抢占'],
      points: 10,
      position: 1,
      userAnswer: null,
      savedAt: null,
    },
    {
      questionId: 'question-2',
      questionTypeName: '论述题',
      responseKind: 'long_text',
      prompt: '解释死锁避免。',
      options: [],
      points: 10,
      position: 2,
      userAnswer: '',
      savedAt: null,
    },
  ],
};

describe('ExamRunner', () => {
  it('renders accessible questions, server deadline, autosave and voice controls', () => {
    const html = renderToStaticMarkup(
      <ExamRunner attempt={attempt} onSubmitted={vi.fn()} onExit={vi.fn()} />,
    );

    expect(html).toContain('操作系统阶段测评');
    expect(html).toContain('服务端截止时间');
    expect(html).toContain('自动保存');
    expect(html).toContain('死锁的必要条件是');
    expect(html).toContain('解释死锁避免');
    expect(html).toContain('数字人讲解');
    expect(html).toContain('语音输入');
    expect(html).toContain('确认文字后再交卷');
    expect(html).toContain('交卷');
  });
});

