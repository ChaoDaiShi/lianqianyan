import type { LucideIcon } from 'lucide-react';
import { Check, Circle, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { GlassPanel } from '@/components/design/GlassPanel';
import { cn } from '@/lib/utils';

export type DemoStoryStatus = 'waiting' | 'running' | 'completed';

interface DemoStoryStepProps {
  number: number;
  title: string;
  icon: LucideIcon;
  status: DemoStoryStatus;
  userAction: ReactNode;
  xiaolianAction: ReactNode;
  systemCapability: ReactNode;
  children?: ReactNode;
}

export function DemoStoryStep({ number, title, icon: Icon, status, userAction, xiaolianAction, systemCapability, children }: DemoStoryStepProps) {
  return (
    <GlassPanel className={cn('overflow-hidden p-5 sm:p-6', status === 'running' && 'ring-1 ring-sky-200')}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary-500 text-sm font-bold text-white">{number}</span>
        <Icon className="h-4 w-4 text-primary-600" />
        <h2 className="mr-auto text-lg font-bold">{title}</h2>
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold', status === 'completed' ? 'bg-emerald-50 text-emerald-700' : status === 'running' ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-500')}>
          {status === 'completed' ? <Check className="h-3 w-3" /> : status === 'running' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Circle className="h-3 w-3" />}
          {status === 'completed' ? '已有真实结果' : status === 'running' ? '正在请求' : '等待操作'}
        </span>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <div className="rounded-[18px] border border-slate-200 bg-white/50 p-4"><p className="text-[10px] font-bold tracking-[0.16em] text-slate-500">用户行为</p><div className="mt-2 text-sm leading-6">{userAction}</div></div>
        <div className="rounded-[18px] border border-violet-100 bg-violet-50/45 p-4"><p className="text-[10px] font-bold tracking-[0.16em] text-primary-600">小涟动作</p><div className="mt-2 text-sm leading-6">{xiaolianAction}</div></div>
        <div className="rounded-[18px] border border-sky-100 bg-sky-50/45 p-4"><p className="text-[10px] font-bold tracking-[0.16em] text-sky-700">系统能力</p><div className="mt-2 text-sm leading-6">{systemCapability}</div></div>
      </div>
      {children && <div className="mt-5 border-t border-violet-100 pt-5">{children}</div>}
    </GlassPanel>
  );
}
