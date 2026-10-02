'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  Network,
  Info,
  AtSign,
  Smartphone,
  BarChart3,
  ClipboardList,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Flame,
  TrendingUp,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedCount, AnimatedCurrency } from '@/components/ui/animated-number';
import { StaggerItem, StaggerList } from '@/components/motion';
import { SpendChart, StatusChart } from '@/components/dashboard/charts';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PlatformIcon } from '@/components/platform-icon';
import { useOrders, useOrderStats, useWallet, useAnnouncements } from '@/lib/queries';
import { formatCurrency, formatRelativeTime } from '@/lib/format';
import { humanizeStatus } from '@/lib/status';
import type { Order, Service } from '@/lib/types';
import { cn } from '@/lib/utils';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const SERVICES = [
  {
    label: 'SMM Panel',
    sub: 'Instagram · TikTok · YouTube',
    href: '/smm',
    icon: BarChart3,
    iconBg: 'bg-primary/15',
    iconColor: 'text-primary',
  },
  {
    label: 'Proxies',
    sub: 'IPv4 · IPv6 · ISP · Mobile',
    href: '/proxy',
    icon: Network,
    iconBg: 'bg-info/15',
    iconColor: 'text-info',
  },
  {
    label: 'Phone Numbers',
    sub: 'Virtual · Free inbox',
    href: '/numbers',
    icon: Smartphone,
    iconBg: 'bg-warning/15',
    iconColor: 'text-warning',
  },
  {
    label: 'Temp Email',
    sub: 'Disposable mailboxes',
    href: '/email',
    icon: AtSign,
    iconBg: 'bg-success/15',
    iconColor: 'text-success',
  },
];

import { useAuth } from '@/components/auth/auth-provider';

/* ── Popular picks — curated by demand signal, not by price ────────
   We score each in-stock service by:
   - keyword match (Instagram likes, Twitter likes, etc. score highest)
   - middle of price range (not cheapest = low quality, not priciest = niche)
   - high max qty signals volume demand
   We pick the top match per "slot" to guarantee category diversity.
─────────────────────────────────────────────────────────────────── */

interface PopularSlot {
  label: string;
  /** Keywords to match against service name (lower-case). Any match wins. */
  keywords: string[];
  /** Which category API to query */
  category: 'SMM' | 'PROXY' | 'NUMBER';
  href: string;
  /** Platform string passed to PlatformIcon */
  platform?: string;
  accent: string;
}

const POPULAR_SLOTS: PopularSlot[] = [
  {
    label: 'Instagram Likes',
    keywords: ['instagram', 'like'],
    category: 'SMM',
    href: '/smm?platform=Instagram',
    platform: 'Instagram',
    accent: 'bg-primary/10 text-primary',
  },
  {
    label: 'Instagram Followers',
    keywords: ['instagram', 'follower'],
    category: 'SMM',
    href: '/smm?platform=Instagram',
    platform: 'Instagram',
    accent: 'bg-primary/10 text-primary',
  },
  {
    label: 'TikTok Likes',
    keywords: ['tiktok', 'tik tok', 'like'],
    category: 'SMM',
    href: '/smm?platform=TikTok',
    platform: 'TikTok',
    accent: 'bg-foreground/8 text-foreground',
  },
  {
    label: 'TikTok Followers',
    keywords: ['tiktok', 'follower'],
    category: 'SMM',
    href: '/smm?platform=TikTok',
    platform: 'TikTok',
    accent: 'bg-foreground/8 text-foreground',
  },
  {
    label: 'Facebook Likes',
    keywords: ['facebook', 'like'],
    category: 'SMM',
    href: '/smm?platform=Facebook',
    platform: 'Facebook',
    accent: 'bg-info/10 text-info',
  },
  {
    label: 'X / Twitter Likes',
    keywords: ['twitter', 'x like', 'tweet like'],
    category: 'SMM',
    href: '/smm?platform=Twitter',
    platform: 'Twitter',
    accent: 'bg-foreground/8 text-foreground',
  },
  {
    label: 'YouTube Views',
    keywords: ['youtube', 'view'],
    category: 'SMM',
    href: '/smm?platform=YouTube',
    platform: 'YouTube',
    accent: 'bg-destructive/10 text-destructive',
  },
  {
    label: 'Telegram Members',
    keywords: ['telegram', 'member'],
    category: 'SMM',
    href: '/smm?platform=Telegram',
    platform: 'Telegram',
    accent: 'bg-info/10 text-info',
  },
  {
    label: 'Spotify Streams',
    keywords: ['spotify', 'stream', 'play'],
    category: 'SMM',
    href: '/smm?platform=Spotify',
    platform: 'Spotify',
    accent: 'bg-success/10 text-success',
  },
  {
    label: 'Twitch Followers',
    keywords: ['twitch', 'follower'],
    category: 'SMM',
    href: '/smm?platform=Twitch',
    platform: 'Twitch',
    accent: 'bg-primary/10 text-primary',
  },
];

