import { useEffect, useRef, useState } from 'react';
import { resolvePublicAssetPath } from '@/config/deployment';
import { cn } from '@/lib/utils';
import {
  fitLive2dModel,
  live2dModelUrl,
  loadLive2dRuntime,
  registerLive2dTicker,
  type Live2dFraming,
} from './live2dRuntime';

type PixiApplication = import('pixi.js').Application;
type LiveModel = import('pixi-live2d-display/cubism4').Live2DModel;

interface MouthCoreModel {
  getParameterIndex(parameterId: string): number;
  setParameterValueById(
    parameterId: string,
    value: number,
    weight?: number,
  ): void;
}

export interface Live2DCharacterProps {
  stateLabel: string;
  characterState: string;
  speaking?: boolean;
  priority?: boolean;
  framing?: Live2dFraming;
  className?: string;
}

type Availability = 'loading' | 'ready' | 'unavailable';

const FALLBACK_IMAGE_URL = resolvePublicAssetPath(
  'brand/cyrene-icon.jpeg',
  import.meta.env.BASE_URL,
);

function setMouthOpen(model: LiveModel | null, value: number): void {
  if (!model?.internalModel) return;
  const coreModel = model.internalModel.coreModel as MouthCoreModel;
  if (
    typeof coreModel.getParameterIndex !== 'function' ||
    typeof coreModel.setParameterValueById !== 'function' ||
    coreModel.getParameterIndex('ParamMouthOpenY') < 0
  ) {
    return;
  }
  coreModel.setParameterValueById('ParamMouthOpenY', value);
}

export function Live2DCharacter({
  stateLabel,
  characterState,
  speaking = false,
  priority = false,
  framing = 'full',
  className,
}: Live2DCharacterProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const modelRef = useRef<LiveModel | null>(null);
  const speakingRef = useRef(speaking);
  const [availability, setAvailability] = useState<Availability>('loading');

  useEffect(() => {
    speakingRef.current = speaking;
    if (!speaking) setMouthOpen(modelRef.current, 0);
  }, [speaking]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let application: PixiApplication | null = null;
    let model: LiveModel | null = null;
    let observer: ResizeObserver | null = null;
    let animationFrame = 0;
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const destroyResources = () => {
      window.cancelAnimationFrame(animationFrame);
      observer?.disconnect();
      container.removeEventListener('pointermove', handlePointerMove);
      setMouthOpen(model, 0);
      modelRef.current = null;
      if (application && model) {
        if (model.parent === application.stage) {
          application.stage.removeChild(model);
        }
        model.destroy({ children: true, texture: false, baseTexture: false });
      }
      application?.destroy(true, {
        children: true,
        texture: false,
        baseTexture: false,
      });
      observer = null;
      model = null;
      application = null;
    };

    const resize = () => {
      if (!application || !model) return;
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      application.renderer.resize(width, height);
      const layout = fitLive2dModel(
        width,
        height,
        model.internalModel.originalWidth,
        model.internalModel.originalHeight,
        framing,
      );
      if (!layout) return;
      model.scale.set(layout.scale);
      model.position.set(layout.x, layout.y);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!model) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      model.focus(x, y);
    };

    const animateMouth = (timestamp: number) => {
      if (speakingRef.current) {
        const speed = reducedMotion ? 0.006 : 0.012;
        const amplitude = reducedMotion ? 0.34 : 0.58;
        const value = 0.18 + ((Math.sin(timestamp * speed) + 1) / 2) * amplitude;
        setMouthOpen(model, value);
      }
      animationFrame = window.requestAnimationFrame(animateMouth);
    };

    const setup = async () => {
      try {
        const [{ Application, Ticker }, { Live2DModel }] = await Promise.all([
          import('pixi.js'),
          loadLive2dRuntime(),
        ]);
        if (cancelled) return;
        registerLive2dTicker(Live2DModel, Ticker);

        const pixelRatio = Math.min(
          window.devicePixelRatio || 1,
          priority ? 2 : 1.5,
        );
        application = new Application({
          width: Math.max(1, container.clientWidth),
          height: Math.max(1, container.clientHeight),
          antialias: true,
          autoDensity: true,
          backgroundAlpha: 0,
          resolution: pixelRatio,
        });
        const canvas = application.view as HTMLCanvasElement;
        canvas.className = 'absolute inset-0 h-full w-full';
        canvas.setAttribute('aria-hidden', 'true');
        container.appendChild(canvas);

        model = await Live2DModel.from(live2dModelUrl(), {
          autoInteract: false,
        });
        if (cancelled) {
          destroyResources();
          return;
        }

        modelRef.current = model;
        model.anchor.set(0.5, 1);
        application.stage.addChild(model);
        resize();
        observer = new ResizeObserver(resize);
        observer.observe(container);
        container.addEventListener('pointermove', handlePointerMove, {
          passive: true,
        });
        animationFrame = window.requestAnimationFrame(animateMouth);
        setAvailability('ready');
      } catch (error) {
        if (!cancelled) {
          destroyResources();
          setAvailability('unavailable');
          console.warn(
            'Live2D model is unavailable; install the licensed assets locally to enable it.',
            error,
          );
        }
      }
    };

    void setup();

    return () => {
      cancelled = true;
      destroyResources();
    };
  }, [framing, priority]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={stateLabel}
      data-live2d-character="true"
      data-character-state={characterState}
      data-live2d-status={availability}
      data-live2d-speaking={speaking}
      data-live2d-framing={framing}
      className={cn(
        'relative h-full w-full overflow-hidden',
        availability === 'loading' &&
          'animate-pulse rounded-[42%] bg-gradient-to-b from-violet-100/40 to-sky-100/20',
        className,
      )}
    >
      <img
        src={FALLBACK_IMAGE_URL}
        alt=""
        draggable={false}
        data-live2d-fallback="true"
        className={cn(
          'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
          availability === 'ready' ? 'opacity-0' : 'opacity-100',
        )}
      />
    </div>
  );
}
