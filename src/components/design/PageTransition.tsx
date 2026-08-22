import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { pageTransition } from '@/design';
import { cn } from '@/lib/utils';

export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : 'hidden'}
      animate="visible"
      variants={pageTransition}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
