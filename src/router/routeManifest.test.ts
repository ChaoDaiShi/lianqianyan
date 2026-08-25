import { describe, expect, it } from 'vitest';
import { lazyRoutes } from './routeManifest';

const EXPECTED_PATHS = [
  '/',
  '/showcase',
  '/demo',
  '/xiaolian',
  '/my-learning',
  '/space',
  '/reflection',
  '/knowledge',
  '/diagnosis',
  '/exams',
  '/resources',
  '/archive',
  '/settings',
  '/about',
  '/about/capabilities',
  '*',
] as const;

function currentPaths(): readonly string[] {
  return ['/', ...lazyRoutes.map((route) => route.path ?? '')];
}

describe('route manifest', () => {
  it('keeps every public hash route', () => {
    expect(currentPaths()).toEqual(EXPECTED_PATHS);
  });

  it('contains every route exactly once', () => {
    const paths = currentPaths();
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('loads every non-home page through a lazy route', () => {
    expect(lazyRoutes).toHaveLength(EXPECTED_PATHS.length - 1);
    expect(lazyRoutes.every((route) => typeof route.lazy === 'function')).toBe(
      true,
    );
  });
});
