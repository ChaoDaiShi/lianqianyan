const PUBLIC_PATH_SEGMENT = /^[A-Za-z0-9._~-]+$/;
const UNSAFE_PUBLIC_PATH_CHARACTER = /[?#\\\u0000-\u001f\u007f]/;

/**
 * Normalize a Vite public base while rejecting values that can escape a
 * same-origin path deployment.
 */
export function resolvePublicBasePath(value: unknown): string {
  if (typeof value !== 'string') return '/';

  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') return '/';
  if (
    trimmed.startsWith('//') ||
    UNSAFE_PUBLIC_PATH_CHARACTER.test(trimmed)
  ) {
    return '/';
  }

  const segments = trimmed.split('/').filter(Boolean);
  if (
    segments.length === 0 ||
    segments.some(
      (segment) =>
        segment === '.' ||
        segment === '..' ||
        !PUBLIC_PATH_SEGMENT.test(segment),
    )
  ) {
    return '/';
  }

  return `/${segments.join('/')}/`;
}
