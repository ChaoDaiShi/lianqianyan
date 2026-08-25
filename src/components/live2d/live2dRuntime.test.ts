import { describe, expect, it, vi } from 'vitest';
import {
  CUBISM_CORE_URL,
  fitLive2dModel,
  live2dModelUrl,
  registerLive2dTicker,
} from './live2dRuntime';

describe('Live2D runtime geometry and asset contract', () => {
  it('uses only the development-local model and Core endpoints', () => {
    expect(live2dModelUrl()).toBe(
      '/local-live2d/Cyrene1002/Cyrene.model3.json',
    );
    expect(CUBISM_CORE_URL).toBe(
      '/local-live2d/core/live2dcubismcore.min.js',
    );
  });

  it('contain-fits the supplied 3600 by 5200 model at the bottom center', () => {
    const layout = fitLive2dModel(360, 460, 3600, 5200);

    expect(layout).not.toBeNull();
    expect(layout).toMatchObject({ x: 180, y: 460 });
    expect(layout?.scale).toBeGreaterThan(0);
    expect((layout?.scale ?? 0) * 3600).toBeLessThanOrEqual(360 * 0.92);
    expect((layout?.scale ?? 0) * 5200).toBeLessThanOrEqual(460 * 0.98);
  });

  it.each([
    [0, 460, 3600, 5200],
    [360, -1, 3600, 5200],
    [360, 460, 0, 5200],
    [360, 460, 3600, Number.NaN],
  ])('rejects invalid dimensions %#', (width, height, modelWidth, modelHeight) => {
    expect(fitLive2dModel(width, height, modelWidth, modelHeight)).toBeNull();
  });

  it('registers the Pixi ticker before a model is created', () => {
    const registerTicker = vi.fn();
    const ticker = { shared: {} };

    registerLive2dTicker({ registerTicker }, ticker);

    expect(registerTicker).toHaveBeenCalledOnce();
    expect(registerTicker).toHaveBeenCalledWith(ticker);
  });
});
