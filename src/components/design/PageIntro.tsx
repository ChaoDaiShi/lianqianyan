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
  violet: 'bg-gradient-to-r from-violet-50/85 via-white/72 to-sky-50/45',
  sky: 'bg-gradient-to-r from-sky-50/85 via-white/72 to-violet-50/45',
  plain: 'bg-white/55',
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
        'flex min-h-[7.5rem] items-center justify-between gap-4 rounded-[2rem] border border-white/75 px-5 py-4 shadow-[0_14px_42px_rgba(87,73,151,.09)] backdrop-blur-xl sm:px-6',
        toneClass[tone],
        className
      )}
    >
      <div className='min-w-0'>
        <p className='flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-primary-700'>
          <Icon className='h-4 w-4' />
          {eyebrow}
        </p>
        <h1 className='mt-1.5 text-2xl font-bold tracking-[-0.025em] sm:text-3xl'>
          {title}
        </h1>
        <div className='mt-1.5 max-w-3xl text-sm leading-6 text-[var(--em-muted-ink)]'>
          {description}
        </div>
      </div>
      {aside ? <div className='hidden shrink-0 sm:block'>{aside}</div> : null}
    </header>
  );
}
