import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--em-control-radius)] text-[15px] font-semibold ring-offset-[var(--em-canvas)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--em-focus-ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--em-action)] text-white shadow-sm hover:bg-[var(--em-action-hover)]',
        destructive: 'bg-rose-600 text-white hover:bg-rose-700',
        outline:
          'border border-[var(--em-border-strong)] bg-[var(--em-surface)] text-[var(--em-ink)] hover:border-[var(--em-primary)] hover:bg-[var(--em-primary-subtle)] hover:text-[var(--em-primary-deep)]',
        secondary:
          'bg-[var(--em-primary-subtle)] text-[var(--em-primary-deep)] hover:bg-[var(--em-primary-subtle)]',
        ghost:
          'text-[var(--em-muted-ink)] hover:bg-[var(--em-primary-subtle)] hover:text-[var(--em-primary-deep)]',
        link: 'text-[var(--em-primary-deep)] underline-offset-4 hover:text-[var(--em-primary-deep)] hover:underline',
      },
      size: {
        default: 'h-11 px-5 py-2.5',
        sm: 'h-10 rounded-[var(--em-control-radius)] px-4 text-sm',
        lg: 'h-[3.25rem] rounded-[var(--em-control-radius)] px-7 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
