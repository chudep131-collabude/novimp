'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Phone,
  Smartphone,
  Globe,
  Loader2,
  Check,
  ShieldCheck,
  Lock,
  Unlock,
  RefreshCw,
  Copy,
  Inbox,
  Clock,
  ChevronRight,
  Signal,
  AlertTriangle,
  Search,
  X,
} from 'lucide-react';
import { useServices, useCreateOrder, useFreeNumbers, useFreeMessages } from '@/lib/queries';
import { formatCurrency } from '@/lib/format';
import type { Service } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ServiceSpecs } from '@/components/service-specs';
import { CountryFlag } from '@/components/country-flag';
import { PlatformIcon } from '@/components/platform-icon';
import { StaggerList, StaggerItem } from '@/components/motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function serviceMatchesCountry(service: Service, countryCode: string): boolean {
  const list = service.countries;
  if (!Array.isArray(list) || list.length === 0) return true;
  return list.some((c) => c?.code === countryCode);
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast({ title: 'Copied!', description: text });
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const parsed = new Date(dateStr);
  // If the string isn't a valid ISO date (e.g. OnlineSIM returns a human
  // string like "6 days ago"), just pass it through as-is.
  if (isNaN(parsed.getTime())) return dateStr;
  const diff = Math.floor((Date.now() - parsed.getTime()) / 1000);
  if (diff < 0) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/**
 * Format an E.164 phone number for human readability.
 * e.g. "+35699127092" → "+356 99 127 092"
 * Falls back to the raw string if it doesn't start with +.
 */
function formatPhoneNumber(raw: string): string {
  if (!raw.startsWith('+')) return raw;
  // Strip the leading + and split into country code + subscriber number.
  const digits = raw.replace(/^\+/, '');
  // Group subscriber digits in chunks of 3 from the right for readability.
  // Keep the country code (first 1–3 digits) separate.
  const ccLengths: Record<string, number> = {};
  // Determine country code length by checking known prefixes (1, 2, or 3 digits).
  // We just pick the shortest match that looks reasonable: try 3-digit first,
  // then 2-digit, then 1-digit.
  let ccLen = 1;
  if (digits.length > 3) {
    const threeDigit = parseInt(digits.slice(0, 3), 10);
    const twoDigit = parseInt(digits.slice(0, 2), 10);
    // Countries with 3-digit codes are generally 200–999 range non-NANP
    // This is a lightweight heuristic; exact mapping lives in the adapter.
    if (threeDigit >= 200) ccLen = 3;
    else if (twoDigit >= 20) ccLen = 2;
    else ccLen = 1;
  }
  const cc = digits.slice(0, ccLen);
  const subscriber = digits.slice(ccLen);
  // Group subscriber in chunks of 3, padding from the left if needed.
  const chunks: string[] = [];
  let rem = subscriber;
  while (rem.length > 3) {
    chunks.unshift(rem.slice(-3));
    rem = rem.slice(0, -3);
  }
  if (rem) chunks.unshift(rem);
  return `+${cc} ${chunks.join(' ')}`;
}

/* ─── Free number inbox ───────────────────────────────────────────────────── */

