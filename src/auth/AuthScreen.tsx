import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthCompanionScene } from './AuthCompanionScene';
import { fetchPublicRuntimeConfig } from './authApi';
import { TurnstileWidget, type TurnstileWidgetHandle } from './TurnstileWidget';

interface AuthScreenProps {
  onLogin(username: string, password: string, captchaToken?: string | null): Promise<void> | void;
  onRegister(payload: {
    username: string;
    displayName: string;
    password: string;
    captchaToken?: string | null;
  }): Promise<void> | void;
  busy: boolean;
  error: string | null;
}

type AuthMode = 'login' | 'register';

const inputClassName =
  'mt-2 h-12 rounded-xl border-[#E4E1EB] bg-white px-4 text-[#2B2935] shadow-none placeholder:text-[#AAA6B5] focus-visible:border-[#8A7BEA] focus-visible:ring-[#7766E8]/10 focus-visible:ring-offset-0';

export function AuthScreen({ onLogin, onRegister, busy, error }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileWidgetHandle>(null);
  const resolved =
    typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'
      ? 'dark'
      : 'light';

  useEffect(() => {
    void fetchPublicRuntimeConfig()
      .then((config) => setTurnstileSiteKey(config.turnstile_enabled ? config.turnstile_site_key : null))
      .catch(() => setTurnstileSiteKey(null));
  }, []);

  const receiveCaptchaToken = useCallback((token: string | null) => setCaptchaToken(token), []);
  const resetCaptcha = useCallback(() => {
    setCaptchaToken(null);
    captchaRef.current?.reset();
  }, []);

  useEffect(() => {
    if (error) resetCaptcha();
  }, [error, resetCaptcha]);

  const isLogin = mode === 'login';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (turnstileSiteKey && !captchaToken) return;
    if (isLogin) void onLogin(username, password, captchaToken);
    else void onRegister({ username, displayName, password, captchaToken });
  };

  const switchMode = () => {
    setMode(isLogin ? 'register' : 'login');
    resetCaptcha();
  };

  return (
    <main
      data-auth-entry="companion"
      className="relative min-h-screen overflow-hidden bg-[#c8c1f1] px-4 py-4 text-[#292733] sm:px-6 sm:py-6 lg:px-10 lg:py-8"
    >
      <AuthCompanionScene />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1240px] items-center sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(390px,450px)] lg:gap-16 xl:gap-24">
          <section data-auth-brand="true" className="hidden max-w-xl px-4 text-white drop-shadow-[0_3px_24px_rgba(46,35,91,0.2)] lg:block lg:px-8">
            <p className="flex items-center gap-3 text-sm font-semibold tracking-[0.2em] text-white/85">
              <span className="h-2.5 w-2.5 rotate-45 rounded-[3px] bg-[#ffd1e8] shadow-[0_0_0_5px_rgba(255,255,255,0.2)]" />
              忆涟千言—教
            </p>
            <h1 className="mt-8 max-w-lg text-5xl font-semibold leading-[1.12] tracking-[-0.04em] xl:text-6xl">
              把今天的学习，
              <br />
              放回自己的节奏里。
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-white/80">
              小涟学姐会记住你的学习记录，陪你从下一步开始，把每一次理解留在成长路上。
            </p>
          </section>

          <section
            data-auth-card="true"
            className="mx-auto w-full max-w-[450px] overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-[0_28px_80px_rgba(48,39,99,0.2)] backdrop-blur-xl"
          >
            <header className="flex items-center justify-between border-b border-[#F0EDF4] px-6 py-5 sm:px-8">
              <div className="flex items-center gap-2.5 lg:hidden">
                <span className="h-2.5 w-2.5 rotate-45 rounded-[3px] bg-[#EFB8D3]" />
                <span className="text-sm font-semibold tracking-[0.08em] text-[#393545]">忆涟千言—教</span>
              </div>
              <span className="text-xs text-[#AAA6B5]">AI 学习空间</span>
              <p className="text-right text-sm text-[#777386]">
                <span>{isLogin ? '没有账号？' : '已经有账号？'}</span>{' '}
                <button
                  type="button"
                  onClick={switchMode}
                  className="rounded-lg px-1.5 py-1 font-medium text-[#7766E8] transition-colors duration-200 hover:text-[#6958D5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7766E8]"
                >
                  {isLogin ? '创建账号' : '返回登录'}
                </button>
              </p>
            </header>

            <div className="px-6 py-8 sm:px-8 sm:py-9">
              <div>
                <p className="text-sm font-medium text-[#7766E8]">{isLogin ? '学习空间入口' : '建立学习账号'}</p>
                <h2 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-[#292733]">
                  {isLogin ? '欢迎回来' : '创建账号'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#777386]">
                  {isLogin ? '登录后继续你的学习计划。' : '创建后继续选择你的学习课程。'}
                </p>
              </div>

              <form className="mt-7 space-y-4" onSubmit={submit} aria-describedby={error ? 'auth-error' : undefined}>
                {!isLogin && (
                  <label htmlFor="auth-display-name" className="block text-[13px] font-medium text-[#393545]">
                    显示名称
                    <Input
                      id="auth-display-name"
                      name="displayName"
                      required
                      maxLength={60}
                      autoComplete="name"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      className={inputClassName}
                      placeholder="小涟怎么称呼你"
                    />
                  </label>
                )}

                <label htmlFor="auth-username" className="block text-[13px] font-medium text-[#393545]">
                  用户名
                  <Input
                    id="auth-username"
                    name="username"
                    required
                    minLength={3}
                    maxLength={32}
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className={inputClassName}
                    placeholder="字母、数字、_ - ."
                  />
                </label>

                <label htmlFor="auth-password" className="block text-[13px] font-medium text-[#393545]">
                  密码
                  <Input
                    type="password"
                    id="auth-password"
                    name="password"
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={inputClassName}
                    placeholder="至少 8 位，包含字母和数字"
                  />
                </label>

                {error && (
                  <p id="auth-error" role="alert" className="rounded-xl border border-[#F2D7DC] bg-[#FFF5F6] px-4 py-3 text-sm leading-5 text-[#A34E5B]">
                    {error}
                  </p>
                )}

                {turnstileSiteKey && (
                  <TurnstileWidget ref={captchaRef} siteKey={turnstileSiteKey} theme={resolved} onToken={receiveCaptchaToken} />
                )}

                <Button
                  data-auth-primary-action="true"
                  type="submit"
                  disabled={busy || Boolean(turnstileSiteKey && !captchaToken)}
                  aria-busy={busy}
                  className="h-12 w-full rounded-xl bg-[#7766E8] px-5 text-sm font-medium text-white shadow-[0_6px_16px_rgba(119,102,232,0.18)] transition-colors duration-200 hover:bg-[#6958D5] active:bg-[#5F50C8] focus-visible:ring-[#7766E8]/25 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#AAA6D5]"
                >
                  {busy ? (isLogin ? '正在登录…' : '正在创建…') : isLogin ? '进入我的学习空间' : '创建账号'}
                  {!busy && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
                </Button>
              </form>

              <p className="mt-5 text-center text-xs leading-5 text-[#777386]">登录后将加载与你账号关联的学习记录。</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
