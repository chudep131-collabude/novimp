'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Renders a country flag from `/public/flags/<CODE>.svg`, falling back to the
 * flag emoji when a code has no asset shipped or the request fails. Keeping the
 * fallback client-side avoids filesystem access during bundling.
 */

/** Two-letter code → flag emoji (globe for numeric/unknown codes). */
export function flagEmoji(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return '🌐';
  return String.fromCodePoint(
    ...Array.from(code.toUpperCase()).map((c) => 127397 + c.charCodeAt(0)),
  );
}

interface CountryFlagProps {
  code?: string | null;
  name?: string;
  className?: string;
}

export function CountryFlag({ code, name, className }: CountryFlagProps) {
  const upper = code?.toUpperCase();
  const [failed, setFailed] = React.useState(false);

  // Re-arm when the selected code changes.
  React.useEffect(() => {
    setFailed(false);
  }, [upper]);

  if (!upper || failed) {
    return (
      <span className={cn('inline-flex items-center justify-center text-xl', className)} aria-hidden>
        {upper ? flagEmoji(upper) : '🌐'}
      </span>
    );
  }

  return (
    // Static local asset  next/image adds no value for tiny SVGs here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/flags/${upper}.svg`}
      alt={name ? `${name} flag` : `${upper} flag`}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('inline-block rounded-[3px] object-cover', className)}
    />
  );
}
