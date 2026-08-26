import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('application icon', () => {
  it('uses the deployed Cyrene JPEG instead of a source-only favicon path', () => {
    const html = readFileSync('index.html', 'utf8');

    expect(html).toContain('href="/brand/cyrene-icon.jpeg"');
    expect(html).toContain('type="image/jpeg"');
    expect(html).not.toContain('/src/assets/educationmind-favicon.svg');
  });
});
