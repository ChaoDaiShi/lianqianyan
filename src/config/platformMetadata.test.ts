import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('platform import metadata', () => {
  it('declares the production no-login agent and bundled icon', () => {
    const config = JSON.parse(readFileSync('cpage_config.json', 'utf8')) as {
      icon: string;
      needLogin: boolean;
      description: string;
    };

    expect(config.needLogin).toBe(false);
    expect(config.icon).toBe('/brand/cyrene-icon.jpeg');
    expect(config.description).toContain('AI 教官');
  });
});
