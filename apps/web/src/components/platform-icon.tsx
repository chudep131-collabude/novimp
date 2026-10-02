'use client';

import * as React from 'react';
import {
  Facebook,
  Instagram,
  MessageCircle,
  Music,
  Share2,
  Twitter,
  Youtube,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Brand marks served from `/public/<slug>.svg`. lucide has no brand icons for
 * most networks, so we render the real logo and fall back to a generic lucide
 * glyph when we don't ship an asset for a platform.
 *
 * Platform strings from the API are AutoSMO's own category names with emoji
 * stripped, e.g. "Instagram Followers", "Facebook Comments", "TikTok".
 * We do substring matching so any category containing a known network name
 * resolves to the right logo no exact-key dependency.
 */

/** keyword → SVG slug mappings, checked via substring match */
const SLUG_MAP: Array<[string, string]> = [
  ['instagram',     'instagram'],
  ['tiktok',        'tiktok'],
  ['youtube',       'youtube'],
  ['telegram',      'telegram'],
  ['facebook',      'facebook'],
  ['twitter',       'twitter'],
  ['spotify',       'spotify'],
  ['twitch',        'twitch'],
  ['dribbble',      'dribbble'],
  ['whatsapp',      'whatsapp'],
  ['trustpilot',    'trustpilot'],
  ['coinmarketcap', 'coinmarketcap'],
  ['deezer',        'deezer'],
  ['kick',          'kick'],
  ['linkedin',      'linkedin'],
  ['pinterest',     'pinterest'],
  ['quora',         'quora'],
  ['reddit',        'reddit'],
  ['rutube',        'rutube'],
  ['soundcloud',    'soundcloud-2'],
  ['threads',       'threads'],
  ['tidal',         'tidal'],
  ['vimeo',         'vimeo'],
  ['vk',            'vk'],
  ['audiomack',     'audiomack'],
  ['dailymotion',   'dailymotion'],
  ['genius',        'genius'],
  ['mixcloud',      'mixcloud'],
  ['shazam',        'shazam'],
];

/** Slugs that use .png instead of .svg */
const PNG_SLUGS = new Set(['mixcloud']);

/** keyword → lucide fallback icon */
const ICON_MAP: Array<[string, typeof Share2]> = [
  ['instagram',  Instagram],
  ['tiktok',     Music],
  ['youtube',    Youtube],
  ['telegram',   MessageCircle],
  ['facebook',   Facebook],
  ['twitter',    Twitter],
  ['discord',    MessageCircle],
  ['spotify',    Music],
  ['soundcloud', Music],
  ['audiomack',  Music],
  ['deezer',     Music],
  ['tidal',      Music],
  ['shazam',     Music],
  ['mixcloud',   Music],
];

function normalize(platform?: string | null): string {
  return (platform ?? '').trim().toLowerCase();
}

function matchesKeyword(text: string, keyword: string): boolean {
  // Short keywords (≤3 chars like 'vk') must match the full platform name
  // to avoid false positives (e.g. 'vk' matching inside 'VKontakte' incorrectly).
  // Longer keywords use substring matching.
  if (keyword.length <= 3) return text === keyword;
  return text.includes(keyword);
}

function slugFor(platform?: string | null): string | null {
  const lower = normalize(platform);
  for (const [keyword, slug] of SLUG_MAP) {
    if (matchesKeyword(lower, keyword)) return slug;
  }
  return null;
}

/** Nearest lucide glyph for a platform name (exported for reuse). */
export function platformFallbackIcon(platform?: string | null) {
  const lower = normalize(platform);
  for (const [keyword, icon] of ICON_MAP) {
    if (matchesKeyword(lower, keyword)) return icon;
  }
  return Share2;
}

interface PlatformIconProps {
  platform?: string | null;
  className?: string;
  /** When true, renders the lucide glyph instead of the brand logo. */
  preferGlyph?: boolean;
}

export function PlatformIcon({ platform, className, preferGlyph }: PlatformIconProps) {
  const slug = slugFor(platform);

  if (slug && !preferGlyph) {
    const ext = PNG_SLUGS.has(slug) ? 'png' : 'svg';
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/${slug}.${ext}`}
        alt=""
        aria-hidden
        loading="lazy"
        className={cn('h-full w-full object-contain', className)}
      />
    );
  }

  const Icon = platformFallbackIcon(platform);
  return <Icon className={className} />;
}
