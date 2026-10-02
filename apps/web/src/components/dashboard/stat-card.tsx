'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { fadeInUp } from '@/lib/motion';
import { FadeIn } from '@/components/motion';
import { useReducedMotion } from 'framer-motion';

interface StatCardProps {
  label: string;
  icon?: LucideIcon;
  accent?: string;
  footer?: React.ReactNode;
  href?: string;
  children: React.ReactNode;
}

/**
 * Unified dashboard metric tile: consistent padding, optional icon chip, and a
 * subtle hover lift. Replaces the ad-hoc stat cards previously duplicated on
 * the home page.
 */
export function StatCard({ label, icon: Icon, accent, footer, href, children }: StatCardProps) {
  const reduce = useReducedMotion();

  const body = (
    <Card interactive className="group h-full relative overflow-hidden border-border/30 bg-card">
      <CardContent className="p-6 sm:p-8 flex flex-col items-center justify-center text-center">
        {Icon && (
          <span
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary/10 text-primary mb-6 transition-transform group-hover:scale-110 duration-300',
              accent,
            )}
            aria-hidden
          >
            <Icon className="h-6 w-6" />
          </span>
        )}
        <div className="text-4xl sm:text-5xl font-bold tracking-tight tabular-nums text-foreground mb-2">
          {children}
        </div>
        <p className="text-sm sm:text-base font-medium text-muted-foreground">{label}</p>
        
        {footer && <div className="mt-4 text-sm text-muted-foreground/80">{footer}</div>}
        
        {href && (
          <span className="absolute top-4 right-4 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2">
            View details <ArrowUpRight className="h-3 w-3" />
          </span>
        )}
      </CardContent>
    </Card>
  );

  const content = href ? (
    <Link href={href} className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-card">
      {body}
    </Link>
  ) : (
    body
  );

  if (reduce) return content;
  return <FadeIn variants={fadeInUp}>{content}</FadeIn>;
}
