export interface DevIntegrations {
  designMode: boolean;
  monitorUrl: string | null;
}

function resolveHttpUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function resolveDevIntegrations(
  env: Record<string, string | undefined>,
): DevIntegrations {
  return {
    designMode: env['XAGI_DESIGN_MODE'] === 'true',
    monitorUrl: resolveHttpUrl(env['XAGI_DEV_MONITOR_URL']),
  };
}
