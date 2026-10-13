// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { LearningEvidence } from '@/lib/educationApi';
import { HomeEvidencePanel } from './HomeEvidencePanel';

const recordedEvidence: LearningEvidence = {
  id: 'evidence-1',
  learnerId: 'learner-1',
  courseId: 'course-ds',
  evidenceType: 'learning_started',
  source: 'learning_space',
  knowledgePointId: 'array-basics',
  payload: { taskId: 'task-1' },
  occurredAt: '2026-10-13T08:00:00.000Z',
};

afterEach(cleanup);

describe('HomeEvidencePanel', () => {
  it('shows the request failure and retries, then shows a recorded event after data succeeds', () => {
    const onRetryEvidence = vi.fn();
    const props = {
      evidence: [],
      evidenceLoading: false,
      evidenceError: true,
      onRetryEvidence,
      diagnosis: null,
      sessions: [],
      sessionsLoading: false,
      sessionsError: null,
    };
    const { rerender } = render(
      <MemoryRouter>
        <HomeEvidencePanel {...props} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert').textContent).toContain('学习记录暂时无法读取');
    expect(screen.queryByText('尚无学习记录')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '重新加载学习记录' }));
    expect(onRetryEvidence).toHaveBeenCalledOnce();

    rerender(
      <MemoryRouter>
        <HomeEvidencePanel
          {...props}
          evidence={[recordedEvidence]}
          evidenceError={false}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('开始学习')).toBeTruthy();
    expect(screen.getByText('array-basics')).toBeTruthy();
    expect(screen.queryByText('尚无学习记录')).toBeNull();
  });

  it('shows the zero state only after a successful empty response', () => {
    render(
      <MemoryRouter>
        <HomeEvidencePanel
          evidence={[]}
          evidenceLoading={false}
          evidenceError={false}
          onRetryEvidence={vi.fn()}
          diagnosis={null}
          sessions={[]}
          sessionsLoading={false}
          sessionsError={null}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('尚无学习记录')).toBeTruthy();
  });
});
