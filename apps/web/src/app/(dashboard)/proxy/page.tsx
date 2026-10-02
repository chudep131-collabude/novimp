'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Check as CheckIcon,
  ChevronsUpDown,
  Globe,
  Smartphone,
  ShoppingCart,
  Loader2,
  Check,
  MapPin,
  Clock,
} from 'lucide-react';
import { useServices, useCreateOrder, useProxyTariffs } from '@/lib/queries';
import { formatCurrency } from '@/lib/format';
import type { Service } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ServiceSpecs } from '@/components/service-specs';
import { CountryFlag } from '@/components/country-flag';
import { StaggerList, StaggerItem } from '@/components/motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Presentation metadata keyed by provider `subcategory`.
 */
const TYPE_META: Record<
  string,
  { icon: typeof Globe; color: string; iconColor: string; bgIcon: string; blurb: string }
> = {
  // ProxySeller subcategories
  mobile: {
    icon: Smartphone,
    color: 'bg-gradient-to-br from-amber-500/10 to-orange-500/10',
    iconColor: 'text-warning',
    bgIcon: 'bg-warning/10',
    blurb: 'Real 4G/5G SIM-based mobile proxies. Unlimited bandwidth.',
  },
  ipv4: {
    icon: Globe,
    color: 'bg-info/5',
    iconColor: 'text-info',
    bgIcon: 'bg-info/10',
    blurb: 'Dedicated IPv4 datacenter proxies. Fast and cost-effective.',
  },
  isp: {
    icon: Globe,
    color: 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10',
    iconColor: 'text-success',
    bgIcon: 'bg-success/10',
    blurb: 'Static residential IPs. ISP legitimacy at datacenter speed.',
  },
  ipv6: {
    icon: Globe,
    color: 'bg-muted/30',
    iconColor: 'text-muted-foreground',
    bgIcon: 'bg-muted',
    blurb: 'High-volume IPv6 proxies at the lowest per-IP price.',
  },
  // Legacy OnlineProxy subcategories (kept for backward compat)
  private: {
    icon: Smartphone,
    color: 'bg-gradient-to-br from-amber-500/10 to-orange-500/10',
    iconColor: 'text-warning',
    bgIcon: 'bg-warning/10',
    blurb: 'A dedicated mobile proxy with full IP control',
  },
  shared: {
    icon: Globe,
    color: 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10',
    iconColor: 'text-success',
    bgIcon: 'bg-success/10',
    blurb: 'A shared mobile proxy with automatic IP rotation',
  },
};

const DEFAULT_TYPE_META = {
  icon: Globe,
  color: 'bg-muted/50',
  iconColor: 'text-muted-foreground',
  bgIcon: 'bg-muted',
  blurb: 'Proxy service',
};

interface ProxyType {
  id: string;
  name: string;
  description: string;
  icon: typeof Globe;
  color: string;
  iconColor: string;
  bgIcon: string;
}

