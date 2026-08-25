import { describe, expect, it } from 'vitest';

async function loadResolver(): Promise<(id: string) => string | undefined> {
  const modulePath = './buildChunks';
  const module = await import(/* @vite-ignore */ modulePath);
  return module.resolveManualChunk;
}

describe('resolveManualChunk', () => {
  it('is available as the production vendor chunk policy', async () => {
    await expect(loadResolver()).resolves.toBeTypeOf('function');
  });

  it('groups heavyweight runtime dependencies by responsibility', async () => {
    const resolve = await loadResolver();
    expect(resolve('/node_modules/react-dom/client.js')).toBe('vendor-react');
    expect(resolve('/node_modules/react-router/dist/index.js')).toBe(
      'vendor-react',
    );
    expect(resolve('/node_modules/framer-motion/dist/index.js')).toBe(
      'vendor-motion',
    );
    expect(resolve('/node_modules/axios/index.js')).toBe('vendor-http');
    expect(resolve('/node_modules/lucide-react/dist/index.js')).toBe(
      'vendor-icons',
    );
    expect(resolve('/node_modules/zustand/index.js')).toBe('vendor-state');
    expect(resolve('/node_modules/pixi.js/lib/index.js')).toBe('vendor-pixi');
    expect(resolve('/node_modules/@pixi/core/lib/index.js')).toBe(
      'vendor-pixi',
    );
    expect(
      resolve('/node_modules/pixi-live2d-display/dist/cubism4.es.js'),
    ).toBe('vendor-live2d');
    expect(resolve('/src/pages/Home.tsx')).toBeUndefined();
  });
});
