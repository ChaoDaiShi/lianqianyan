import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-[var(--em-control-radius)] border border-[var(--em-border-strong)] bg-[var(--em-surface)] px-3.5 py-2 text-[15px] text-[var(--em-ink)] ring-offset-[var(--em-canvas)] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[color:var(--em-muted-ink)]/70 focus-visible:border-[var(--em-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--em-focus-ring)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
