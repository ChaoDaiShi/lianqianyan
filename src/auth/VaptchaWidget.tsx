import { forwardRef, useEffect, useId, useImperativeHandle, useRef } from 'react';

declare global {
  interface Window {
    vaptcha?: (options: Record<string, unknown>) => Promise<VaptchaInstance>;
  }
}

export interface VaptchaInstance {
  render(param?: string | HTMLElement | Record<string, unknown>): void;
  listen(event: string, callback: (...args: unknown[]) => void): void;
  getToken(): string;
  refresh?(): void;
  destroy?(): void;
}

const SCRIPT_ID = 'educationmind-vaptcha-script';

export interface VaptchaWidgetHandle {
  refresh(): void;
}

function loadScript(): Promise<void> {
  if (window.vaptcha) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Vaptcha failed to load')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://v.vaptcha.com/v3.js';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Vaptcha failed to load'));
    document.head.appendChild(script);
  });
}

interface VaptchaWidgetProps {
  vid: string;
  theme: 'light' | 'dark';
  /** 父组件用 generation 变化触发重建（reset）。 */
  generation: number;
  onToken(token: string | null): void;
  onUnavailable(): void;
}

export const VaptchaWidget = forwardRef<VaptchaWidgetHandle, VaptchaWidgetProps>(function VaptchaWidget({
  vid,
  theme,
  generation,
  onToken,
  onUnavailable,
}, ref) {
  const reactId = useId();
  const containerId = `vaptcha-${reactId.replace(/:/g, '')}`;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<VaptchaInstance | null>(null);

  useImperativeHandle(ref, () => ({
    refresh: () => {
      onToken(null);
      instanceRef.current?.refresh?.();
    },
  }), [onToken]);

  useEffect(() => {
    let disposed = false;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';
    void loadScript()
      .then(async () => {
        if (disposed || !window.vaptcha) return;
        const instance = await window.vaptcha({
          vid,
          type: 'embed',
          scene: 0,
          container: `#${containerId}`,
          color: theme === 'dark' ? '#b9adff' : '#8b7cf6',
        });
        if (disposed) {
          instance.destroy?.();
          return;
        }
        instanceRef.current = instance;
        instance.listen('pass', () => {
          const token = instance.getToken();
          onToken(token || null);
        });
      })
      .catch(() => {
        if (!disposed) onUnavailable();
      });
    return () => {
      disposed = true;
      instanceRef.current?.destroy?.();
      instanceRef.current = null;
    };
  }, [vid, theme, generation, onToken, onUnavailable]);

  return <div ref={containerRef} id={containerId} className="min-h-[66px]" aria-label="Vaptcha 人机验证" />;
});
