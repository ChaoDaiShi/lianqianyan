import { Link } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { LianMark } from '@/components/brand/LianMark';

export function TopCompanionBar() {
  const { account, logout, busy } = useAuth();
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/55 bg-[var(--em-glass-bg)]/90 shadow-[0_8px_30px_rgba(76,62,132,0.06)] backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-[1800px] items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-10">
        <Link to="/" className="flex items-center gap-3 rounded-2xl" aria-label="返回学习首页">
          <LianMark size="sm" />
          <span><strong className="block text-[15px] font-bold tracking-[-0.01em] text-[var(--em-ink)]">涟千言</strong><span className="block text-[11px] tracking-[0.13em] text-[var(--em-muted-ink)]">小涟学姐 · 证据星河</span></span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="hidden min-h-10 items-center rounded-full border border-violet-100/80 bg-white/55 px-4 text-sm font-medium text-[var(--em-muted-ink)] md:inline-flex">{account?.displayName}</span>
          <Link to="/xiaolian" className="hidden min-h-10 items-center gap-2 rounded-full border border-violet-100/80 bg-white/70 py-1 pl-1 pr-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md sm:flex">
            <img src="/brand/cyrene-icon.jpeg" alt="" className="h-8 w-8 rounded-full border border-white object-cover object-top shadow-sm" />
            <span className="text-sm font-medium text-[var(--em-muted-ink)]">和小涟聊聊</span>
          </Link>
          <Link to="/about" className="grid h-9 w-9 place-items-center rounded-2xl border border-violet-100 bg-white/70 text-[var(--em-muted-ink)] transition hover:text-primary-600" aria-label="打开更多与关于"><Menu className="h-4 w-4" /></Link>
          <button type="button" disabled={busy} onClick={() => void logout()} className="grid h-9 w-9 place-items-center rounded-2xl border border-violet-100 bg-white/70 text-[var(--em-muted-ink)] transition hover:text-rose-600 disabled:opacity-50" aria-label="退出登录"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
    </header>
  );
}
