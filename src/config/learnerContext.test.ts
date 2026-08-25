import { describe, expect, it } from 'vitest';
import type { RuntimeConfig } from './runtime';
import {
  ANONYMOUS_LEARNER_STORAGE_KEY,
  resolveLearnerContext,
} from './learnerContext';

const UUID = '018f4d31-f9ef-7b3a-bf89-5a84f4d8a972';

function createMemoryStorage(initial?: Record<string, string>): Storage {
  const values = new Map(Object.entries(initial ?? {}));
  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

const DEFAULT_RUNTIME: RuntimeConfig = {
  hostLearnerId: null,
  courseId: 'course-os',
  apiBaseUrl: '',
};

describe('resolveLearnerContext', () => {
  it('uses the host learner without writing browser storage', () => {
    const storage = createMemoryStorage();
    expect(
      resolveLearnerContext({
        runtime: { ...DEFAULT_RUNTIME, hostLearnerId: 'platform:user-42' },
        storage,
        randomUUID: () => UUID,
      }),
    ).toEqual({
      learnerId: 'platform:user-42',
      courseId: 'course-os',
      source: 'host',
    });
    expect(storage.length).toBe(0);
  });

  it('creates and reuses a browser anonymous learner', () => {
    const storage = createMemoryStorage();
    const first = resolveLearnerContext({
      runtime: DEFAULT_RUNTIME,
      storage,
      randomUUID: () => UUID,
    });
    const second = resolveLearnerContext({
      runtime: DEFAULT_RUNTIME,
      storage,
      randomUUID: () => 'unused',
    });

    expect(first).toEqual({
      learnerId: `anon:${UUID}`,
      courseId: 'course-os',
      source: 'browser',
    });
    expect(second).toEqual(first);
    expect(storage.getItem(ANONYMOUS_LEARNER_STORAGE_KEY)).toBe(
      `anon:${UUID}`,
    );
  });

  it('replaces an invalid stored value with a fresh anonymous learner', () => {
    const storage = createMemoryStorage({
      [ANONYMOUS_LEARNER_STORAGE_KEY]: 'not an id',
    });

    expect(
      resolveLearnerContext({
        runtime: DEFAULT_RUNTIME,
        storage,
        randomUUID: () => UUID,
      }).learnerId,
    ).toBe(`anon:${UUID}`);
  });

  it('keeps a process-local id when storage is unavailable', () => {
    const unavailableStorage = {
      getItem() {
        throw new DOMException('blocked');
      },
      setItem() {
        throw new DOMException('blocked');
      },
    } as unknown as Storage;

    expect(
      resolveLearnerContext({
        runtime: DEFAULT_RUNTIME,
        storage: unavailableStorage,
        randomUUID: () => UUID,
      }),
    ).toMatchObject({ learnerId: `anon:${UUID}`, source: 'browser' });
  });
});
