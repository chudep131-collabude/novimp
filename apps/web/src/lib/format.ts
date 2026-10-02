/**
 * Decimal-safe formatting helpers.
 *
 * Monetary values from the API are Prisma `Decimal` columns (Decimal(18, 8))
 * which JSON-serialize to *strings* (e.g. "1234.56789000"). Never treat those
 * strings as JS numbers for display without parsing them explicitly, and never
 * assume 2 decimal places  crypto assets need up to 8.
 */

export type Numeric = string | number | null | undefined;

const FIAT = new Set([
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'BRL', 'MXN',
]);

/** Currencies that must render with 8 decimals rather than 2. */
const CRYPTO = new Set([
  'BTC', 'ETH', 'USDT', 'USDC', 'LTC', 'XRP', 'SOL', 'DOGE', 'TRX', 'BNB',
]);

/**
 * Parse an API decimal (string or number) into a finite number.
 * Returns 0 for null/undefined/NaN so callers can render safely.
 */
export function toNumber(value: Numeric): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fractionDigitsFor(currency: string, value: number): number {
  const code = currency.toUpperCase();
  if (CRYPTO.has(code)) {
    // Trim trailing zeros but keep meaningful precision (max 8).
    return value !== 0 && Math.abs(value) < 1 ? 8 : 6;
  }
  if (code === 'JPY') return 0;

  // For fiat (USD, EUR, etc.) use 2 decimals normally, but bump precision
  // for very small per-unit prices (e.g. SMM service rates like $0.000900).
  // Find how many decimals are needed to show at least 2 significant figures.
  if (value > 0 && value < 0.01) {
    // e.g. 0.0009 → Math.ceil(-log10(0.0009)) = 4, +1 = 5 sig digits shown
    const sigDigits = Math.ceil(-Math.log10(value)) + 1;
    return Math.min(sigDigits, 8); // cap at 8
  }

  return 2;
}

/**
 * Format a monetary amount. Uses Intl so grouping/locale is consistent, and
 * respects the correct precision for fiat vs crypto.
 */
export function formatCurrency(value: Numeric, currency = 'USD'): string {
  const code = currency.toUpperCase();
  const amount = toNumber(value);
  const digits = fractionDigitsFor(code, amount);

  if (FIAT.has(code)) {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: code,
        minimumFractionDigits: Math.min(2, digits),
        maximumFractionDigits: digits,
      }).format(amount);
    } catch {
      /* fall through to plain formatting */
    }
  }

  // Crypto / unknown: format the number, append the ticker.
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(amount);
  return `${formatted} ${code}`;
}

/**
 * Sign-aware amount renderer for transaction rows. Returns the formatted string
 * plus whether the amount is negative so callers can color it.
 */
export function formatSignedAmount(
  value: Numeric,
  currency = 'USD',
): { text: string; negative: boolean } {
  const amount = toNumber(value);
  return {
    text: `${amount > 0 ? '+' : amount < 0 ? '-' : ''}${formatCurrency(Math.abs(amount), currency)}`,
    negative: amount < 0,
  };
}

/** Compact number for stat tiles: 1.2K, 3.4M. */
export function formatCompact(value: Numeric): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
    toNumber(value),
  );
}

export function formatPercent(value: Numeric, digits = 1): string {
  return `${toNumber(value).toFixed(digits)}%`;
}

/** Absolute date+time, e.g. "Sep 16, 2026, 08:34 AM". */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/** Relative time, e.g. "3h ago". */
export function formatRelativeTime(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}
