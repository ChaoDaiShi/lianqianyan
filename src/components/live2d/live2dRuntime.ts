export const LIVE2D_MODEL_URL =
  '/local-live2d/Cyrene1002/Cyrene.model3.json';
export const CUBISM_CORE_URL =
  '/local-live2d/core/live2dcubismcore.min.js';

interface Live2dWindow extends Window {
  Live2DCubismCore?: unknown;
}

export interface Live2dLayout {
  scale: number;
  x: number;
  y: number;
}

let corePromise: Promise<void> | null = null;
let runtimePromise:
  | Promise<typeof import('pixi-live2d-display/cubism4')>
  | null = null;

export function live2dModelUrl(): string {
  return LIVE2D_MODEL_URL;
}

export function fitLive2dModel(
  containerWidth: number,
  containerHeight: number,
  modelWidth: number,
  modelHeight: number,
): Live2dLayout | null {
  const dimensions = [
    containerWidth,
    containerHeight,
    modelWidth,
    modelHeight,
  ];
  if (dimensions.some((value) => !Number.isFinite(value) || value <= 0)) {
    return null;
  }

  return {
    scale: Math.min(
      (containerWidth * 0.92) / modelWidth,
      (containerHeight * 0.98) / modelHeight,
    ),
    x: containerWidth / 2,
    y: containerHeight,
  };
}

function loadCubismCore(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(
      new Error('Cubism Core can only be loaded in a browser.'),
    );
  }

  const browserWindow = window as Live2dWindow;
  if (browserWindow.Live2DCubismCore) return Promise.resolve();
  if (corePromise) return corePromise;

  corePromise = new Promise<void>((resolve, reject) => {
    const selector = 'script[data-cubism-core="true"]';
    const existing = document.querySelector<HTMLScriptElement>(selector);
    const script = existing ?? document.createElement('script');

    const cleanup = () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };
    const handleLoad = () => {
      cleanup();
      if (browserWindow.Live2DCubismCore) {
        resolve();
      } else {
        script.remove();
        reject(new Error('Cubism Core loaded without exposing its runtime.'));
      }
    };
    const handleError = () => {
      cleanup();
      script.remove();
      reject(new Error('Cubism Core could not be loaded.'));
    };

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    if (!existing) {
      script.src = CUBISM_CORE_URL;
      script.async = true;
      script.dataset.cubismCore = 'true';
      document.head.appendChild(script);
    }
  }).catch((error: unknown) => {
    corePromise = null;
    throw error;
  });

  return corePromise;
}

export async function loadLive2dRuntime(): Promise<
  typeof import('pixi-live2d-display/cubism4')
> {
  await loadCubismCore();
  runtimePromise ??= import('pixi-live2d-display/cubism4');
  return runtimePromise;
}
