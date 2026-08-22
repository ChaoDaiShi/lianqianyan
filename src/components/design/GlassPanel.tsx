import type { ElementType, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { gentleHover } from '@/design';

export interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'article' | 'div';
  interactive?: boolean;
}

export function GlassPanel({
  children,
  className,
  as = 'section',
  interactive = false,
}: GlassPanelProps) {
  const Component = motion[as] as ElementType;
  return (
    <Component
      whileHover={interactive ? gentleHover : undefined}
      className={cn('em-glass rounded-[28px]', className)}
    >
      {children}
    </Component>
  );
}
