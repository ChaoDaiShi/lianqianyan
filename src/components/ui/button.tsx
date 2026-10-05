import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-[var(--em-control-radius)] text-sm font-semibold ring-offset-[var(--em-canvas)] transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--em-focus-ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary-600 text-white shadow-[0_10px_24px_rgba(111,95,224,0.2)] hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-[0_14px_30px_rgba(111,95,224,0.24)] active:translate-y-0',
        destructive: 'bg-rose-600 text-white hover:bg-rose-700',
        outline:
          'border border-violet-200 bg-white/70 text-[var(--em-ink)] shadow-sm backdrop-blur hover:border-primary-300 hover:bg-violet-50/80 hover:text-primary-700',
        secondary:
          'bg-violet-100/80 text-primary-800 hover:bg-violet-200/80',
        ghost:
          'text-[var(--em-muted-ink)] hover:bg-violet-100/65 hover:text-primary-800',
        link: 'text-primary-700 underline-offset-4 hover:text-primary-800 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-xl px-3',
        lg: 'h-12 rounded-[18px] px-8',
        icon: 'h-10 w-10',
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
