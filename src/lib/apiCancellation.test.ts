import type { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { shouldReportApiError } from './api';

describe('shouldReportApiError', () => {
  it('does not report expected Axios cancellation during unmount or navigation', () => {
    expect(
      shouldReportApiError({ code: 'ERR_CANCELED' } as AxiosError),
    ).toBe(false);
  });

  it('still reports real request failures', () => {
    expect(shouldReportApiError({ code: 'ECONNABORTED' } as AxiosError)).toBe(
      true,
    );
  });
});
