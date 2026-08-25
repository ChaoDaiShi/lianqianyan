import {
  getRuntimeConfig,
  isValidContextId,
  type RuntimeConfig,
} from './runtime';

export const ANONYMOUS_LEARNER_STORAGE_KEY =
  'educationmind.anonymous-learner-id.v1';

export interface LearnerContext {
  learnerId: string;
  courseId: string;
  source: 'host' | 'browser';
}

interface LearnerContextInput {
  runtime: RuntimeConfig;
  storage: Storage | null;
  randomUUID: () => string;
}

function createAnonymousLearnerId(randomUUID: () => string): string {
  return `anon:${randomUUID()}`;
}

export function resolveLearnerContext({
  runtime,
  storage,
  randomUUID,
}: LearnerContextInput): LearnerContext {
  if (runtime.hostLearnerId) {
    return {
      learnerId: runtime.hostLearnerId,
      courseId: runtime.courseId,
      source: 'host',
    };
  }

  if (storage) {
    try {
      const stored = storage.getItem(ANONYMOUS_LEARNER_STORAGE_KEY);
      if (isValidContextId(stored) && stored.startsWith('anon:')) {
        return {
          learnerId: stored,
          courseId: runtime.courseId,
          source: 'browser',
        };
      }
    } catch {
      // Privacy modes can block storage. The process-local fallback below remains stable.
    }
  }

  const learnerId = createAnonymousLearnerId(randomUUID);

  if (storage) {
    try {
      storage.setItem(ANONYMOUS_LEARNER_STORAGE_KEY, learnerId);
    } catch {
      // The in-memory identifier remains valid for this page lifetime.
    }
  }

  return { learnerId, courseId: runtime.courseId, source: 'browser' };
}

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function randomUUID(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  const values = new Uint32Array(4);
  globalThis.crypto.getRandomValues(values);
  return [...values].map((value) => value.toString(16).padStart(8, '0')).join('-');
}

export const ACTIVE_LEARNER_CONTEXT = resolveLearnerContext({
  runtime: getRuntimeConfig(),
  storage: browserStorage(),
  randomUUID,
});

export const ACTIVE_LEARNER_ID = ACTIVE_LEARNER_CONTEXT.learnerId;
export const ACTIVE_COURSE_ID = ACTIVE_LEARNER_CONTEXT.courseId;
