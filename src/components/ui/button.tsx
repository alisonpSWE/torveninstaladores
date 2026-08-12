import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffc61e] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[#ffc61e] text-black font-bold hover:bg-[#e5b010] active:bg-[#c99a0c]',
        success:
          'bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700',
        destructive:
          'bg-red-600 text-white hover:bg-red-500 active:bg-red-700',
        outline:
          'border border-zinc-800 bg-black/60 text-zinc-100 hover:bg-zinc-800 hover:text-white',
        secondary:
          'bg-zinc-800 text-zinc-100 hover:bg-zinc-700',
        ghost:
          'hover:bg-zinc-800 hover:text-zinc-100 text-zinc-400',
        link:
          'text-[#ffc61e] underline-offset-4 hover:underline font-semibold',
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
