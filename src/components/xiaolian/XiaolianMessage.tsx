import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Heart, Lightbulb, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export type XiaolianMessageTone = 'observe' | 'suggest' | 'encourage' | 'success' | 'notice';

const TONE = {
  observe: { icon: Search, label: '小涟观察', surface: 'border-violet-100 bg-violet-50/65', ink: 'text-primary-700' },
  suggest: { icon: Lightbulb, label: '小涟建议', surface: 'border-sky-100 bg-sky-50/65', ink: 'text-sky-700' },
  encourage: { icon: Heart, label: '小涟陪你', surface: 'border-pink-100 bg-pink-50/60', ink: 'text-pink-700' },
  success: { icon: CheckCircle2, label: '小涟发现', surface: 'border-emerald-100 bg-emerald-50/60', ink: 'text-emerald-700' },
  notice: { icon: AlertCircle, label: '小涟提醒', surface: 'border-amber-100 bg-amber-50/60', ink: 'text-amber-700' },
} as const;

interface XiaolianMessageProps {
  tone?: XiaolianMessageTone;
  title?: string;
  children: ReactNode;
  className?: string;
  compact?: boolean;
}

export function XiaolianMessage({ tone = 'observe', title, children, className, compact = false }: XiaolianMessageProps) {
  const meta = TONE[tone];
  const Icon = meta.icon;
  return <div className={cn('rounded-[18px] border', meta.surface, compact ? 'px-3 py-2.5' : 'p-4', className)}>
    <div className={cn('flex items-center gap-2 text-xs font-semibold', meta.ink)}><Icon className="h-3.5 w-3.5" />{title ?? meta.label}</div>
    <div className={cn('text-sm leading-7 text-[var(--em-muted-ink)]', compact ? 'mt-1' : 'mt-2')}>{children}</div>
  </div>;
}
