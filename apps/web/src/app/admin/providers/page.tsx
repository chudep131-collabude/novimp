'use client';

import * as React from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Server,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { RequireRole } from '@/components/auth/require-role';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useAdminProviders,
  useProviderPerformance,
  useSyncProvider,
  useToggleProvider,
} from '@/lib/admin-queries';
import { formatCompact, formatCurrency, formatPercent, formatRelativeTime } from '@/lib/format';
import type { AdminProvider, ProviderPerformance } from '@/lib/types';
import { cn } from '@/lib/utils';

const STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
  ACTIVE: 'success',
  PAUSED: 'warning',
  DEGRADED: 'warning',
  ERROR: 'destructive',
  DISABLED: 'secondary',
};

export default function AdminProvidersPage() {
  return (
    <RequireRole allow={['ADMIN', 'SUPER_ADMIN', 'SUPPORT']}>
      <AdminProvidersContent />
    </RequireRole>
  );
}

function AdminProvidersContent() {
  const { isAdmin } = useAuth();
  const providersQuery = useAdminProviders();
  const performanceQuery = useProviderPerformance();
  const toggle = useToggleProvider();
  const sync = useSyncProvider();

  const providers = providersQuery.data ?? [];
  const performance = performanceQuery.data ?? [];

  if (providersQuery.isError) {
    return (
      <ErrorState
        error={providersQuery.error}
        title="Could not load providers"
        onRetry={() => providersQuery.refetch()}
      />
    );
  }

  const healthy = providers.filter((p) => p.status === 'ACTIVE').length;
  const degraded = providers.filter((p) => p.status !== 'ACTIVE').length;
  const totalServices = providers.reduce((sum, p) => sum + (p._count?.services ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Providers"
        description="Upstream supplier health, catalog size and sync controls."
        actions={
          <Button variant="outline" size="icon" onClick={() => providersQuery.refetch()} aria-label="Refresh">
            <RefreshCw className={cn('h-4 w-4', providersQuery.isFetching && 'animate-spin')} />
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Healthy"
          icon={CheckCircle2}
          accent="bg-emerald-500/10 text-emerald-500"
          footer={<span>{providers.length} configured</span>}
        >
          {providersQuery.isLoading ? <Skeleton className="h-8 w-16" /> : healthy}
        </StatCard>
        <StatCard
          label="Needs attention"
          icon={AlertTriangle}
          accent="bg-amber-500/10 text-amber-500"
          footer={<span>Paused, degraded or errored</span>}
        >
          {providersQuery.isLoading ? <Skeleton className="h-8 w-16" /> : degraded}
        </StatCard>
        <StatCard
          label="Catalogued services"
          icon={Server}
          footer={<span>Across all providers</span>}
        >
          {providersQuery.isLoading ? <Skeleton className="h-8 w-20" /> : formatCompact(totalServices)}
        </StatCard>
      </div>

      {providersQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-6">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : providers.length === 0 ? (
        <EmptyState
          icon={Server}
          title="No providers configured"
          description="Set the provider API keys in your .env file and restart the server."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              performance={performance.find((p) => p.id === provider.id)}
              canManage={isAdmin}
              onToggle={(action) => toggle.mutate({ id: provider.id, action })}
              onSync={() => sync.mutate(provider.id)}
              toggling={toggle.isPending && toggle.variables?.id === provider.id}
              syncing={sync.isPending && sync.variables === provider.id}
            />
          ))}
        </div>
      )}

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Provider performance</CardTitle>
            <CardDescription>Completed vs failed orders over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {performanceQuery.isLoading ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : performance.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">No order activity yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">Services</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Success rate</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performance.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{p.displayName}</p>
                          <p className="text-xs text-muted-foreground">{p.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{p.serviceCount}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.orderCount}
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({p.completedOrders}/{p.failedOrders})
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Progress
                            value={Math.min(100, Math.max(0, p.successRate))}
                            className="h-1.5 w-16"
                          />
                          <span className="w-12 text-right text-xs tabular-nums">
                            {formatPercent(p.successRate)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(p.revenue)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-500">
                        {formatCurrency(p.profit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ProviderCard({
  provider,
  performance,
  canManage,
  onToggle,
  onSync,
  toggling,
  syncing,
}: {
  provider: AdminProvider;
  performance?: ProviderPerformance;
  canManage: boolean;
  onToggle: (action: 'pause' | 'resume') => void;
  onSync: () => void;
  toggling: boolean;
  syncing: boolean;
}) {
  const isPaused = provider.status === 'PAUSED' || provider.status === 'DISABLED';

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="truncate text-base">{provider.displayName}</CardTitle>
          <CardDescription className="truncate">
            {provider.name} · {provider.adapterType}
          </CardDescription>
        </div>
        <Badge variant={STATUS_VARIANT[provider.status] ?? 'secondary'}>{provider.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Services</p>
            <p className="font-medium tabular-nums">{provider._count?.services ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="font-medium tabular-nums">
              {provider.balance ? formatCurrency(provider.balance, provider.currency ?? 'USD') : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg response</p>
            <p className="font-medium tabular-nums">
              {provider.avgResponseMs ? `${provider.avgResponseMs} ms` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last sync</p>
            <p className="font-medium">
              {provider.lastSyncAt ? formatRelativeTime(provider.lastSyncAt) : 'Never'}
            </p>
          </div>
        </div>

        {performance && performance.orderCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-accent/40 px-3 py-2 text-xs">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-muted-foreground">
              {performance.completedOrders} completed · {performance.failedOrders} failed ·{' '}
              {formatPercent(performance.successRate)} success
            </span>
          </div>
        )}

        {provider.consecutiveFailures > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs">
            <Activity className="h-3.5 w-3.5 shrink-0 text-destructive" />
            <span className="text-muted-foreground">
              {provider.consecutiveFailures} consecutive failures
            </span>
          </div>
        )}

        {provider.lastSyncError && (
          <p className="line-clamp-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {provider.lastSyncError}
          </p>
        )}

        {canManage && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onToggle(isPaused ? 'resume' : 'pause')}
              disabled={toggling || syncing}
            >
              {toggling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPaused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={onSync} disabled={toggling || syncing}>
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
