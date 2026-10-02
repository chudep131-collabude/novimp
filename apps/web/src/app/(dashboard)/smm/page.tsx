'use client';

import { useMemo, useState, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Search, BarChart3, ClipboardList, Minus, Plus, Loader2, Check, ChevronRight, AlertTriangle } from 'lucide-react';
import { useServices, useCreateOrder, useWallet } from '@/lib/queries';
import { getErrorMessage } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import type { Service } from '@/lib/types';
import type { Platform } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { StaggerList, StaggerItem } from '@/components/motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ServiceSpecs } from '@/components/service-specs';
import { PlatformIcon } from '@/components/platform-icon';

/* ── Platform accent colors ────────────────────────────────────────────────── */
const platformColors: Record<string, { bg: string; ring: string }> = {
  Instagram: { bg: 'bg-pink-500/10',    ring: 'hover:ring-pink-500/30' },
  TikTok:    { bg: 'bg-slate-900/5',    ring: 'hover:ring-slate-400/30' },
  YouTube:   { bg: 'bg-red-500/10',     ring: 'hover:ring-red-500/30' },
  Telegram:  { bg: 'bg-sky-500/10',     ring: 'hover:ring-sky-500/30' },
  Facebook:  { bg: 'bg-blue-600/10',    ring: 'hover:ring-blue-600/30' },
  Discord:   { bg: 'bg-indigo-500/10',  ring: 'hover:ring-indigo-500/30' },
  Twitter:   { bg: 'bg-sky-400/10',     ring: 'hover:ring-sky-400/30' },
  Spotify:   { bg: 'bg-green-500/10',   ring: 'hover:ring-green-500/30' },
  SoundCloud:{ bg: 'bg-orange-500/10',  ring: 'hover:ring-orange-500/30' },
  Other:     { bg: 'bg-muted/50',       ring: 'hover:ring-border' },
};