function FreeNumberInbox({ phoneNumber, onClose }: { phoneNumber: string; onClose: () => void }) {
  const { data: rawMessages, isLoading, dataUpdatedAt } = useFreeMessages(phoneNumber);
  const messages = Array.isArray(rawMessages) ? rawMessages : [];

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-success/10">
            <Inbox className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-xs sm:text-sm font-semibold truncate">{formatPhoneNumber(phoneNumber)}</p>
            <p className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
              <span className="flex h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Live · 15s
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 sm:h-8 gap-1 sm:gap-1.5 text-[10px] sm:text-xs px-2 sm:px-3"
            onClick={() => copyToClipboard(phoneNumber)}
          >
            <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">Copy</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={onClose} aria-label="Close inbox">
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-1.5 sm:gap-2 rounded-lg border border-warning/30 bg-warning/5 px-2.5 sm:px-3 py-1.5 sm:py-2">
        <AlertTriangle className="mt-0.5 h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-warning" aria-hidden />
        <p className="text-[10px] sm:text-xs text-muted-foreground">
          Public inbox — all incoming messages visible to anyone
        </p>
      </div>

      {/* Messages */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 sm:h-16 rounded-lg" />)}
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border border-dashed py-6 sm:py-10 text-center text-muted-foreground">
          <Inbox className="h-6 w-6 sm:h-8 sm:w-8 opacity-30" aria-hidden />
          <p className="text-xs sm:text-sm">No messages yet</p>
          <p className="text-[10px] sm:text-xs opacity-60">Auto-refresh every 15s</p>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((msg, i) => (
            <div
              key={i}
              className="rounded-lg border border-border/50 bg-card/80 p-2.5 sm:p-3 transition-colors hover:bg-card"
            >
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                    from {msg.sender || msg.from || 'Unknown'}
                  </p>
                  <p className="mt-0.5 break-all font-mono text-xs sm:text-sm">{msg.text || msg.message}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                  <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  {timeAgo(msg.date)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {dataUpdatedAt && (
        <p className="text-center text-[10px] sm:text-xs text-muted-foreground">
          Updated {timeAgo(new Date(dataUpdatedAt).toISOString())}
        </p>
      )}
    </div>
  );
}

/* ─── Country picker ──────────────────────────────────────────────────────── */

interface CountryItem {
  code: string;
  name: string;
}

interface CountryPickerProps {
  countries: CountryItem[];
  selected: string | null;
  onSelect: (code: string) => void;
  accentClass?: string;
  placeholder?: string;
  isLoading?: boolean;
}

function CountryPicker({
  countries,
  selected,
  onSelect,
  accentClass = 'border-primary ring-2 ring-primary/30 bg-primary/5',
  placeholder = 'Search countries…',
  isLoading,
  variant = 'grid',
}: CountryPickerProps & { variant?: 'grid' | 'list' }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return countries;
    return countries.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [countries, search]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Search countries"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isLoading ? (
        variant === 'list' ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
            {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        )
      ) : filtered.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No countries match &ldquo;{search}&rdquo;</p>
      ) : variant === 'list' ? (
        <ScrollArea className="h-[400px] sm:h-[500px] lg:h-[600px]">
          <div className="space-y-1 pr-3">
            {filtered.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => onSelect(c.code)}
                aria-pressed={selected === c.code}
                className={`group flex w-full items-center gap-2 sm:gap-3 rounded-lg border px-3 sm:px-4 py-2.5 sm:py-3 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selected === c.code
                    ? accentClass
                    : 'border-border hover:border-primary/30 hover:bg-muted/50'
                }`}
              >
                <CountryFlag code={c.code} name={c.name} className="h-5 w-6 sm:h-6 sm:w-8 shrink-0" />
                <p className="flex-1 text-xs sm:text-sm font-medium truncate">{c.name}</p>
                {selected === c.code && <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-success" />}
              </button>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <ScrollArea className="h-48 sm:h-72">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2 pr-3 md:grid-cols-6 lg:grid-cols-8">
            {filtered.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => onSelect(c.code)}
                aria-pressed={selected === c.code}
                className={`group rounded-lg sm:rounded-xl border p-2 sm:p-3 text-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selected === c.code
                    ? accentClass
                    : 'border-border hover:border-primary/30 hover:bg-muted/50 hover:scale-[1.02] sm:hover:scale-[1.04]'
                }`}
              >
                <CountryFlag code={c.code} name={c.name} className="mx-auto h-5 w-6 sm:h-7 sm:w-10" />
                <p className="mt-1 sm:mt-1.5 truncate text-[10px] sm:text-xs font-semibold leading-tight">{c.name}</p>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}

      {countries.length > 0 && (
        <p className="text-[10px] sm:text-xs text-muted-foreground">
          {filtered.length < countries.length
            ? `${filtered.length} of ${countries.length} countries`
            : `${countries.length} countries`}
        </p>
      )}
    </div>
  );
}

/* ─── Service card (private SMS) ─────────────────────────────────────────── */

function ServiceCard({
  svc,
  onSelect,
}: {
  svc: Service;
  onSelect: (svc: Service) => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const hasLogo = !!svc.features?.logoUrl && !imgFailed;

  return (
    <button
      type="button"
      onClick={() => onSelect(svc)}
      className="group block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
    >
      <Card interactive className="relative h-full rounded-2xl transition-all duration-200 group-hover:border-primary/30">
        {Boolean(svc.features?.popular) && (
          <span className="absolute -right-2 -top-2 z-10 rounded-full bg-warning px-2.5 py-1 text-[10px] font-bold text-warning-foreground shadow-sm">
            HOT
          </span>
        )}
        <CardContent className="flex flex-col gap-3 p-4">
          {/* Logo + name */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 transition-transform duration-200 group-hover:scale-110">
              {hasLogo ? (
                <img
                  src={String(svc.features!.logoUrl)}
                  alt={svc.name}
                  className="h-9 w-9 object-contain"
                  onError={() => setImgFailed(true)}
                />
              ) : (
                <PlatformIcon platform={svc.name} className="h-7 w-7" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold leading-tight">{svc.name}</p>
              {(svc.stockQuantity ?? 0) > 0 && (
                <p className="flex items-center gap-1 text-xs text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  {svc.stockQuantity?.toLocaleString()} available
                </p>
              )}
            </div>
          </div>

          <ServiceSpecs features={svc.features} limit={2} />

          {/* Price + CTA */}
          <div className="mt-auto flex items-end justify-between gap-2">
            <div>
              <p className="text-xl font-bold tabular-nums leading-none text-foreground">
                {formatCurrency(svc.customerPrice, svc.currency)}
              </p>
              <p className="text-xs text-muted-foreground">per activation</p>
            </div>
            <div className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-colors duration-150 group-hover:bg-primary group-hover:text-primary-foreground">
              Buy
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

/* ─── Purchase dialog ─────────────────────────────────────────────────────── */

function PurchaseDialog({
  service,
  countryCode,
  countryName,
  onClose,
}: {
  service: Service | null;
  countryCode: string | null;
  countryName: string | undefined;
  onClose: () => void;
}) {
  const createOrder = useCreateOrder();

  const handleBuy = () => {
    if (!service || !countryCode) return;
    createOrder.mutate(
      {
        serviceId: service.id,
        quantity: Math.max(1, service.customerMinQty || 1),
        customData: { country: countryCode },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open={!!service} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        {service && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
                  {service.features?.logoUrl ? (
                    <img
                      src={String(service.features.logoUrl)}
                      alt={service.name}
                      className="h-6 w-6 object-contain"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <span className="text-sm font-bold text-primary">
                      {service.name.charAt(0)}
                    </span>
                  )}
                </div>
                {service.name}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-1.5">
                {countryCode && (
                  <CountryFlag code={countryCode} name={countryName} className="h-4 w-6" />
                )}
                {countryName} · Private one-time SMS activation
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Price summary */}
              <div className="flex items-center justify-between rounded-xl bg-foreground px-5 py-4 text-background">
                <div>
                  <p className="text-xs font-medium opacity-50">Price</p>
                  <p className="text-3xl font-bold tabular-nums tracking-tight">
                    {formatCurrency(service.customerPrice, service.currency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium opacity-50">Delivery</p>
                  <p className="font-bold">{service.estimatedTime || 'Instant'}</p>
                </div>
              </div>

              <ServiceSpecs features={service.features} />

              <div className="flex items-start gap-2.5 rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                <span>
                  This number is exclusively yours for the activation. The SMS code goes only to you.
                  Funds are debited from your wallet.
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleBuy} disabled={createOrder.isPending || createOrder.isSuccess}>
                {createOrder.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : createOrder.isSuccess ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                {createOrder.isSuccess
                  ? 'Order placed!'
                  : `Buy for ${formatCurrency(service.customerPrice, service.currency)}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */

function NumbersPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /* ── URL-driven tab ── */
  const activeTab = (searchParams.get('tab') ?? 'free') as 'free' | 'private' | 'rental' | 'esim';
  const setActiveTab = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tab);
      params.delete('country');
      params.delete('service');
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  /* ── URL-driven country + service (for Private SMS tab) ── */
  const selectedCountry = searchParams.get('country');
  const setSelectedCountry = useCallback(
    (code: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (code) params.set('country', code); else params.delete('country');
      params.delete('service');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const selectedServiceId = searchParams.get('service');
  const setSelectedServiceId = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set('service', id); else params.delete('service');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  /* ── local state ── */
  const [freeSelectedCountry, setFreeSelectedCountry] = useState<string | null>(null);
  const [selectedFreeNumber, setSelectedFreeNumber] = useState<string | null>(null);
  const [purchaseTarget, setPurchaseTarget] = useState<Service | null>(null);
  const [serviceSearch, setServiceSearch] = useState('');

  /* ── data ── */
  const servicesQuery = useServices('NUMBER', 1000);
  const allNumbers: Service[] = servicesQuery.data?.services ?? [];

  const freeServices = allNumbers.filter((s) => s.subcategory === 'free_number');
  const privateServices = allNumbers.filter(
    (s) => s.subcategory === 'private_sms' || s.subcategory === 'rental' || s.subcategory === 'esim',
  );
  const rentalServices = privateServices.filter((s) => s.subcategory === 'rental');
  const esimServices = privateServices.filter((s) => s.subcategory === 'esim');

  /* ── free: country list ── */
  const freeCountries: CountryItem[] = useMemo(
    () =>
      freeServices
        .map((s) => ({
          id: s.id,
          code: (s.features?.isoCode as string) || s.countries?.[0]?.code || '',
          name: s.countries?.[0]?.name ?? s.name,
          countryCode: s.features?.countryCode as number,
        }))
        .filter((c) => c.code),
    [freeServices],
  );

  /* ── free: selected service from local state ── */
  const selectedFreeService = freeServices.find(
    (s) =>
      ((s.features?.isoCode as string) || s.countries?.[0]?.code || '') === freeSelectedCountry,
  ) ?? null;
  const freeCountryCode = selectedFreeService?.features?.countryCode as number | undefined;

  const {
    data: freeNumbers = [],
    isLoading: freeNumbersLoading,
    refetch: refetchFreeNumbers,
  } = useFreeNumbers(freeCountryCode ?? null);

  /* ── private: country list ── */
  const privateCountries: CountryItem[] = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of privateServices) {
      for (const c of s.countries ?? []) {
        if (c?.code && !seen.has(c.code)) seen.set(c.code, c.name || c.code);
      }
    }
    return Array.from(seen.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [privateServices]);

  // Keep stable refs to the country lists so the effect can read them
  // without re-running every time the list recomputes.
  const privateCountriesRef = useRef(privateCountries);
  privateCountriesRef.current = privateCountries;

  // Only auto-select a default for Private tab when tab changes AND no country is in URL.
  useEffect(() => {
    // Read searchParams directly inside the effect to get the freshest value.
    const currentCountry = searchParams.get('country');
    if (currentCountry) return; // user already has a country selected
    if (activeTab === 'private' && privateCountriesRef.current.length > 0) {
      setSelectedCountry(privateCountriesRef.current[0].code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]); // intentionally only fires on tab change

  /* ── filtered private services ── */
  const filteredPrivateServices = useMemo(() => {
    const q = serviceSearch.toLowerCase().trim();
    return privateServices.filter((s) => {
      const matchesCountry = !selectedCountry || serviceMatchesCountry(s, selectedCountry);
      const matchesSearch = !q || s.name.toLowerCase().includes(q);
      return matchesCountry && matchesSearch;
    });
  }, [privateServices, selectedCountry, serviceSearch]);

  const purchaseCountry = privateCountries.find((c) => c.code === selectedCountry);

  /* ── skeletons ── */
  const renderSkeletons = (n = 8) => (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="h-40 rounded-xl" />
      ))}
    </div>
  );

  return (
    <StaggerList className="space-y-6">
      <StaggerItem>
        <PageHeader
          title="Phone Numbers"
          description="Free shared numbers for quick lookups, or private numbers exclusively yours."
        />
      </StaggerItem>

      <StaggerItem>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">

        {/* ── Mobile: dropdown tab switcher ── */}
        <div className="sm:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full h-11 rounded-xl border-border bg-card font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">
                <div className="flex items-center gap-2">
                  <Unlock className="h-4 w-4 text-success" /> Free Numbers
                </div>
              </SelectItem>
              <SelectItem value="private">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" /> Private SMS
                </div>
              </SelectItem>
              <SelectItem value="rental">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-warning" /> Rentals
                </div>
              </SelectItem>
              <SelectItem value="esim">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-info" /> eSIM
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ── Desktop: tab bar ── */}
        <TabsList className="hidden sm:grid w-full grid-cols-4 lg:w-fit">
          <TabsTrigger value="free" className="gap-2">
            <Unlock className="h-4 w-4" />
            Free Numbers
          </TabsTrigger>
          <TabsTrigger value="private" className="gap-2">
            <Lock className="h-4 w-4" />
            Private SMS
          </TabsTrigger>
          <TabsTrigger value="rental" className="gap-2">
            <Phone className="h-4 w-4" />
            Rentals
          </TabsTrigger>
          <TabsTrigger value="esim" className="gap-2">
            <Smartphone className="h-4 w-4" />
            eSIM
          </TabsTrigger>
        </TabsList>

        {/* ── FREE NUMBERS ─────────────────────────────────────────────────── */}
        <TabsContent value="free" className="space-y-6">
          {/* Warning banner - full width at top */}
          <div className="flex items-start gap-2 sm:gap-3 rounded-xl border border-success/20 bg-success/5 p-3 sm:p-4">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-success/10">
              <Signal className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold">Free public numbers</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                Shared numbers — anyone can read incoming SMS. Great for quick verifications. Need privacy? Use Private SMS.
              </p>
            </div>
          </div>

          {/* Split-panel layout: country dropdown on mobile, list panel on desktop */}
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Mobile: compact country dropdown */}
            <div className="lg:hidden">
              <Select
                value={freeSelectedCountry ?? ''}
                onValueChange={(code) => { setFreeSelectedCountry(code); setSelectedFreeNumber(null); }}
              >
                <SelectTrigger className="w-full h-11 rounded-xl">
                  <div className="flex items-center gap-2">
                    {freeSelectedCountry ? (
                      <>
                        <CountryFlag code={freeSelectedCountry} name="" className="h-4 w-6 shrink-0" />
                        <SelectValue />
                      </>
                    ) : (
                      <SelectValue placeholder="Select a country…" />
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {freeCountries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <div className="flex items-center gap-2">
                        <CountryFlag code={c.code} name={c.name} className="h-4 w-6 shrink-0" />
                        <span>{c.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Desktop: left panel country list */}
            <div className="hidden lg:block w-80 shrink-0">
              <Card className="rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
                      <Globe className="h-4 w-4 text-success" aria-hidden />
                    </div>
                    Countries
                  </CardTitle>
                  <CardDescription>{freeCountries.length} with free numbers</CardDescription>
                </CardHeader>
                <CardContent>
                  <CountryPicker
                    key="free-picker"
                    countries={freeCountries}
                    selected={freeSelectedCountry}
                    onSelect={(code) => { setFreeSelectedCountry(code); setSelectedFreeNumber(null); }}
                    accentClass="border-success ring-2 ring-success/30 bg-success/5"
                    placeholder="Search countries…"
                    isLoading={servicesQuery.isLoading}
                    variant="list"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right panel: Number list and inbox */}
            <div className="flex-1 min-w-0 space-y-4">
              {selectedFreeService ? (
                <Card className="rounded-2xl">
                  <CardHeader className="pb-3 sm:pb-4">
                    <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-success/10">
                          <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success" aria-hidden />
                        </div>
                        <div>
                          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                            Available Numbers
                            {!freeNumbersLoading && (
                              <Badge variant="secondary" className="text-[10px] sm:text-xs">{freeNumbers.length} online</Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-xs sm:text-sm hidden sm:block">Tap a number to open its live inbox</CardDescription>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="gap-1.5 h-8 sm:h-9" onClick={() => refetchFreeNumbers()}>
                        <RefreshCw className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
                        <span className="text-xs">Refresh</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {freeNumbersLoading ? (
                      <div className="space-y-2">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
                      </div>
                    ) : freeNumbers.length === 0 ? (
                      <EmptyState
                        icon={Phone}
                        title="No free numbers available right now"
                        description="OnlineSIM's pool refreshes constantly try another country or check back shortly."
                      />
                    ) : (
                      <div className="space-y-2">
                        {freeNumbers.map((num, i) => {
                          const ph = (num.full_number ?? num.number ?? '').toString().trim();
                          const displayPh = ph ? formatPhoneNumber(ph) : '(unknown)';
                          const key = num.full_number ?? num.number ?? String(i);
                          const isActive = selectedFreeNumber === ph;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setSelectedFreeNumber(isActive ? null : ph)}
                              className={`group w-full rounded-lg sm:rounded-xl border p-3 sm:p-4 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                isActive
                                  ? 'border-success bg-success/8 ring-2 ring-success/20'
                                  : 'border-border hover:border-success/40 hover:bg-muted/40'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 sm:gap-3">
                                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                  <div className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl transition-transform duration-200 ${isActive ? 'bg-success/15 scale-110' : 'bg-muted group-hover:scale-105'}`}>
                                    <Phone className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isActive ? 'text-success' : 'text-muted-foreground'}`} aria-hidden />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-mono text-xs sm:text-sm font-bold break-all">{displayPh}</p>
                                    {num.updated_at && (
                                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                                        Last activity {timeAgo(num.updated_at)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
                                  <span className="flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-success" />
                                  Active
                                  <ChevronRight
                                    className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform duration-200 ${isActive ? 'rotate-90' : ''}`}
                                    aria-hidden
                                  />
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Inline inbox expands below the selected number */}
                    {selectedFreeNumber && (
                      <div className="rounded-lg border border-success/20 bg-success/5 p-3 sm:p-4">
                        <FreeNumberInbox
                          phoneNumber={selectedFreeNumber}
                          onClose={() => setSelectedFreeNumber(null)}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="rounded-2xl">
                  <CardContent className="py-12">
                    <EmptyState
                      icon={Globe}
                      title="Select a country to view numbers"
                      description="Choose a country from the list on the left to see available free numbers."
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── PRIVATE SMS ───────────────────────────────────────────────────── */}
        <TabsContent value="private" className="space-y-6">
          <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Lock className="h-4 w-4 text-primary" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold">Private activation numbers</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Numbers are exclusively yours. The SMS code goes only to you. Funds are debited from your wallet.
              </p>
            </div>
          </div>

          {/* Country picker */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Globe className="h-4 w-4 text-primary" aria-hidden />
                </div>
                1. Select Country
              </CardTitle>
              <CardDescription>{privateCountries.length} countries available</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Mobile: compact dropdown */}
              <div className="sm:hidden">
                <Select
                  value={selectedCountry ?? ''}
                  onValueChange={(code) => { setSelectedCountry(code); setServiceSearch(''); }}
                >
                  <SelectTrigger className="w-full h-11 rounded-xl">
                    <div className="flex items-center gap-2">
                      {selectedCountry ? (
                        <>
                          <CountryFlag code={selectedCountry} name="" className="h-4 w-6 shrink-0" />
                          <SelectValue />
                        </>
                      ) : (
                        <SelectValue placeholder="Select a country…" />
                      )}
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {privateCountries.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        <div className="flex items-center gap-2">
                          <CountryFlag code={c.code} name={c.name} className="h-4 w-6 shrink-0" />
                          <span>{c.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Desktop: full country grid */}
              <div className="hidden sm:block">
                <CountryPicker
                  key="private-picker"
                  countries={privateCountries}
                  selected={selectedCountry}
                  onSelect={(code) => {
                    setSelectedCountry(code);
                    setServiceSearch('');
                  }}
                  isLoading={servicesQuery.isLoading}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Phone className="h-4 w-4 text-primary" aria-hidden />
                  </div>
                  <div>
                    <CardTitle className="text-base">2. Select Service</CardTitle>
                    <CardDescription>
                      {selectedCountry
                        ? `${filteredPrivateServices.length} services in ${purchaseCountry?.name ?? selectedCountry}`
                        : 'Choose a country first'}
                    </CardDescription>
                  </div>
                </div>
                {/* Service search */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search services…"
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="pl-9"
                    aria-label="Search services"
                  />
                  {serviceSearch && (
                    <button
                      type="button"
                      onClick={() => setServiceSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {servicesQuery.isError ? (
                <ErrorState
                  error={servicesQuery.error}
                  title="Could not load services"
                  onRetry={() => servicesQuery.refetch()}
                />
              ) : servicesQuery.isLoading ? (
                renderSkeletons()
              ) : filteredPrivateServices.length === 0 ? (
                <EmptyState
                  icon={Phone}
                  title={serviceSearch ? `Nothing matched "${serviceSearch}"` : 'No services for this selection'}
                  description={serviceSearch ? 'Try a different search term.' : 'Try a different country our catalog syncs continuously.'}
                />
              ) : (
                <StaggerList className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {filteredPrivateServices.map((svc) => (
                    <StaggerItem key={svc.id}>
                      <ServiceCard svc={svc} onSelect={setPurchaseTarget} />
                    </StaggerItem>
                  ))}
                </StaggerList>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── RENTAL ───────────────────────────────────────────────────────── */}
        <TabsContent value="rental" className="space-y-6">
          {servicesQuery.isLoading ? (
            renderSkeletons(4)
          ) : rentalServices.length === 0 ? (
            <EmptyState
              icon={Phone}
              title="No rental plans available"
              description="Number rentals from our providers will appear here as soon as they are offered."
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Rental Plans</CardTitle>
                <CardDescription>Dedicated numbers for days or weeks</CardDescription>
              </CardHeader>
              <CardContent>
                <StaggerList className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {rentalServices.map((svc) => (
                    <StaggerItem key={svc.id}>
                      <ServiceCard svc={svc} onSelect={setPurchaseTarget} />
                    </StaggerItem>
                  ))}
                </StaggerList>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── ESIM ─────────────────────────────────────────────────────────── */}
        <TabsContent value="esim" className="space-y-6">
          {servicesQuery.isLoading ? (
            renderSkeletons(4)
          ) : esimServices.length === 0 ? (
            <EmptyState
              icon={Smartphone}
              title="No eSIM services available"
              description="Digital SIM cards for instant activation will appear here once a provider offers them."
              action={<Badge variant="secondary">Awaiting catalog</Badge>}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>eSIM Services</CardTitle>
                <CardDescription>Digital SIM cards for instant activation</CardDescription>
              </CardHeader>
              <CardContent>
                <StaggerList className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {esimServices.map((svc) => (
                    <StaggerItem key={svc.id}>
                      <ServiceCard svc={svc} onSelect={setPurchaseTarget} />
                    </StaggerItem>
                  ))}
                </StaggerList>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      </StaggerItem>

      {/* ── Purchase dialog (shared across all paid tabs) ─────────────────── */}
      <PurchaseDialog
        service={purchaseTarget}
        countryCode={selectedCountry}
        countryName={purchaseCountry?.name}
        onClose={() => setPurchaseTarget(null)}
      />
    </StaggerList>
  );
}

/* ─── Suspense shell (required for useSearchParams in Next.js) ────────────── */

export default function NumbersPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      }
    >
      <NumbersPageInner />
    </Suspense>
  );
}
