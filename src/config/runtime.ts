export const DEFAULT_COURSE_ID = 'course-unselected';

export interface HostRuntimeConfig {
  learnerId?: string;
  courseId?: string;
  apiBaseUrl?: string;
}

export interface RuntimeConfig {
  hostLearnerId: string | null;
  courseId: string;
  apiBaseUrl: string;
}

interface RuntimeConfigInput {
  host?: HostRuntimeConfig;
  envApiBaseUrl?: string;
}

const CONTEXT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;

export function isValidContextId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value === value.trim() &&
    CONTEXT_ID_PATTERN.test(value)
  );
}

function normalizeApiBaseUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    const normalized = trimmed.replace(/\/+$/, '');
    return normalized || '';
  }

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (parsed.username || parsed.password) return null;
    return trimmed.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

export function resolveRuntimeConfig({
  host,
  envApiBaseUrl,
}: RuntimeConfigInput): RuntimeConfig {
  const hostLearnerId = host?.learnerId;
  const hostCourseId = host?.courseId;
  return {
    hostLearnerId: isValidContextId(hostLearnerId) ? hostLearnerId : null,
    courseId: isValidContextId(hostCourseId)
      ? hostCourseId
      : DEFAULT_COURSE_ID,
    apiBaseUrl:
      normalizeApiBaseUrl(host?.apiBaseUrl) ??
      normalizeApiBaseUrl(envApiBaseUrl) ??
      '',
  };
}

let cachedRuntimeConfig: RuntimeConfig | null = null;

export function getRuntimeConfig(): RuntimeConfig {
  if (cachedRuntimeConfig) return cachedRuntimeConfig;
  cachedRuntimeConfig = resolveRuntimeConfig({
    host:
      typeof window === 'undefined'
        ? undefined
        : window.__EDUCATIONMIND_CONFIG__,
    envApiBaseUrl: import.meta.env.VITE_EDUCATION_API_URL,
  });
  return cachedRuntimeConfig;
}
