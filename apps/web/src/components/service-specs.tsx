'use client';

import * as React from 'react';
import { Check, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ServiceFeatures } from '@/lib/types';

/**
 * Renders the provider `features` bag as human-readable spec chips.
 * Keys are provider-defined (see the adapters), so unknown keys are
 * humanized rather than dropped  nothing the provider sells is hidden.
 */

const KEY_LABELS: Record<string, string> = {
  type: 'Type',
  refill: 'Refill',
  dripfeed: 'Drip-feed',
  proxyType: 'Proxy type',
  protocols: 'Protocols',
  rotation: 'Rotation',
  stickySessions: 'Sticky sessions',
  serviceType: 'Service',
  rental: 'Rental',
  esim: 'eSIM',
};

/** `stickySessions` → `Sticky sessions`, `max_qty` → `Max qty`. */
function humanizeKey(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

export interface ServiceSpec {
  label: string;
  /** Human-readable value; empty for booleans. */
  value: string;
  /** For booleans: true/false. Undefined when not a boolean. */
  bool?: boolean;
}

/**
 * Internal adapter metadata fields that should never be shown as UI chips.
 * These are used by the frontend logic (logos, flags, ordering, pricing) but are not
 * meaningful user-facing specs.
 */
const INTERNAL_KEYS = new Set([
  'logoUrl', 'isPublic', 'isoCode', 'countryCode', 'serviceId',
  'popular', 'serviceType', 'tariffs',
]);

/** Flatten a provider feature bag into displayable specs. */
export function extractSpecs(features?: ServiceFeatures | null): ServiceSpec[] {
  if (!features || typeof features !== 'object') return [];

  const specs: ServiceSpec[] = [];

  for (const [key, raw] of Object.entries(features)) {
    if (raw === null || raw === undefined) continue;
    if (INTERNAL_KEYS.has(key)) continue;  // skip internal metadata

    const label = KEY_LABELS[key] ?? humanizeKey(key);

    if (typeof raw === 'boolean') {
      specs.push({ label, value: '', bool: raw });
      continue;
    }

    if (Array.isArray(raw)) {
      // Skip arrays of objects they're internal data structures (e.g. tariffs), not display values
      const items = raw
        .filter((v) => v !== null && v !== undefined && typeof v !== 'object')
        .map((v) => String(v));
      if (items.length > 0) specs.push({ label, value: items.join(', ') });
      continue;
    }

    if (typeof raw === 'string' || typeof raw === 'number') {
      const str = String(raw).trim();
      if (str) specs.push({ label, value: str });
      continue;
    }
    // Nested objects are intentionally skipped  they aren't a single "spec".
  }

  return specs;
}


interface ServiceSpecsProps {
  features?: ServiceFeatures | null;
  /** Optional max chips to show. */
  limit?: number;
  className?: string;
}

export function ServiceSpecs({ features, limit, className }: ServiceSpecsProps) {
  const specs = React.useMemo(() => extractSpecs(features), [features]);
  if (specs.length === 0) return null;

  const shown = limit != null ? specs.slice(0, limit) : specs;
  const hidden = specs.length - shown.length;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {shown.map((spec) => (
        <Badge
          key={spec.label}
          variant="secondary"
          className="gap-1 text-[11px] font-normal"
          title={
            spec.bool !== undefined
              ? `${spec.label}: ${spec.bool ? 'Yes' : 'No'}`
              : `${spec.label}: ${spec.value}`
          }
        >
          {spec.bool === undefined ? (
            <>
              <span className="text-muted-foreground">{spec.label}</span>
              <span className="font-medium">{spec.value}</span>
            </>
          ) : (
            <>
              {spec.bool ? (
                <Check className="h-3 w-3 text-success" />
              ) : (
                <Minus className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={spec.bool ? 'font-medium' : 'text-muted-foreground line-through'}>
                {spec.label}
              </span>
            </>
          )}
        </Badge>
      ))}
      {hidden > 0 && (
        <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground">
          +{hidden} more
        </Badge>
      )}
    </div>
  );
}
