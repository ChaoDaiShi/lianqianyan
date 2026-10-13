import { describe, expect, it } from 'vitest';
import { formatApiTime } from './apiTime';

describe('API event time', () => {
  it('displays the documented naive UTC API time and browser ISO time as the same Shanghai instant', () => {
    const options = { timeZone: 'Asia/Shanghai', hour12: false };
    const expected = new Date('2026-10-13T16:53:44Z').toLocaleString('zh-CN', options);
    expect(formatApiTime('2026-10-13T16:53:44', options)).toBe(expected);
    expect(formatApiTime('2026-10-13T16:53:44Z', options)).toBe(expected);
    expect(expected).toContain('2026/10/14');
    expect(expected).toContain('00:53:44');
  });
});
