import { Link } from 'react-router-dom';
import { Menu, Sparkles } from 'lucide-react';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';
import { useXiaolianRuntimeStore } from '@/store';

export function TopCompanionBar() {
  const runtimeState = useXiaolianRuntimeStore((runtime) => runtime.state);
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/60 bg-white/55 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1536px] items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-3 rounded-2xl" aria-label="返回学习首页">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary-500 to-star text-white shadow-md"><Sparkles className="h-5 w-5" /></span>
          <span><strong className="block text-sm text-[var(--em-ink)]">忆涟千言—教</strong><span className="block text-[10px] tracking-[0.18em] text-[var(--em-muted-ink)]">AI 学姐陪伴式学习空间</span></span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link to="/xiaolian" className="hidden items-center gap-2 rounded-full border border-violet-100 bg-white/70 py-1 pl-1 pr-3 sm:flex">
            <span className="h-8 w-8 overflow-hidden rounded-full bg-violet-50"><XiaolianCharacter state={runtimeState} size="sm" className="-mt-1 scale-[1.8]" /></span>
            <span className="text-xs font-medium text-[var(--em-muted-ink)]">和小涟一起学习</span>
          </Link>
          <Link to="/about" className="grid h-10 w-10 place-items-center rounded-2xl border border-violet-100 bg-white/70 text-[var(--em-muted-ink)] transition hover:text-primary-600" aria-label="打开更多与关于"><Menu className="h-4 w-4" /></Link>
        </div>
      </div>
    </header>
  );
}
