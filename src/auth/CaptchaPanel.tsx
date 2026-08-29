import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { CaptchaProvider } from '@/auth/authApi';
import { TurnstileWidget, type TurnstileWidgetHandle } from './TurnstileWidget';
import { VaptchaWidget, type VaptchaWidgetHandle } from './VaptchaWidget';

const TURNSTILE_FALLBACK_TIMEOUT_MS = 8_000;

export interface CaptchaPanelHandle {
  reset(): void;
}

export interface CaptchaPanelProps {
  chain: CaptchaProvider[];
  turnstileSiteKey: string | null;
  vaptchaVid: string | null;
  theme: 'light' | 'dark';
  onCredential(credential: { token: string | null; provider: CaptchaProvider } | null): void;
  /** 从 Turnstile 切到其他 provider 时回调一次，便于展示降级提示。 */
  onFallback?(provider: CaptchaProvider): void;
}

function useActiveProvider(
  chain: CaptchaProvider[],
  turnstileSiteKey: string | null,
  vaptchaVid: string | null,
) {
  const [forced, setForced] = useState<CaptchaProvider | null>(null);
  useEffect(() => {
    setForced(null);
  }, [chain, turnstileSiteKey, vaptchaVid]);
  if (forced) return { provider: forced, setForced };
  const available = chain.filter((provider) =>
    provider === 'turnstile' ? Boolean(turnstileSiteKey) : Boolean(vaptchaVid));
  return { provider: available[0] ?? null, setForced };
}

/**
 * 按部署下发的 provider 链渲染人机验证：默认 Turnstile，
 * 脚本加载失败或超时未出票时自动切到 Vaptcha 兜底。
 */
export const CaptchaPanel = forwardRef<CaptchaPanelHandle, CaptchaPanelProps>(function CaptchaPanel({
  chain,
  turnstileSiteKey,
  vaptchaVid,
  theme,
  onCredential,
  onFallback,
}, ref) {
  const { provider: activeProvider, setForced } = useActiveProvider(chain, turnstileSiteKey, vaptchaVid);
  const [turnstileGeneration, setTurnstileGeneration] = useState(0);
  const [vaptchaGeneration, setVaptchaGeneration] = useState(0);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const vaptchaRef = useRef<VaptchaWidgetHandle>(null);
  const hasCredentialRef = useRef(false);

  const handleCredential = useCallback<CaptchaPanelProps['onCredential']>((credential) => {
    hasCredentialRef.current = credential !== null;
    onCredential(credential);
  }, [onCredential]);

  const switchTo = useCallback((provider: CaptchaProvider) => {
    hasCredentialRef.current = false;
    handleCredential(null);
    setForced(provider);
    onFallback?.(provider);
    if (provider === 'vaptcha') setVaptchaGeneration((current) => current + 1);
    else setTurnstileGeneration((current) => current + 1);
  }, [handleCredential, onFallback, setForced]);

  useEffect(() => {
    if (activeProvider !== 'turnstile') return;
    if (!chain.includes('vaptcha')) return;
    const timer = window.setTimeout(() => {
      // 已拿到 Turnstile 票据时不再兜底切换
      if (!hasCredentialRef.current) switchTo('vaptcha');
    }, TURNSTILE_FALLBACK_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [activeProvider, chain, switchTo, turnstileGeneration]);

  useImperativeHandle(ref, () => ({
    reset: () => {
      handleCredential(null);
      turnstileRef.current?.reset();
      vaptchaRef.current?.refresh();
    },
  }), [handleCredential]);

  const handleTurnstileUnavailable = useCallback(() => {
    if (chain.includes('vaptcha')) switchTo('vaptcha');
  }, [chain, switchTo]);

  if (!activeProvider) {
    return null;
  }

  return (
    <div data-captcha-panel={activeProvider}>
      {activeProvider === 'turnstile' ? (
        <TurnstileWidget
          key={`ts-${turnstileGeneration}`}
          ref={turnstileRef}
          siteKey={turnstileSiteKey ?? ''}
          theme={theme}
          onUnavailable={handleTurnstileUnavailable}
          onToken={(token) => handleCredential(token ? { token, provider: 'turnstile' } : null)}
        />
      ) : (
        <VaptchaWidget
          key={`va-${vaptchaGeneration}`}
          ref={vaptchaRef}
          vid={vaptchaVid ?? ''}
          theme={theme}
          generation={vaptchaGeneration}
          onToken={(token) => handleCredential(token ? { token, provider: 'vaptcha' } : null)}
          onUnavailable={() => handleCredential(null)}
        />
      )}
    </div>
  );
});
