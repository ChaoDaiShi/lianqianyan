import { describe, expect, it } from 'vitest';
import { resolvePublicBasePath } from './deployment';

describe('resolvePublicBasePath', () => {
  it.each([undefined, null, '', '   ', '/'])(
    'uses the root path for %j',
    (value) => {
      expect(resolvePublicBasePath(value)).toBe('/');
    },
  );

  it.each([
    ['lianqianyan', '/lianqianyan/'],
    ['/lianqianyan', '/lianqianyan/'],
    ['/lianqianyan/', '/lianqianyan/'],
    ['/lianqianyan///', '/lianqianyan/'],
    ['apps//lianqianyan', '/apps/lianqianyan/'],
  ])('normalizes %s to %s', (value, expected) => {
    expect(resolvePublicBasePath(value)).toBe(expected);
  });

  it.each([
    '//attacker.example/app',
    'https://attacker.example/app',
    '/lianqianyan?mode=debug',
    '/lianqianyan#debug',
    '/lianqianyan\\assets',
    '/lianqianyan/../admin',
    '/lian qian yan',
    '/lianqianyan\u0000',
  ])('rejects unsafe public base path %j', (value) => {
    expect(resolvePublicBasePath(value)).toBe('/');
  });
});
