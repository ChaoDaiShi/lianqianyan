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
    const asset = resolve('public/brand/learning-space-background.png');

    expect(existsSync(asset)).toBe(true);
    expect(statSync(asset).size).toBeGreaterThan(1000);
  });

  it('preloads the Live2D runtime and optimized model payload', () => {
    const html = readFileSync('index.html', 'utf8');

    expect(html).toContain(
      'href="%BASE_URL%local-live2d/core/live2dcubismcore.min.js"',
    );
    expect(html).toContain(
      'href="%BASE_URL%local-live2d/Cyrene1002/Cyrene.moc3"',
    );
    expect(html).toContain(
      'href="%BASE_URL%local-live2d/Cyrene1002/Cyrene.1024/texture_00.png"',
    );
    expect(html).toContain(
      'href="%BASE_URL%local-live2d/Cyrene1002/Cyrene.1024/texture_01.png"',
    );
  });
});
