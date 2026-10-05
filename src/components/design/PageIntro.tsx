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
        'flex min-h-36 items-center justify-between gap-6 rounded-[2rem] border border-white/75 px-5 py-5 shadow-[0_14px_42px_rgba(87,73,151,.09)] backdrop-blur-xl sm:px-7 sm:py-6',
        toneClass[tone],
        className
      )}
    >
      <div className='min-w-0'>
        <p className='flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-primary-700'>
          <Icon className='h-[18px] w-[18px]' />
          {eyebrow}
        </p>
        <h1 className='mt-2 text-[1.875rem] font-bold leading-tight tracking-[-0.03em] sm:text-4xl'>
          {title}
        </h1>
        <div className='mt-2 max-w-3xl text-[15px] leading-[1.65] text-[var(--em-muted-ink)] sm:text-base'>
          {description}
        </div>
      </div>
      {aside ? <div className='hidden shrink-0 sm:block'>{aside}</div> : null}
    </header>
  );
}
