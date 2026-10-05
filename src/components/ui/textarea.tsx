import * as React from 'react';

import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[104px] w-full resize-y rounded-[var(--em-control-radius)] border border-violet-200/90 bg-white/72 px-3.5 py-3 text-[15px] leading-7 text-[var(--em-ink)] ring-offset-[var(--em-canvas)] backdrop-blur placeholder:text-[color:var(--em-muted-ink)]/70 focus-visible:border-primary-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--em-focus-ring)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
