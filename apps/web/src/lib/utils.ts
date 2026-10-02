import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatting helpers now live in `@/lib/format` (decimal-safe). Re-exported here
 * for backwards compatibility with existing imports.
 */
export { formatCurrency, formatDate, formatRelativeTime } from '@/lib/format';
