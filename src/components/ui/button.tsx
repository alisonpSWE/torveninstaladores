import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-orange-600 text-white hover:bg-orange-500 shadow-lg shadow-orange-600/20 active:bg-orange-700',
        success:
          'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 active:bg-emerald-700',
        destructive:
          'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-600/20',
        outline:
          'border border-zinc-700 bg-zinc-900/50 text-zinc-100 hover:bg-zinc-800 hover:text-white',
        secondary:
          'bg-zinc-800 text-zinc-100 hover:bg-zinc-700',
        ghost:
          'hover:bg-zinc-800 hover:text-zinc-100 text-zinc-400',
        link:
          'text-orange-400 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-4 py-2 text-base',
        sm: 'h-9 rounded-lg px-3 text-xs',
        lg: 'h-13 rounded-2xl px-6 text-lg font-semibold',
        icon: 'h-11 w-11 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
