'use client';

import * as React from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import { staggerContainer, fadeInUp, fadeIn } from '@/lib/motion';

interface MotionListProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children?: React.ReactNode;
  variants?: import('framer-motion').Variants;
  className?: string;
}

/**
 * Container that orchestrates a staggered entrance for its children. Drop
 * `<StaggerItem>` inside. Automatically disables motion when the user prefers
 * reduced motion.
 */
export function StaggerList({ children, variants, ...props }: MotionListProps) {
  const reduce = useReducedMotion();
  const { className, ...rest } = props;
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      variants={variants ?? staggerContainer}
      initial="hidden"
      animate="show"
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, variants, ...props }: MotionListProps) {
  const reduce = useReducedMotion();
  const { className, ...rest } = props;
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div className={className} variants={variants ?? fadeInUp} {...rest}>
      {children}
    </motion.div>
  );
}

/** Simple fade-and-rise wrapper for page sections. */
export function FadeIn({ children, ...props }: MotionListProps) {
  const reduce = useReducedMotion();
  const { className, ...rest } = props;
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      variants={fadeIn}
      initial="hidden"
      animate="show"
      {...rest}
    >
      {children}
    </motion.div>
  );
}
