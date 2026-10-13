import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(className)}>
      {children}
    </div>
  );
}
