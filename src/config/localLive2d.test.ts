import { describe, expect, it } from 'vitest';
import { relativeLocalLive2dPath } from './localLive2d';

describe('relativeLocalLive2dPath', () => {
  it('accepts model assets and strips a query string', () => {
    expect(
      relativeLocalLive2dPath(
        '/local-live2d/Cyrene1002/Cyrene.model3.json?v=1',
      ),
    ).toBe('Cyrene1002/Cyrene.model3.json');
  });

  it.each([
    '/api/health',
    '/local-live2d/../secret.txt',
    '/local-live2d/%2e%2e/secret.txt',
    '/local-live2d/Cyrene1002/../../secret.txt',
    '/local-live2d/',
    '/local-live2d/Cyrene1002//texture.png',
    '/local-live2d/Cyrene1002/%E0%A4%A',
  ])('rejects unsafe or unrelated URL %s', (url) => {
    expect(relativeLocalLive2dPath(url)).toBeNull();
  });

  it('normalizes Windows separators before validating path segments', () => {
    expect(
      relativeLocalLive2dPath(
        '/local-live2d/Cyrene1002\\Cyrene.4096\\texture_00.png',
      ),
    ).toBe('Cyrene1002/Cyrene.4096/texture_00.png');
  });
});
