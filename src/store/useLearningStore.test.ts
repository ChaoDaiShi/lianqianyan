import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startLearning } from '@/lib/educationApi';
import { useLearningStore } from './useLearningStore';

vi.mock('@/config/learnerContext', () => ({
  ACTIVE_LEARNER_ID: 'anon:test-learner',
  ACTIVE_COURSE_ID: 'course-os',
}));

vi.mock('@/lib/educationApi', () => ({
  startLearning: vi.fn(),
}));

const result = {
  message: 'ok',
  sessionId: 'session-1',
  evidence: {
    id: 'evidence-1',
    learnerId: 'anon:test-learner',
    evidenceType: 'learning_started' as const,
    source: 'recommended_path' as const,
    payload: {},
    occurredAt: '2026-08-25T00:00:00Z',
  },
};

describe('useLearningStore', () => {
  beforeEach(() => {
    vi.mocked(startLearning).mockReset();
    vi.mocked(startLearning).mockResolvedValue(result);
    useLearningStore.setState({
      starting: false,
      lastResult: null,
      error: null,
    });
  });

  it('records learning under the active anonymous learner', async () => {
    await useLearningStore.getState().start({
      source: 'recommended_path',
      courseId: 'course-os',
      knowledgePointId: 'kp-pv',
    });

    expect(startLearning).toHaveBeenCalledWith({
      learnerId: 'anon:test-learner',
      source: 'recommended_path',
      courseId: 'course-os',
      knowledgePointId: 'kp-pv',
    });
  });
});
