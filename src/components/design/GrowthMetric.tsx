import { cn } from '@/lib/utils';

export function GrowthMetric({
  label,
  value,
  hint,
  tone = 'primary',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'primary' | 'star' | 'accent' | 'muted';
}) {
  const toneClass = {
    primary: 'from-violet-500 to-indigo-500',
    star: 'from-sky-400 to-blue-500',
    accent: 'from-pink-400 to-fuchsia-500',
    muted: 'from-slate-400 to-slate-500',
  }[tone];
  return (
    <div className="relative overflow-hidden rounded-[20px] border border-white/80 bg-white/60 p-4 shadow-sm">
      <span className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', toneClass)} />
      <p className="text-xs font-medium text-[var(--em-muted-ink)]">{label}</p>
      <p className="mt-2 text-xl font-bold tracking-tight text-[var(--em-ink)]">{value}</p>
      {hint && <p className="mt-1 text-xs leading-relaxed text-[var(--em-muted-ink)]">{hint}</p>}
    </div>
  );
}
