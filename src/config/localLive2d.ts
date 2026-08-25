export const LOCAL_LIVE2D_PREFIX = '/local-live2d/';

/**
 * Convert an HTTP URL under the development-only Live2D mount into a safe,
 * relative asset path. The caller still resolves the result against the
 * configured local root and performs an absolute-path containment check.
 */
export function relativeLocalLive2dPath(rawUrl: string): string | null {
  let pathname: string;
  try {
    pathname = decodeURIComponent(rawUrl.split('?', 1)[0]).replace(/\\/g, '/');
  } catch {
    return null;
  }

  if (!pathname.startsWith(LOCAL_LIVE2D_PREFIX)) return null;

  const parts = pathname.slice(LOCAL_LIVE2D_PREFIX.length).split('/');
  if (
    parts.length === 0 ||
    parts.some((part) => !part || part === '.' || part === '..')
  ) {
    return null;
  }

  return parts.join('/');
}
