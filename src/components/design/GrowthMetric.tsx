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
    primary: 'text-[var(--em-primary-deep)]',
    star: 'text-[var(--em-decision)]',
    accent: 'text-[var(--em-warning)]',
    muted: 'text-[var(--em-muted-ink)]',
  }[tone];
  return (
    <div className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4 shadow-[var(--em-shadow-sm)]">
      <p className="text-xs font-medium text-[var(--em-muted-ink)]">{label}</p>
      <p className={cn('mt-2 text-xl font-bold tracking-tight', toneClass)}>{value}</p>
      {hint && <p className="mt-1 text-xs leading-relaxed text-[var(--em-muted-ink)]">{hint}</p>}
    </div>
  );
}