export default function SMMPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Drill-down state from URL search params so browser back button works
  const selectedPlatform = searchParams.get('platform');
  const selectedSubcategory = searchParams.get('sub');

  const setSelectedPlatform = useCallback(
    (platform: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (platform) {
        params.set('platform', platform);
        params.delete('sub');
      } else {
        params.delete('platform');
        params.delete('sub');
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const setSelectedSubcategory = useCallback(
    (sub: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (sub) {
        params.set('sub', sub);
      } else {
        params.delete('sub');
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const [search, setSearch] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [targetUrl, setTargetUrl] = useState('');

  const { data, isLoading, isError, error, refetch } = useServices('SMM', 2000);
  const createOrder = useCreateOrder();
  const { data: wallet } = useWallet();

  const services: Service[] = data?.services ?? [];

  const platforms = useMemo<Platform[]>(() => {
    const counts = new Map<string, number>();
    for (const s of services) {
      const p = s.platform || 'Other';
      counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count);
  }, [services]);

  const subcategories = useMemo(() => {
    if (!selectedPlatform) return [];
    const counts = new Map<string, number>();
    for (const s of services) {
      if ((s.platform || 'Other') === selectedPlatform) {
        const sub = s.subcategory || 'Other';
        counts.set(sub, (counts.get(sub) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([sub, count]) => ({ sub, count }))
      .sort((a, b) => b.count - a.count);
  }, [services, selectedPlatform]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const searchTerms = q.split(/\s+/).filter(Boolean);

    return services.filter((s) => {
      const pName = (s.platform || 'Other').toLowerCase();
      const subName = (s.subcategory || 'Other').toLowerCase();
      const sName = s.name.toLowerCase();
      const sDesc = (s.description || '').toLowerCase();

      const searchableText = `${pName} ${subName} ${sName} ${sDesc}`;

      const matchesSearch =
        searchTerms.length === 0 || searchTerms.every((term) => searchableText.includes(term));

      const matchesPlatform = !selectedPlatform || (s.platform || 'Other') === selectedPlatform;
      const matchesSubcat = !selectedSubcategory || (s.subcategory || 'Other') === selectedSubcategory;

      if (q) return matchesSearch; // if searching, ignore platform/subcat drilldown
      return matchesPlatform && matchesSubcat;
    });
  }, [services, search, selectedPlatform, selectedSubcategory]);

  const openOrder = (service: Service) => {
    setSelectedService(service);
    setQuantity(service.customerMinQty || 100);
    setTargetUrl('');
  };

  const closeOrder = () => {
    setSelectedService(null);
    createOrder.reset();
  };

  const minQty = selectedService?.customerMinQty ?? 1;
  const maxQty = selectedService?.customerMaxQty ?? undefined;
  const unitPrice = Number(selectedService?.customerPrice ?? 0);
  const total = unitPrice * quantity;
  const quantityInvalid = quantity < minQty || (maxQty != null && quantity > maxQty);

  const balance = wallet ? Number(wallet.balance) : null;
  const hasInsufficientFunds = balance !== null && balance < total;

  /** Validate the target URL/username field. */
  const targetUrlError = (() => {
    const val = targetUrl.trim();
    if (!val) return 'Required enter the target URL or username.';
    if (val.includes('://')) {
      try {
        const url = new URL(val);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          return 'URL must start with http:// or https://';
        }
      } catch {
        return 'Enter a valid URL (e.g. https://instagram.com/yourprofile)';
      }
    }
    if (val.replace('@', '').length < 2) return 'Too short enter a full URL or username.';
    return null;
  })();

  const handleOrder = () => {
    if (!selectedService || quantityInvalid || targetUrlError || hasInsufficientFunds) return;
    createOrder.mutate(
      { serviceId: selectedService.id, quantity, targetUrl: targetUrl.trim() },
      { onSuccess: closeOrder }
    );
  };

  const apiErrorMsg = createOrder.isError ? getErrorMessage(createOrder.error) : null;

  const renderServicesGrid = () => {
    if (filtered.length === 0) {
      return (
        <EmptyState
          icon={BarChart3}
          title="No services found"
          description={
            search ? `Nothing matched "${search}".` : 'No services available right now.'
          }
        />
      );
    }
    return (
      <StaggerList className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((service) => {
          const colors = platformColors[service.platform ?? 'Other'] ?? platformColors.Other;
          return (
            <StaggerItem key={service.id}>
              <button
                type="button"
                onClick={() => openOrder(service)}
                className="group block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
              >
                <Card interactive className={`h-full rounded-2xl ${colors.bg} ring-2 ring-transparent transition-all duration-200 ${colors.ring}`}>
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-background p-2 shadow-sm transition-transform duration-200 group-hover:scale-110">
                        <PlatformIcon platform={service.platform} className="h-full w-full" />
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {service.platform || 'Other'}
                      </Badge>
                    </div>
                    <h3 className="mb-1 line-clamp-1 font-semibold">{service.name}</h3>
                    <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                      {service.description || 'Social media engagement service'}
                    </p>
                    <ServiceSpecs features={service.features} limit={3} className="mb-3" />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold tabular-nums">
                          {formatCurrency(service.customerPrice, service.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">per unit</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Min: {service.customerMinQty}</p>
                        {service.estimatedTime && (
                          <p className="text-xs text-muted-foreground">{service.estimatedTime}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            </StaggerItem>
          );
        })}
      </StaggerList>
    );
  };

  return (
    <StaggerList className="space-y-6">
      <StaggerItem>
        <PageHeader
          title="Social Media Services"
          description="Boost your social presence with real engagement across all major platforms."
          actions={
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full"
                aria-label="Search services"
              />
            </div>
          }
        />
      </StaggerItem>

      {/* Navigation Breadcrumbs */}
      <StaggerItem>
        {!search && (selectedPlatform || selectedSubcategory) && (
          <div className="flex max-w-full flex-wrap items-center gap-2 overflow-hidden pb-4 border-b">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedPlatform(null);
                setSelectedSubcategory(null);
              }}
            >
              All Platforms
            </Button>
            <span className="text-muted-foreground">/</span>
            {selectedPlatform && (
              <Button
                variant={selectedSubcategory ? 'outline' : 'default'}
                size="sm"
                onClick={() => setSelectedSubcategory(null)}
                className="max-w-[160px] truncate"
              >
                <PlatformIcon platform={selectedPlatform} className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">{selectedPlatform}</span>
              </Button>
            )}
            {selectedSubcategory && (
              <>
                <span className="text-muted-foreground">/</span>
                <Button variant="default" size="sm" className="max-w-[160px] truncate">
                  <span className="truncate">{selectedSubcategory}</span>
                </Button>
              </>
            )}
          </div>
        )}
      </StaggerItem>

      {/* Main Content Area */}
      <StaggerItem>
        {isError ? (
          <ErrorState error={error} title="Could not load services" onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-lg" />
            ))}
          </div>
        ) : search ? (
          // If searching, show the filtered flat list directly
          renderServicesGrid()
        ) : !selectedPlatform ? (
          // Step 1: Select Platform
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
            {platforms.map((p) => {
              const colors = platformColors[p.platform] ?? platformColors.Other;
              return (
                <button
                  key={p.platform}
                  onClick={() => setSelectedPlatform(p.platform)}
                  className={`group flex w-full min-w-0 flex-col items-center gap-2 sm:gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4 text-center transition-all duration-200 hover:border-transparent hover:shadow-card-hover hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-2 ring-transparent ${colors.ring}`}
                >
                  <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl ${colors.bg} transition-transform duration-200 group-hover:scale-110`}>
                    <PlatformIcon platform={p.platform} className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-semibold truncate max-w-[80px] sm:max-w-none">{p.platform}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">{p.count} services</div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : !selectedSubcategory ? (
          // Step 2: Select Subcategory
          <div className="grid gap-2 sm:gap-3 sm:grid-cols-2">
            {subcategories.map((sub) => (
              <button
                key={sub.sub}
                type="button"
                onClick={() => setSelectedSubcategory(sub.sub)}
                className="group flex w-full min-w-0 items-center gap-3 sm:gap-4 rounded-2xl border border-border bg-card px-4 sm:px-5 py-3 sm:py-4 text-left transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-200 group-hover:scale-110">
                  <PlatformIcon platform={selectedPlatform} className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate text-sm sm:text-base">{sub.sub.replace(/&amp;/g, '&')}</p>
                  <p className="text-xs text-muted-foreground">{sub.count} services</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
              </button>
            ))}
          </div>
        ) : (
          // Step 3: Select Service
          renderServicesGrid()
        )}
      </StaggerItem>

      {/* Order Dialog */}
      <Dialog
        open={!!selectedService}
        onOpenChange={(open) => {
          if (!open) closeOrder();
        }}
      >
        <DialogContent>
          {selectedService && (
            <>
              <DialogHeader>
                <DialogTitle>Place Order</DialogTitle>
                <DialogDescription>
                  {selectedService.name} · {selectedService.platform || 'Other'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="smm-quantity">
                    Quantity
                  </label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setQuantity((q) => Math.max(minQty, q - (minQty > 1 ? minQty : 100)))
                      }
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      id="smm-quantity"
                      type="number"
                      min={minQty}
                      max={maxQty}
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                      className="text-center tabular-nums"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity((q) => q + (minQty > 1 ? minQty : 100))}
                      disabled={maxQty != null && quantity >= maxQty}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Min: {minQty}
                    {maxQty != null && ` · Max: ${maxQty}`}
                  </p>
                  {quantityInvalid && (
                    <p className="text-xs text-destructive" role="alert">
                      Quantity must be between {minQty}
                      {maxQty != null && ` and ${maxQty}`}.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="smm-target">
                    Target URL / Username
                  </label>
                  <Input
                    id="smm-target"
                    placeholder="https://instagram.com/yourprofile"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    aria-invalid={!!targetUrlError && targetUrl.length > 0}
                  />
                  {targetUrl.length > 0 && targetUrlError ? (
                    <p className="text-xs text-destructive" role="alert">{targetUrlError}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Enter the profile URL or @username where engagement is delivered.
                    </p>
                  )}
                </div>

                <ServiceSpecs features={selectedService.features} />

                <div className={`rounded-lg border p-4 ${
                  hasInsufficientFunds ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-muted/50'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm opacity-80">Total</span>
                    <span className="text-xl font-semibold tabular-nums">
                      {formatCurrency(total, selectedService.currency)}
                    </span>
                  </div>
                  {hasInsufficientFunds && balance !== null && (
                    <div className="mt-1 flex items-center justify-between text-xs font-medium">
                      <span>Your balance</span>
                      <span>{formatCurrency(balance, selectedService.currency)}</span>
                    </div>
                  )}
                </div>

                {hasInsufficientFunds && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/8 px-4 py-3 text-xs" role="alert">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                    <div className="flex-1 space-y-2">
                      <p className="font-semibold text-warning">
                        Insufficient balance — you need {formatCurrency(total - (balance ?? 0), selectedService.currency)} more
                      </p>
                      <p className="text-muted-foreground">Top up your wallet and come back to complete this purchase.</p>
                      <Link
                        href="/wallet"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                        onClick={closeOrder}
                      >
                        Top Up Wallet
                      </Link>
                    </div>
                  </div>
                )}

                {!hasInsufficientFunds && apiErrorMsg && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-xs text-destructive" role="alert">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>{apiErrorMsg}</span>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeOrder}>
                  Cancel
                </Button>
                {!hasInsufficientFunds && (
                  <Button
                    onClick={handleOrder}
                    disabled={createOrder.isPending || quantityInvalid || !!targetUrlError}
                  >
                    {createOrder.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ClipboardList className="mr-2 h-4 w-4" />
                    )}
                    {createOrder.isSuccess ? 'Order placed' : apiErrorMsg ? 'Try again' : 'Place Order'}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </StaggerList>
  );
}
