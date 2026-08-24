import { describe, expect, it } from 'vitest';
import { resolveDevIntegrations } from './devIntegrations';

describe('resolveDevIntegrations', () => {
  it('disables optional integrations by default', () => {
    expect(resolveDevIntegrations({})).toEqual({
      designMode: false,
      monitorUrl: null,
    });
  });

  it('enables design mode only for an explicit true value', () => {
    expect(
      resolveDevIntegrations({ XAGI_DESIGN_MODE: 'true' }).designMode,
    ).toBe(true);
    expect(
      resolveDevIntegrations({ XAGI_DESIGN_MODE: '1' }).designMode,
    ).toBe(false);
    expect(
      resolveDevIntegrations({ XAGI_DESIGN_MODE: 'TRUE' }).designMode,
    ).toBe(false);
  });

  it('accepts only absolute http or https monitor URLs', () => {
    expect(
      resolveDevIntegrations({
        XAGI_DEV_MONITOR_URL: 'https://monitor.example/sdk.js',
      })
        .monitorUrl,
    ).toBe('https://monitor.example/sdk.js');
    expect(
      resolveDevIntegrations({ XAGI_DEV_MONITOR_URL: '/sdk/dev-monitor.js' })
        .monitorUrl,
    ).toBeNull();
    expect(
      resolveDevIntegrations({
        XAGI_DEV_MONITOR_URL: 'javascript:alert(1)',
      }).monitorUrl,
    ).toBeNull();
  });
});
