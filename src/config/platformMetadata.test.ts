import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('platform import metadata', () => {
  it('declares the production authenticated agent and bundled icon', () => {
    const config = JSON.parse(readFileSync('cpage_config.json', 'utf8')) as {
      icon: string;
      needLogin: boolean;
      description: string;
    };

    expect(config.needLogin).toBe(true);
    expect(config.icon).toBe('/brand/cyrene-icon.jpeg');
    expect(config.description).toContain('小涟学姐');
  });
});
