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

/**
 * Returns true for auto-generated synthetic emails created by third-party logins
 * (like Telegram: tg_12345@telegram.local). These don't represent a real inbox.
 */
export function isSyntheticEmail(email?: string | null): boolean {
  if (!email) return true;
  return (
    email.endsWith('.local') ||
    email.includes('@telegram.') ||
    /^tg_\d+@/.test(email)
  );
}
