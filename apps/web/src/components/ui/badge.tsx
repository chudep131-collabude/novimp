import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow-[0_1px_0_rgb(255_255_255/0.20)_inset,0_-1px_0_rgb(0_0_0/0.15)_inset]',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground shadow-[0_1px_0_rgb(255_255_255/0.15)_inset]',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow-[0_1px_0_rgb(255_255_255/0.20)_inset,0_-1px_0_rgb(0_0_0/0.15)_inset]',
        outline: 'text-foreground',
        success:
          'border-transparent bg-success/15 text-success shadow-[0_1px_0_rgb(255_255_255/0.20)_inset]',
        warning:
          'border-transparent bg-warning/15 text-warning shadow-[0_1px_0_rgb(255_255_255/0.20)_inset]',
        info:
          'border-transparent bg-info/15 text-info shadow-[0_1px_0_rgb(255_255_255/0.20)_inset]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
