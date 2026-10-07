const PUBLIC_PATH_SEGMENT = /^[A-Za-z0-9._~-]+$/;

function hasUnsafePublicPathCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return (
      character === '?' ||
      character === '#' ||
      character === '\\' ||
      codePoint <= 0x1f ||
      codePoint === 0x7f
    );
  });
}

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
    hasUnsafePublicPathCharacter(trimmed)
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

export function resolvePublicAssetPath(
  assetPath: string,
  basePath: unknown,
): string {
  const relativePath = assetPath.replace(/^\/+/, '');
  const segments = relativePath.split('/');
  if (
    !relativePath ||
    hasUnsafePublicPathCharacter(relativePath) ||
    segments.some(
      (segment) =>
        segment === '.' ||
        segment === '..' ||
        !PUBLIC_PATH_SEGMENT.test(segment),
    )
  ) {
    throw new Error(`Unsafe public asset path: ${assetPath}`);
  }

  return `${resolvePublicBasePath(basePath)}${relativePath}`;
}
