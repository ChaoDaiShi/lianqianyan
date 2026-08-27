import { getRuntimeConfig, isValidContextId, type RuntimeConfig } from './runtime';

export const AUTH_LEARNER_STORAGE_KEY = 'educationmind.auth-learner-id.v1';
export const AUTH_COURSE_STORAGE_KEY = 'educationmind.auth-course-id.v1';
const LEGACY_ANONYMOUS_STORAGE_KEY = 'educationmind.anonymous-learner-id.v1';

export interface LearnerContext {
  learnerId: string;
  courseId: string;
  source: 'account' | 'signed-out';
}

interface LearnerContextInput {
  runtime: RuntimeConfig;
  storage: Storage | null;
}

export function resolveLearnerContext({ storage }: LearnerContextInput): LearnerContext {
  if (storage) {
    try {
      const learnerId = storage.getItem(AUTH_LEARNER_STORAGE_KEY);
      const courseId = storage.getItem(AUTH_COURSE_STORAGE_KEY);
      if (
        isValidContextId(learnerId) &&
        learnerId !== 'signed-out' &&
        !learnerId.startsWith('anon:') &&
        isValidContextId(courseId) &&
        courseId !== 'course-unselected'
      ) {
        return { learnerId, courseId, source: 'account' };
      }
    } catch {
      // Blocked storage means no authenticated learning context is available.
    }
  }
  return {
    learnerId: 'signed-out',
    courseId: 'course-unselected',
    source: 'signed-out',
  };
}

export function storeAuthenticatedContext(
  storage: Storage,
  learnerId: string,
  courseId: string,
): void {
  if (!isValidContextId(learnerId) || learnerId.startsWith('anon:')) {
    throw new Error('invalid authenticated learner id');
  }
  if (!isValidContextId(courseId) || courseId === 'course-unselected') {
    throw new Error('invalid selected course id');
  }
  storage.removeItem(LEGACY_ANONYMOUS_STORAGE_KEY);
  storage.setItem(AUTH_LEARNER_STORAGE_KEY, learnerId);
  storage.setItem(AUTH_COURSE_STORAGE_KEY, courseId);
}

export function clearAuthenticatedContext(storage: Storage): void {
  storage.removeItem(AUTH_LEARNER_STORAGE_KEY);
  storage.removeItem(AUTH_COURSE_STORAGE_KEY);
  storage.removeItem(LEGACY_ANONYMOUS_STORAGE_KEY);
}

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage; } catch { return null; }
}

export const ACTIVE_LEARNER_CONTEXT = resolveLearnerContext({
  runtime: getRuntimeConfig(),
  storage: browserStorage(),
});

export const ACTIVE_LEARNER_ID = ACTIVE_LEARNER_CONTEXT.learnerId;
export const ACTIVE_COURSE_ID = ACTIVE_LEARNER_CONTEXT.courseId;
