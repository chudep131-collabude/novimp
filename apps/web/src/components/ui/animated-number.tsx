'use client';

import * as React from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';
import { formatCurrency, toNumber, type Numeric } from '@/lib/format';

interface AnimatedCurrencyProps {
  value: Numeric;
  currency?: string;
  className?: string;
}

/**
 * Counts up to a monetary value. Uses the decimal-safe formatter for display,
 * so crypto precision is preserved. Animates only the numeric tween  the
 * final rendered string always comes from `formatCurrency`.
 */
export function AnimatedCurrency({ value, currency = 'USD', className }: AnimatedCurrencyProps) {
  const target = toNumber(value);
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = React.useState(reduce ? target : 0);

  React.useEffect(() => {
    if (reduce || !inView) {
      setDisplay(target);
      return;
    }
    const controls = animate(0, target, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(latest),
    });
    return () => controls.stop();
  }, [target, reduce, inView]);

  return (
    <span ref={ref} className={className}>
      {formatCurrency(display, currency)}
    </span>
  );
}

interface AnimatedCountProps {
  value: Numeric;
  className?: string;
  format?: (n: number) => string;
}

/** Counts up to an integer stat (orders, tickets, etc.). */
export function AnimatedCount({ value, className, format }: AnimatedCountProps) {
  const target = toNumber(value);
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = React.useState(reduce ? target : 0);

  React.useEffect(() => {
    if (reduce || !inView) {
      setDisplay(target);
      return;
    }
    const controls = animate(0, target, {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(latest),
    });
    return () => controls.stop();
  }, [target, reduce, inView]);

  const rendered = format ? format(display) : Math.round(display).toLocaleString('en-US');
  return (
    <span ref={ref} className={className}>
      {rendered}
    </span>
  );
}
