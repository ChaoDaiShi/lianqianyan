import { Bot, ShieldCheck, Sparkles } from 'lucide-react';
import { NebulaBackground } from '@/components/design/NebulaBackground';
import { ACTIVE_LEARNER_CONTEXT } from '@/config/learnerContext';
import { XiaolianWorkspace } from '@/pages/XiaolianPage';

export function AgentPage() {
  const identityLabel =
    ACTIVE_LEARNER_CONTEXT.source === 'host'
      ? '平台匿名档案'
      : '浏览器匿名档案';

  return (
    <div
      data-agent-embed="true"
      className="relative min-h-screen overflow-x-clip bg-[var(--em-canvas)] text-[var(--em-ink)]"
    >
      <NebulaBackground />
      <header className="relative z-10 border-b border-white/60 bg-white/55 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary-500 to-star text-white shadow-md">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.14em] text-primary-700">
                <Bot className="h-3.5 w-3.5" />独立智能体
              </p>
              <h1 className="truncate text-sm font-bold">忆涟千言—教 · 小涟</h1>
            </div>
          </div>
          <p className="flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/70 px-3 py-1.5 text-[10px] font-medium text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5" />
            {identityLabel} · 不含登录凭据
          </p>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-6xl p-2 sm:p-4">
        <XiaolianWorkspace embedded />
      </main>
    </div>
  );
}
