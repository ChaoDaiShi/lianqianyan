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

  it.each([502, 503])(
    'does not report handled voice fallback status %s as an unhandled API error',
    (status) => {
      expect(
        shouldReportApiError({
          config: { url: '/api/voice/synthesize' },
          response: { status },
        } as AxiosError),
      ).toBe(false);
    },
  );

  it('still reports the same server error for unrelated API requests', () => {
    expect(
      shouldReportApiError({
        config: { url: '/api/exams/attempts' },
        response: { status: 502 },
      } as AxiosError),
    ).toBe(true);
  });
});
