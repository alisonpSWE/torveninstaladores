import * as React from 'react';
import { cn } from '@/lib/utils';

const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { orientation?: 'horizontal' | 'vertical' }
>(({ className, orientation = 'horizontal', ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'shrink-0 bg-zinc-800',
      orientation === 'horizontal' ? 'h-[1px] w-full my-3' : 'h-full w-[1px] mx-3',
      className
    )}
    {...props}
  />
));
Separator.displayName = 'Separator';

export { Separator };
