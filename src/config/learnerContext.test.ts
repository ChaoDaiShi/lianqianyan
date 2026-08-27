import { describe, expect, it } from 'vitest';
import type { RuntimeConfig } from './runtime';
import {
  AUTH_COURSE_STORAGE_KEY,
  AUTH_LEARNER_STORAGE_KEY,
  clearAuthenticatedContext,
  resolveLearnerContext,
  storeAuthenticatedContext,
} from './learnerContext';

function createMemoryStorage(initial?: Record<string, string>): Storage {
  const values = new Map(Object.entries(initial ?? {}));
  return {
    get length() { return values.size; },
    clear() { values.clear(); },
    getItem(key) { return values.get(key) ?? null; },
    key(index) { return [...values.keys()][index] ?? null; },
    removeItem(key) { values.delete(key); },
    setItem(key, value) { values.set(key, value); },
  };
}

const RUNTIME: RuntimeConfig = {
  hostLearnerId: 'platform:user-42',
  courseId: 'course-os',
  apiBaseUrl: '',
};

describe('formal learner context', () => {
  it('does not create or trust an anonymous or host learner before authentication', () => {
    const storage = createMemoryStorage();
    expect(resolveLearnerContext({ runtime: RUNTIME, storage })).toEqual({
      learnerId: 'signed-out',
      courseId: 'course-unselected',
      source: 'signed-out',
    });
    expect(storage.length).toBe(0);
  });

  it('uses only the authenticated account and explicitly selected course', () => {
    const storage = createMemoryStorage({
      [AUTH_LEARNER_STORAGE_KEY]: 'account-123',
      [AUTH_COURSE_STORAGE_KEY]: 'course-os',
    });
    expect(resolveLearnerContext({ runtime: RUNTIME, storage })).toEqual({
      learnerId: 'account-123',
      courseId: 'course-os',
      source: 'account',
    });
  });

  it('keeps learning unavailable until both account and course are present', () => {
    const storage = createMemoryStorage({ [AUTH_LEARNER_STORAGE_KEY]: 'account-123' });
    expect(resolveLearnerContext({ runtime: RUNTIME, storage }).source).toBe('signed-out');
  });

  it('stores and clears the formal context without retaining legacy anonymous data', () => {
    const storage = createMemoryStorage({
      'educationmind.anonymous-learner-id.v1': 'anon:legacy',
    });
    storeAuthenticatedContext(storage, 'account-123', 'course-os');
    expect(storage.getItem(AUTH_LEARNER_STORAGE_KEY)).toBe('account-123');
    expect(storage.getItem(AUTH_COURSE_STORAGE_KEY)).toBe('course-os');
    expect(storage.getItem('educationmind.anonymous-learner-id.v1')).toBeNull();
    clearAuthenticatedContext(storage);
    expect(storage.length).toBe(0);
  });
});
