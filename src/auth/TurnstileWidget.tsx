import { forwardRef, useEffect, useId, useImperativeHandle, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render(container: string | HTMLElement, options: Record<string, unknown>): string;
      remove(widgetId: string): void;
      reset(widgetId: string): void;
    };
  }
}

const SCRIPT_ID = 'educationmind-turnstile-script';

export interface TurnstileWidgetHandle {
  reset(): void;
}

export function resetTurnstileWidget(
  turnstile: Pick<NonNullable<Window['turnstile']>, 'reset'> | undefined,
  widgetId: string | null,
  onToken: (token: string | null) => void,
): void {
  onToken(null);
  if (turnstile && widgetId) turnstile.reset(widgetId);
}

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Turnstile failed to load')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Turnstile failed to load'));
    document.head.appendChild(script);
  });
}

interface TurnstileWidgetProps {
  siteKey: string;
  theme: 'light' | 'dark';
  onToken(token: string | null): void;
  /** 脚本加载失败（Cloudflare 不可达）时回调，供上层切换兜底验证。 */
  onUnavailable?(): void;
}

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(function TurnstileWidget({
  siteKey,
  theme,
  onToken,
  onUnavailable,
}, ref) {
  const reactId = useId();
  const containerId = `turnstile-${reactId.replace(/:/g, '')}`;
  const widgetRef = useRef<string | null>(null);

  useImperativeHandle(ref, () => ({
    reset: () => resetTurnstileWidget(window.turnstile, widgetRef.current, onToken),
  }), [onToken]);

  useEffect(() => {
    let disposed = false;
    void loadScript().then(() => {
      if (disposed || !window.turnstile) return;
      widgetRef.current = window.turnstile.render(`#${containerId}`, {
        sitekey: siteKey,
        theme,
        size: 'flexible',
        callback: (token: string) => onToken(token),
        'expired-callback': () => onToken(null),
        'error-callback': () => onUnavailable?.(),
      });
    }).catch(() => {
      onToken(null);
      onUnavailable?.();
    });
    return () => {
      disposed = true;
      if (widgetRef.current && window.turnstile) window.turnstile.remove(widgetRef.current);
      widgetRef.current = null;
    };
  }, [containerId, onToken, onUnavailable, siteKey, theme]);

  return <div id={containerId} className="min-h-[65px]" aria-label="人机验证" />;
});
