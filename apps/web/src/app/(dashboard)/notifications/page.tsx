'use client';

import Link from 'next/link';
import {
  Bell,
  Info,
  AlertTriangle,
  Wrench,
  Megaphone,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { useAnnouncements, useOrders } from '@/lib/queries';
import { formatRelativeTime } from '@/lib/format';
import { humanizeStatus } from '@/lib/status';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StaggerList, StaggerItem } from '@/components/motion';
import { cn } from '@/lib/utils';
import type { Announcement } from '@/lib/types';

/* ── Announcement type config ─────────────────────────────────── */
const ANN_CONFIG = {
  INFO:        { icon: Info,          bg: 'bg-info/10',        text: 'text-info',        border: 'border-info/20',        label: 'Info' },
  WARNING:     { icon: AlertTriangle, bg: 'bg-warning/10',     text: 'text-warning',     border: 'border-warning/20',     label: 'Notice' },
  MAINTENANCE: { icon: Wrench,        bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20', label: 'Maintenance' },
  PROMOTION:   { icon: Megaphone,     bg: 'bg-success/10',     text: 'text-success',     border: 'border-success/20',     label: 'Promotion' },
} as const;

/* ── Order status config ──────────────────────────────────────── */
function orderIcon(status: string) {
  if (status === 'COMPLETED') return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (status === 'FAILED' || status === 'CANCELLED') return <XCircle className="h-4 w-4 text-destructive" />;
  if (status === 'PROCESSING') return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

/* ── Page ─────────────────────────────────────────────────────── */
export default function NotificationsPage() {
  const announcements = useAnnouncements();
  const orders = useOrders({ page: 1, limit: 20 });

  const anns: Announcement[] = announcements.data ?? [];
  const recentOrders = orders.data?.orders ?? [];

  // Build a unified notification list sorted by time
  type NotifItem =
    | { kind: 'announcement'; data: Announcement; time: string }
    | { kind: 'order'; data: (typeof recentOrders)[number]; time: string };

  const items: NotifItem[] = [
    ...anns.map((a) => ({ kind: 'announcement' as const, data: a, time: a.createdAt })),
    ...recentOrders.map((o) => ({ kind: 'order' as const, data: o, time: o.createdAt })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const isLoading = announcements.isLoading || orders.isLoading;

  return (
    <StaggerList className="space-y-6">
      <StaggerItem>
        <PageHeader
          title="Notifications"
          description="Platform announcements and your recent order activity."
          actions={
            <Button
              variant="outline"
              size="icon"
              onClick={() => { announcements.refetch(); orders.refetch(); }}
              aria-label="Refresh"
            >
              <RefreshCw
                className={cn(
                  'h-4 w-4',
                  (announcements.isFetching || orders.isFetching) && 'animate-spin',
                )}
              />
            </Button>
          }
        />
      </StaggerItem>

      <StaggerItem>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            description="Platform announcements and order updates will appear here."
          />
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => {
              if (item.kind === 'announcement') {
                const cfg = ANN_CONFIG[item.data.type] ?? ANN_CONFIG.INFO;
                const Icon = cfg.icon;
                return (
                  <Card key={`ann-${item.data.id}`} className={cn('border', cfg.border)}>
                    <CardContent className="flex items-start gap-4 p-4">
                      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', cfg.bg)}>
                        <Icon className={cn('h-5 w-5', cfg.text)} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Badge variant="outline" className={cn('text-[10px] h-5', cfg.text)}>
                            {cfg.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatRelativeTime(item.data.createdAt)}</span>
                        </div>
                        <p className="text-sm font-semibold">{item.data.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.data.content}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              // Order item
              const order = item.data;
              return (
                <Link key={`order-${order.id}`} href={`/orders/${order.id}`}>
                  <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                    <CardContent className="flex items-start gap-4 p-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Zap className="h-5 w-5 text-primary" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px] h-5">Order</Badge>
                          <span className="text-xs text-muted-foreground">{formatRelativeTime(order.createdAt)}</span>
                        </div>
                        <p className="text-sm font-semibold truncate">
                          {order.service?.name ?? order.orderNumber}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {orderIcon(order.status)}
                          <span className="text-xs text-muted-foreground">
                            {humanizeStatus(order.status)} · {order.orderNumber}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </StaggerItem>
    </StaggerList>
  );
}
