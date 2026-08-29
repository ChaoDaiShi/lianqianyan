import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('application icon', () => {
  it('uses the deployed Cyrene JPEG instead of a source-only favicon path', () => {
    const html = readFileSync('index.html', 'utf8');

    expect(html).toContain('href="/brand/cyrene-icon.jpeg"');
    expect(html).toContain('type="image/jpeg"');
    expect(html).not.toContain('/src/assets/educationmind-favicon.svg');
  });

  it('ships the supplied learning-space background asset', () => {
    const asset = resolve(process.cwd(), 'public/brand/learning-space-background.png');

    expect(existsSync(asset)).toBe(true);
    expect(statSync(asset).size).toBeGreaterThan(1000);
  });
});
