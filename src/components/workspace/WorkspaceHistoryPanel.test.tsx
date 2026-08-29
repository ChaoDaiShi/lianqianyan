// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LearningEvidence, PracticeEvaluationResponse } from '@/lib/educationApi';
import type { PersistedStudyTask } from '@/domain';
import type { ReflectionResult } from '@/components/learning/learningLoop';
import { WorkspaceHistoryPanel } from './WorkspaceHistoryPanel';

const task = {
  id: 'task-1',
  knowledgePointId: 'kp-deadlock',
  knowledgePointName: '死锁',
  actionType: 'learn',
  estimatedMinutes: 15,
  order: 1,
} as unknown as PersistedStudyTask;

function evidence(overrides: Partial<LearningEvidence>): LearningEvidence {
  return {
    id: 'ev-1',
    learnerId: 'learner-1',
    evidenceType: 'learning_started',
    source: 'current_study_plan',
    courseId: 'course-os',
    knowledgePointId: 'kp-deadlock',
    occurredAt: '2026-08-29T10:00:00Z',
    payload: {},
    ...overrides,
  };
}

afterEach(() => cleanup());

describe('WorkspaceHistoryPanel', () => {
  it('renders an honest empty state for chat history instead of fabricating sessions', () => {
    render(
      <WorkspaceHistoryPanel
        tasks={[task]}
        evidence={[]}
        practiceEvaluations={{}}
        reflectionResults={{}}
        loading={false}
        error={false}
        onRetry={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: /对话/ }));
    expect(screen.getByText(/尚未提供可恢复的云端对话历史/)).toBeTruthy();
    expect(screen.queryByText('会话 1')).toBeNull();
  });

  it('turns learning evidence into readable events with expandable details', () => {
    render(
      <WorkspaceHistoryPanel
        tasks={[task]}
        evidence={[
          evidence({
            evidenceType: 'practice_answer_evaluated',
            masteryDelta: 0.06,
            occurredAt: '2026-08-29T11:00:00Z',
          }),
        ]}
        practiceEvaluations={{}}
        reflectionResults={{}}
        loading={false}
        error={false}
        onRetry={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: /练习/ }));
    fireEvent.click(screen.getByText(/完成练习评价/));
    expect(screen.getByText('掌握变化')).toBeTruthy();
    expect(screen.getByText('6%')).toBeTruthy();
    expect(screen.queryByText(/payload/)).toBeNull();
  });

  it('marks reflection records as local session state, not cloud memory', () => {
    const reflection = {
      knowledgePointName: '死锁',
      knowledgePointId: 'kp-deadlock',
      submittedAt: '2026-08-29T12:00:00Z',
      coveredConcepts: ['互斥条件'],
      missingConcepts: ['循环等待'],
      nextSuggestion: '回看循环等待。',
    } as ReflectionResult;
    render(
      <WorkspaceHistoryPanel
        tasks={[task]}
        evidence={[]}
        practiceEvaluations={{}}
        reflectionResults={{ 'task-1': reflection }}
        loading={false}
        error={false}
        onRetry={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: /复述/ }));
    expect(screen.getByText(/本地复述记录/)).toBeTruthy();
    expect(screen.getByText(/刷新后即清空/)).toBeTruthy();
    expect(screen.queryByText(/云端长期记忆记录已保存/)).toBeNull();
  });

  it('shows practice evaluation metrics only when they truly exist', () => {
    const evaluation = {
      evidence: evidence({ evidenceType: 'practice_answer_evaluated' }),
      masteryBefore: 0.46,
      masteryAfter: 0.52,
      confidence: 0.8,
      evidenceCount: 3,
      message: '掌握度上升。',
      replanning: { status: 'performed' },
    } as PracticeEvaluationResponse;
    render(
      <WorkspaceHistoryPanel
        tasks={[task]}
        evidence={[]}
        practiceEvaluations={{ 'task-1': evaluation }}
        reflectionResults={{}}
        loading={false}
        error={false}
        onRetry={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: /练习/ }));
    expect(screen.getByText(/46% → 52%/)).toBeTruthy();
    expect(screen.getByText(/已重新规划/)).toBeTruthy();
  });
});
