import { describe, expect, it } from 'vitest';
import * as educationApi from './educationApi';

function accepts(status: number): boolean {
  const candidate = (educationApi as Record<string, unknown>)[
    'isCurrentPlanResponseStatus'
  ];
  return typeof candidate === 'function'
    ? (candidate as (value: number) => boolean)(status)
    : false;
}

describe('isCurrentPlanResponseStatus', () => {
  it.each([200, 204, 299, 404])('accepts the handled status %s', (status) => {
    expect(accepts(status)).toBe(true);
  });

  it.each([0, 199, 300, 400, 401, 500])(
    'rejects the unhandled status %s',
    (status) => {
      expect(accepts(status)).toBe(false);
    },
  );
});
