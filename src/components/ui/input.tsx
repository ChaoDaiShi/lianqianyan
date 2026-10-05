import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-[var(--em-control-radius)] border border-violet-200/90 bg-white/72 px-3.5 py-2 text-sm text-[var(--em-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] ring-offset-[var(--em-canvas)] backdrop-blur file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[color:var(--em-muted-ink)]/70 focus-visible:border-primary-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--em-focus-ring)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
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
