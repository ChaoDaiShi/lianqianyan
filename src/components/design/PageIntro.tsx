import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageIntroProps {
  eyebrow: string;
  title: string;
  description: ReactNode;
  icon: LucideIcon;
  aside?: ReactNode;
  className?: string;
  tone?: 'violet' | 'sky' | 'plain';
}

const toneClass = {
  violet: 'bg-[var(--em-surface)]',
  sky: 'bg-[var(--em-surface-subtle)]',
  plain: 'bg-[var(--em-surface)]',
} as const;

export function PageIntro({
  eyebrow,
  title,
  description,
  icon: Icon,
  aside,
  className,
  tone = 'violet',
}: PageIntroProps) {
  return (
    <header
      data-page-intro='compact'
      className={cn(
        'flex min-h-32 items-center justify-between gap-6 rounded-2xl border border-[var(--em-border)] px-5 py-5 shadow-[var(--em-shadow-sm)] sm:px-7 sm:py-6',
        toneClass[tone],
        className
      )}
    >
      <div className='min-w-0'>
        <p className='flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-[var(--em-primary)]'>
          <Icon className='h-[18px] w-[18px]' />
          {eyebrow}
        </p>
        <h1 className='mt-2 text-2xl font-bold leading-tight tracking-tight'>
          {title}
        </h1>
        <div className='mt-2 max-w-3xl text-sm leading-[1.7] text-[var(--em-muted-ink)] sm:text-[15px]'>
          {description}
        </div>
      </div>
      {aside ? <div className='hidden shrink-0 sm:block'>{aside}</div> : null}
    </header>
  );
}
