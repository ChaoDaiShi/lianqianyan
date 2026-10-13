import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SolidPanelProps {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'article' | 'div';
  interactive?: boolean;
}

export function SolidPanel({
  children,
  className,
  as = 'section',
  interactive = false,
}: SolidPanelProps) {
  const Component = as;
  return (
    <Component
      className={cn(
        'min-w-0 rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] shadow-[var(--em-shadow-sm)]',
        interactive && 'transition-shadow duration-150 hover:shadow-[var(--em-shadow-md)]',
        className,
      )}
    >
      {children}
    </Component>
  );
}