/** Score a service for a slot — kept for future use */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _scoreService(svc: Service, slot: PopularSlot): number {
  const name = svc.name.toLowerCase();
  const keywordMatch = slot.keywords.some((kw) => name.includes(kw));
  if (!keywordMatch) return -1;
  const price = parseFloat(svc.customerPrice);
  if (price < 0.001) return -1;
  const priceScore = price >= 0.001 && price <= 0.5 ? 1 : 0;
  const maxQty = svc.customerMaxQty ?? 0;
  const qtyScore = maxQty >= 1000 ? 2 : maxQty >= 100 ? 1 : 0;
  return priceScore + qtyScore + (keywordMatch ? 3 : 0);
}

function StatusDot({ status }: { status: string }) {
  if (status === 'COMPLETED')
    return <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden />;
  if (status === 'FAILED' || status === 'CANCELLED')
    return <XCircle className="h-3.5 w-3.5 text-destructive" aria-hidden />;
  if (status === 'PROCESSING')
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />;
  return <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />;
}

export default function HomePage() {
  const { user } = useAuth();
  const wallet   = useWallet();
  const stats    = useOrderStats();
  const recent   = useOrders({ page: 1, limit: 6 });
  const announce = useAnnouncements();

  const orders: Order[] = recent.data?.orders ?? [];
  const firstName = user?.firstName ?? user?.email?.split('@')[0] ?? 'there';  const statusCounts = {
    PENDING:    stats.data?.pending    ?? 0,
    COMPLETED:  stats.data?.completed  ?? 0,
    FAILED:     stats.data?.failed     ?? 0,
    PROCESSING: stats.data?.processing ?? 0,
  };

  return (
    <StaggerList className="space-y-5">

      {/* ── Announcements ──────────────────────────────────────────────── */}
      {(announce.data ?? []).length > 0 && (
        <StaggerItem>
          {announce.data!.map((a) => {
            const C: Record<string, string> = {
              INFO:        'border-info/30 bg-info/8 text-info',
              WARNING:     'border-warning/30 bg-warning/8 text-warning',
              MAINTENANCE: 'border-destructive/30 bg-destructive/8 text-destructive',
              PROMOTION:   'border-success/30 bg-success/8 text-success',
            };
            return (
              <div key={a.id} className={cn('mb-2 flex items-start gap-3 rounded-xl border px-4 py-3', C[a.type] ?? C.INFO)}>
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div>
                  <p className="text-sm font-semibold">{a.title}</p>
                  <p className="text-xs opacity-75 mt-0.5">{a.content}</p>
                </div>
              </div>
            );
          })}
        </StaggerItem>
      )}

      {/* ── Layout ──────────────────────────────────────────────────────── */}
      <StaggerItem>
        <div className="space-y-4">

          {/* Balance card — always first, full width */}
          <div className="relative overflow-hidden rounded-2xl brand-gradient-strong p-5 text-white sm:p-6">
            <div
              className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)' }}
            />
            <p className="text-sm font-medium text-white/75">
              {greeting()},{' '}
              <span className="font-bold text-white">{firstName}</span>
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-white/60">
              Available balance
            </p>
            <div className="mt-1 flex items-end gap-2">
              {wallet.isLoading ? (
                <div className="h-12 w-40 animate-pulse rounded-lg bg-white/20" />
              ) : (
                <>
                  <span className="text-[42px] font-bold leading-none tabular-nums tracking-tight sm:text-[52px]">
                    <AnimatedCurrency value={wallet.data?.balance ?? 0} currency={wallet.data?.currency} />
                  </span>
                  <span className="mb-1 text-sm font-semibold text-white/70">
                    {wallet.data?.currency ?? 'USD'}
                  </span>
                </>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <Button asChild size="sm" className="flex-1 border-0 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30">
                <Link href="/wallet">
                  <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Deposit
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="flex-1 border-white/30 bg-transparent text-white hover:bg-white/15 hover:text-white">
                <Link href="/orders">
                  <TrendingUp className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Orders
                </Link>
              </Button>
            </div>
          </div>

          {/* Stat cards — 3 across on all sizes */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: 'Total', value: stats.data?.total ?? 0, sub: `${stats.data?.completed ?? 0} done`, icon: ClipboardList, iconBg: 'bg-primary/15', iconColor: 'text-primary' },
              { label: 'Active', value: stats.data?.processing ?? 0, sub: 'in progress', icon: Loader2, iconBg: 'bg-warning/15', iconColor: 'text-warning' },
              { label: 'Pending', value: stats.data?.pending ?? 0, sub: 'awaiting', icon: Clock, iconBg: 'bg-info/15', iconColor: 'text-info' },
            ].map((m) => (
              <Card key={m.label}>
                <CardContent className="p-3">
                  <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">{m.label}</p>
                  <div className="mt-1.5 text-xl font-bold tabular-nums sm:text-2xl">
                    {stats.isLoading ? <Skeleton className="h-7 w-8" /> : <AnimatedCount value={m.value} />}
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{m.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Services grid — 2×2 on mobile, row on desktop */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {SERVICES.map((svc) => {
              const Icon = svc.icon;
              return (
                <Link
                  key={svc.href}
                  href={svc.href}
                  className="group flex flex-col items-center gap-2.5 rounded-2xl bg-card px-3 py-4 text-center lift"
                >
                  <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl icon-3d', svc.iconBg)}>
                    <Icon className={cn('h-5 w-5', svc.iconColor)} aria-hidden />
                  </span>
                  <div>
                    <p className="text-xs font-semibold leading-tight">{svc.label}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground leading-tight">{svc.sub}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Error */}
          {(recent.isError || stats.isError) && (
            <ErrorState
              error={recent.error ?? stats.error}
              title="Could not load dashboard data"
              onRetry={() => { recent.refetch(); stats.refetch(); }}
            />
          )}

          {/* Popular right now */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="h-3.5 w-3.5 text-primary" aria-hidden />
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
                  Popular Right Now
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground">Most ordered this week</span>
            </div>

            {/* Horizontal scroll strip */}
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none" style={{ scrollSnapType: 'x mandatory' }}>
              {POPULAR_SLOTS.map((slot) => (
                <PopularPickCard key={slot.label} slot={slot} />
              ))}
            </div>
          </div>

          {/* Recent orders */}
          <Card>
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-5">
              <div>
                <p className="text-sm font-semibold">Recent Orders</p>
                <p className="text-xs text-muted-foreground">Your latest activity</p>
              </div>
              <Button variant="ghost" size="sm" asChild className="h-8 gap-1 text-xs text-primary">
                <Link href="/orders">
                  View all <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
            </div>

            {recent.isLoading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                    <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-36" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="px-5 py-8">
                <EmptyState
                  icon={ClipboardList}
                  title="No orders yet"
                  description="Browse our services to get started"
                  action={<Button asChild size="sm"><Link href="/smm">Browse Services</Link></Button>}
                />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2 sm:px-5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                      <Zap className="h-4 w-4 text-primary" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{order.service?.name || order.orderNumber}</p>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <StatusDot status={order.status} />
                        {humanizeStatus(order.status)} · {formatRelativeTime(order.createdAt)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatCurrency(order.totalAmount, order.currency)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Charts — below the fold on mobile, side by side on sm+ */}
          <div className="grid gap-3 sm:grid-cols-2">
            <SpendChart orders={orders} isLoading={recent.isLoading} />
            <StatusChart counts={statusCounts} isLoading={stats.isLoading} total={stats.data?.total ?? 0} />
          </div>

        </div>
      </StaggerItem>
    </StaggerList>
  );
}

/* ── PopularPickCard ──────────────────────────────────────────── */

function PopularPickCard({
  slot,
}: {
  slot: PopularSlot;
}) {
  return (
    <Link
      href={slot.href}
      className="group flex w-36 shrink-0 flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card px-3 py-4 text-center transition-all hover:border-primary/40 hover:bg-surface-2 active:scale-[0.97]"
      style={{ scrollSnapAlign: 'start' }}
    >
      <span className={cn(
        'flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-110',
        slot.accent,
      )}>
        {slot.platform ? (
          <PlatformIcon platform={slot.platform} className="h-7 w-7" />
        ) : slot.category === 'PROXY' ? (
          <Network className="h-5 w-5" aria-hidden />
        ) : (
          <Smartphone className="h-5 w-5" aria-hidden />
        )}
      </span>
      <p className="text-xs font-semibold leading-tight text-foreground">{slot.label}</p>
    </Link>
  );
}
