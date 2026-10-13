// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExamAttempt, ExamCatalogItem } from '@/domain';
import { ExamCatalog } from './ExamCatalog';

const api = vi.hoisted(() => ({
  fetchExamCatalog: vi.fn(),
  fetchExamResult: vi.fn(),
  startExamAttempt: vi.fn(),
}));
const runner = vi.hoisted(() => ({ props: null as null | { onExit: () => void } }));

vi.mock('@/lib/educationApi', () => api);
vi.mock('./ExamRunner', () => ({
  ExamRunner: (props: { onExit: () => void }) => {
    runner.props = props;
    return <button type="button" onClick={props.onExit}>退出考场</button>;
  },
}));
vi.mock('./ExamResultView', () => ({ ExamResultView: () => <div>考试结果</div> }));

const exam: ExamCatalogItem = {
  id: 'exam-1',
  courseId: 'course-1',
  title: '阶段测评',
  description: '',
  durationMinutes: 30,
  passPercentage: 60,
  questionCount: 1,
  totalPoints: 10,
  publishedAt: '2026-10-13T00:00:00Z',
  latestAttempt: null,
};
const attempt: ExamAttempt = {
  id: 'attempt-1',
  examId: 'exam-1',
  learnerId: 'learner-1',
  examTitle: '阶段测评',
  status: 'in_progress',
  startedAt: '2026-10-13T08:00:00Z',
  expiresAt: '2026-10-13T08:30:00Z',
  submittedAt: null,
  questions: [],
};

afterEach(() => cleanup());

describe('ExamCatalog immersive lifecycle', () => {
  it('enters immersive mode for a running attempt and leaves it when the attempt exits', async () => {
    api.fetchExamCatalog.mockResolvedValue([exam]);
    api.startExamAttempt.mockResolvedValue(attempt);
    const onImmersiveChange = vi.fn();

    render(<ExamCatalog onImmersiveChange={onImmersiveChange} />);
    fireEvent.click(await screen.findByRole('button', { name: '开始考试' }));
    await waitFor(() => expect(onImmersiveChange).toHaveBeenLastCalledWith(true));
    fireEvent.click(screen.getByRole('button', { name: '退出考场' }));
    expect(onImmersiveChange).toHaveBeenLastCalledWith(false);
  });
});