export default function ProxyPage() {
  const reduceMotion = useReducedMotion();
  const { data, isLoading, isError, error, refetch } = useServices('PROXY', 100);
  const createOrder = useCreateOrder();

  const services: Service[] = data?.services ?? [];

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [protocol, setProtocol] = useState<'http' | 'socks5'>('http');
  const [duration, setDuration] = useState<number | null>(null);
  const countrySearchRef = useRef<HTMLInputElement>(null);

  // Every distinct provider subcategory becomes a selectable type.
  const proxyTypes = useMemo<ProxyType[]>(() => {
    const seen = new Map<string, ProxyType>();
    for (const s of services) {
      const id = s.subcategory || s.id;
      if (seen.has(id)) continue;
      const meta = TYPE_META[id] ?? DEFAULT_TYPE_META;
      seen.set(id, {
        id,
        name: s.name,
        description: s.description || meta.blurb,
        icon: meta.icon,
        color: meta.color,
        iconColor: meta.iconColor,
        bgIcon: meta.bgIcon,
      });
    }
    return Array.from(seen.values());
  }, [services]);

  // Map subcategory → its first service so each type card can show its own specs.
  const serviceByType = useMemo<Map<string, Service>>(() => {
    const map = new Map<string, Service>();
    for (const s of services) {
      const id = s.subcategory || s.id;
      if (!map.has(id)) map.set(id, s);
    }
    return map;
  }, [services]);

  // Auto-select the first available type once the catalog loads.
  useEffect(() => {
    if (!selectedType && proxyTypes.length > 0) {
      setSelectedType(proxyTypes[0].id);
    }
  }, [proxyTypes, selectedType]);

  // IPv6 only supports HTTP reset protocol if the user switches to it.
  useEffect(() => {
    if (selectedType === 'ipv6' && protocol === 'socks5') {
      setProtocol('http');
    }
  }, [selectedType, protocol]);

  // Service matched by subcategory only used for countries list and specs display.
  const serviceForType = useMemo(
    () => services.find((s) => s.subcategory === selectedType) ?? null,
    [services, selectedType],
  );

  // Service matched by subcategory + protocol used when placing an order.
  // ProxySeller stores `features.protocols` as a string array; fall back to
  // `features.protocol` (singular) for legacy providers.
  const service = useMemo(() => {
    return (
      services.find(
        (s) =>
          s.subcategory === selectedType &&
          ((s.features?.protocol as string | undefined)?.toLowerCase() === protocol.toLowerCase() ||
            (Array.isArray(s.features?.protocols) &&
              (s.features.protocols as string[]).some(
                (p) => p.toLowerCase() === protocol.toLowerCase(),
              ))),
      ) ??
      // If no exact protocol match, fall back to the type service so ordering
      // still works (protocol is sent as customData).
      serviceForType
    );
  }, [services, selectedType, protocol, serviceForType]);

  const selectedProxy = proxyTypes.find((p) => p.id === selectedType) ?? null;

  // Countries come from the provider catalog for the selected type.
  const countries = useMemo(() => {
    const list = serviceForType?.countries ?? [];
    return list.map((c) => ({ code: c.code, name: c.name }));
  }, [serviceForType]);

  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) return countries;
    return countries.filter(
      (country) =>
        country.name.toLowerCase().includes(query) || country.code.toLowerCase().includes(query)
    );
  }, [countries, countrySearch]);
  const selectedCountryInfo = countries.find((country) => country.code === selectedCountry);

  useEffect(() => {
    if (countries.length > 0 && !countries.some((c) => c.code === selectedCountry)) {
      setSelectedCountry(countries[0].code);
    }
  }, [countries, selectedCountry]);

  const tariffQuery = useProxyTariffs({
    countryCode: selectedCountry,
    proxyType: selectedType,
    protocol,
  });
  const tariffs = tariffQuery.data?.tariffs ?? [];
  const selectedTariff = tariffs.find((tariff) => tariff.period === duration) ?? null;
  const totalPrice = selectedTariff?.price ?? 0;

  useEffect(() => {
    if (tariffs.length > 0 && !tariffs.some((tariff) => tariff.period === duration)) {
      setDuration(tariffs[0].period);
    }
  }, [tariffs, duration]);

  const handlePurchase = () => {
    if (!service || !selectedCountry || !selectedTariff) return;
    createOrder.mutate({
      serviceId: service.id,
      quantity: 1,
      customData: {
        countryCode: selectedCountry,
        durationDays: selectedTariff.period,
        proxyType: selectedType,
        protocol,
      },
    });
  };

  return (
    <StaggerList className="space-y-8">
      <StaggerItem>
        <PageHeader
          title="Proxy Services"
          description="Choose a private or shared mobile proxy by country, protocol, and rental period."
        />
      </StaggerItem>

      <StaggerItem>
        {isError ? (
          <ErrorState error={error} title="Could not load proxy catalog" onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-lg" />
            ))}
          </div>
        ) : proxyTypes.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="No proxy services available"
            description="Our catalog syncs continuously check back shortly."
          />
        ) : (
          <div className="space-y-6">
            {/* Proxy Types */}
          <StaggerList className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {proxyTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;
              return (
                <StaggerItem key={type.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedType(type.id)}
                    aria-pressed={isSelected}
                    className="group block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
                  >
                    <Card
                      interactive
                      className={`h-full rounded-2xl transition-all duration-200 ${
                        isSelected
                          ? `ring-2 ring-primary border-primary/40 ${type.color}`
                          : 'hover:border-primary/20'
                      }`}
                    >
                      <CardContent className="p-5">
                        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${type.bgIcon} transition-transform duration-200 group-hover:scale-110`}>
                          <Icon className={`h-6 w-6 ${type.iconColor}`} aria-hidden />
                        </div>
                        <h3 className="mb-1 font-bold">{type.name}</h3>
                        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                          {type.description}
                        </p>
                        <ServiceSpecs features={serviceByType.get(type.id)?.features} limit={3} />
                        {isSelected && (
                          <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            Selected
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </button>
                </StaggerItem>
              );
            })}
          </StaggerList>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Configure Proxy</CardTitle>
                <CardDescription>Select your preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <MapPin className="h-4 w-4" />
                    Country
                    <span className="text-xs font-normal text-muted-foreground">
                      ({countries.length} available)
                    </span>
                  </label>
                  <Popover.Root open={countryPickerOpen} onOpenChange={setCountryPickerOpen}>
                    <Popover.Trigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={countryPickerOpen}
                        aria-label="Choose proxy country"
                        className="w-full justify-between"
                        disabled={countries.length === 0}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {selectedCountryInfo ? (
                            <CountryFlag
                              code={selectedCountryInfo.code}
                              name={selectedCountryInfo.name}
                              className="h-4 w-6 shrink-0"
                            />
                          ) : (
                            <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate">
                            {selectedCountryInfo?.name ?? 'Select a country'}
                          </span>
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Content
                        align="start"
                        sideOffset={4}
                        onOpenAutoFocus={(event) => {
                          event.preventDefault();
                          countrySearchRef.current?.focus();
                        }}
                        className="z-50 w-[var(--radix-popover-trigger-width)] rounded-lg border bg-popover p-0 text-popover-foreground shadow-lg"
                      >
                        <div className="border-b p-2">
                          <Input
                            ref={countrySearchRef}
                            value={countrySearch}
                            onChange={(event) => setCountrySearch(event.target.value)}
                            placeholder="Search by country or code"
                            aria-label="Search countries"
                          />
                        </div>
                        <div
                          role="listbox"
                          aria-label="Available countries"
                          className="max-h-64 overflow-y-auto p-1"
                        >
                          <AnimatePresence initial={false}>
                            {filteredCountries.map((country) => (
                              <motion.button
                                key={country.code}
                                type="button"
                                role="option"
                                aria-selected={selectedCountry === country.code}
                                onClick={() => {
                                  setSelectedCountry(country.code);
                                  setCountryPickerOpen(false);
                                  setCountrySearch('');
                                }}
                                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                                transition={{ duration: 0.14 }}
                                className="flex min-h-10 w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm outline-none hover:bg-accent focus:bg-accent"
                              >
                                <CountryFlag
                                  code={country.code}
                                  name={country.name}
                                  className="h-4 w-6 shrink-0"
                                />
                                <span className="min-w-0 flex-1 truncate">{country.name}</span>
                                <span className="text-xs text-muted-foreground">{country.code}</span>
                                {selectedCountry === country.code && (
                                  <CheckIcon className="h-4 w-4 shrink-0" />
                                )}
                              </motion.button>
                            ))}
                          </AnimatePresence>
                          {filteredCountries.length === 0 && (
                            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                              No matching countries
                            </p>
                          )}
                        </div>
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Protocol</label>
                  <div className="flex gap-2" role="group" aria-label="Proxy protocol">
                    {(['http', 'socks5'] as const).map((value) => {
                      const unsupported = value === 'socks5' && selectedType === 'ipv6';
                      return (
                        <Button
                          key={value}
                          type="button"
                          variant={protocol === value ? 'default' : 'outline'}
                          onClick={() => setProtocol(value)}
                          aria-pressed={protocol === value}
                          disabled={unsupported}
                          title={unsupported ? 'IPv6 proxies only support HTTP' : undefined}
                          className="flex-1"
                        >
                          {value.toUpperCase()}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="h-4 w-4" />
                      Duration
                    </label>
                    <span className="text-sm font-semibold">
                      {duration ? `${duration} days` : '—'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tariffs.map(({ period }) => (
                      <Button
                        key={period}
                        type="button"
                        variant={duration === period ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDuration(period)}
                        className="min-w-12 flex-1"
                      >
                        {period}d
                      </Button>
                    ))}
                  </div>
                  {tariffQuery.isLoading && <Skeleton className="h-9 w-full" />}
                  {tariffQuery.isError && (
                    <p className="text-sm text-destructive">
                      Could not load live prices. Try again shortly.
                    </p>
                  )}
                  {!tariffQuery.isLoading && !tariffQuery.isError && tariffs.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No proxy offers match these options.
                    </p>
                  )}
                </div>

                {serviceForType && <ServiceSpecs features={serviceForType.features} />}
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card className="h-fit rounded-2xl overflow-hidden">
              <div className="h-2 brand-gradient-strong" />
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {[
                    { label: 'Type',     value: selectedProxy?.name ?? '—' },
                    { label: 'Protocol', value: protocol.toUpperCase() },
                    { label: 'Duration', value: duration ? `${duration} days` : '—' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5">
                      <span className="text-xs text-muted-foreground">{row.label}</span>
                      <span className="text-sm font-semibold">{row.value}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5">
                    <span className="text-xs text-muted-foreground">Country</span>
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <CountryFlag
                        code={selectedCountry}
                        name={countries.find((c) => c.code === selectedCountry)?.name}
                        className="h-4 w-6"
                      />
                      {countries.find((c) => c.code === selectedCountry)?.name ?? '—'}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/20 px-4 py-4">
                  <p className="text-xs text-muted-foreground">Total</p>
                  {isLoading || tariffQuery.isLoading ? (
                    <Skeleton className="mt-1 h-10 w-28" />
                  ) : (
                    <AnimatePresence mode="wait" initial={false}>
                      {selectedTariff ? (
                        <motion.p
                          key={`${selectedCountry}-${selectedType}-${protocol}-${duration}-${totalPrice}`}
                          initial={reduceMotion ? false : { opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={reduceMotion ? undefined : { opacity: 0, y: -5 }}
                          transition={{ duration: 0.16 }}
                          className="text-3xl font-bold tabular-nums tracking-tight text-foreground"
                        >
                          {formatCurrency(totalPrice, tariffQuery.data?.currency)}
                        </motion.p>
                      ) : (
                        <motion.p key="no-price" className="text-3xl font-bold tabular-nums tracking-tight text-muted-foreground">
                          —
                        </motion.p>
                      )}
                    </AnimatePresence>
                  )}
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePurchase}
                  disabled={
                    !service || !selectedCountry || !selectedTariff ||
                    createOrder.isPending || isLoading ||
                    tariffQuery.isLoading || tariffQuery.isError
                  }
                >
                  {createOrder.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : createOrder.isSuccess ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <ShoppingCart className="mr-2 h-4 w-4" />
                  )}
                  {createOrder.isSuccess ? 'Order placed' : 'Purchase Proxy'}
                </Button>
              </CardContent>
            </Card>
          </div>
          </div>
      )}
      </StaggerItem>
    </StaggerList>
  );
}
