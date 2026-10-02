'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  DollarSign,
  Landmark,
  PiggyBank,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { RequireRole } from '@/components/auth/require-role';
import { StatCard } from '@/components/dashboard/stat-card';
import { ErrorState } from '@/components/error-state';
import { FadeIn, StaggerItem, StaggerList } from '@/components/motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCompact, formatCurrency, toNumber } from '@/lib/format';
import { ADMIN_ROLES } from '@/lib/types';
import { useAdminDashboard, useAdminRevenue, useAdminOrderTrends } from '@/lib/admin-queries';

export default function AdminDashboardPage() {
  return (
    <RequireRole allow={[...ADMIN_ROLES, 'FINANCE']}>
      <AdminDashboardContent />
    </RequireRole>
  );
}

function AdminDashboardContent() {
  const { isAdmin, isSupport, user } = useAuth();
  const useAuth_isFinance = user?.role === 'FINANCE';
  const statsQuery = useAdminDashboard();
  const revenueQuery = useAdminRevenue('daily', 30);
  const trendsQuery = useAdminOrderTrends(30);

  const stats = statsQuery.data;

  const chartData = React.useMemo(
    () =>
      (revenueQuery.data ?? []).map((p) => ({
        date: p.date.slice(5),
        revenue: p.revenue,
        profit: p.profit,
      })),
    [revenueQuery.data],
  );

  if (statsQuery.isError) {
    return <ErrorState error={statsQuery.error} onRetry={() => statsQuery.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <StaggerList className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            label="Total revenue"
            icon={DollarSign}
            href="/admin/orders"
            footer={
              stats ? (
                <span>
                  {formatCurrency(stats.revenue.today)} today ·{' '}
                  {formatCurrency(stats.revenue.thisMonth)} this month
                </span>
              ) : (
                <Skeleton className="h-4 w-40" />
              )
            }
          >
            {stats ? formatCurrency(stats.revenue.total) : <Skeleton className="h-8 w-28" />}
          </StatCard>
        </StaggerItem>

        <StaggerItem>
          <StatCard
            label="Gross profit"
            icon={TrendingUp}
            accent="bg-emerald-500/10 text-emerald-500"
            footer={
              stats ? (
                <span>
                  Margin{' '}
                  {toNumber(stats.revenue.total) > 0
                    ? `${((toNumber(stats.profit) / toNumber(stats.revenue.total)) * 100).toFixed(1)}%`
                    : '—'}
                </span>
              ) : (
                <Skeleton className="h-4 w-24" />
              )
            }
          >
            {stats ? formatCurrency(stats.profit) : <Skeleton className="h-8 w-28" />}
          </StatCard>
        </StaggerItem>

        <StaggerItem>
          <StatCard
            label="Orders"
            icon={Activity}
            href="/admin/orders"
            footer={
              stats ? (
                <span>
                  {stats.orders.pending} pending · {stats.orders.failed} failed
                </span>
              ) : (
                <Skeleton className="h-4 w-32" />
              )
            }
          >
            {stats ? formatCompact(stats.orders.total) : <Skeleton className="h-8 w-20" />}
          </StatCard>
        </StaggerItem>

        <StaggerItem>
          <StatCard
            label="Wallet liability"
            icon={Wallet}
            accent="bg-amber-500/10 text-amber-500"
            footer={
              stats ? (
                <span>Customer funds held across all wallets</span>
              ) : (
                <Skeleton className="h-4 w-40" />
              )
            }
          >
            {stats ? formatCurrency(stats.walletLiability) : <Skeleton className="h-8 w-28" />}
          </StatCard>
        </StaggerItem>
      </StaggerList>

      <div className="grid gap-4 lg:grid-cols-3">
        <FadeIn className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue & profit</CardTitle>
              <CardDescription>Last 30 days, completed orders</CardDescription>
            </CardHeader>
            <CardContent>
              {revenueQuery.isLoading ? (
                <Skeleton className="h-[260px] w-full" />
              ) : chartData.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  No completed orders in this period.
                </p>
              ) : (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="adminRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="adminProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(160 84% 45%)" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="hsl(160 84% 45%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        stroke="hsl(var(--muted-foreground))"
                        minTickGap={24}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        width={48}
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(v: number) => formatCompact(v)}
                      />
                      <RTooltip
                        cursor={{ stroke: 'hsl(var(--border))' }}
                        contentStyle={{
                          background: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 10,
                          fontSize: 12,
                        }}
                        formatter={(v: number, name: string) => [formatCurrency(v), name]}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="hsl(217 91% 60%)"
                        fill="url(#adminRevenue)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        name="Profit"
                        stroke="hsl(160 84% 45%)"
                        fill="url(#adminProfit)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Order status</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {trendsQuery.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))
              ) : (trendsQuery.data ?? []).length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No orders yet.</p>
              ) : (
                trendsQuery.data?.map((t) => (
                  <div
                    key={t.status}
                    className="flex items-center justify-between rounded-lg bg-accent/40 px-3 py-2 text-sm"
                  >
                    <span className="font-medium capitalize text-muted-foreground">
                      {t.status.toLowerCase()}
                    </span>
                    <span className="font-semibold tabular-nums">{t.count}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FadeIn>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Top services</CardTitle>
              <CardDescription>By revenue this month</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {statsQuery.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))
              ) : (stats?.popularServices ?? []).length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No sales yet.</p>
              ) : (
                stats?.popularServices.map((s, i) => (
                  <div key={s.serviceId} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.orders} orders · {formatCompact(s.quantity)} units
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCurrency(s.revenue)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Top customers</CardTitle>
              <CardDescription>By spend this month</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {statsQuery.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))
              ) : (stats?.bestCustomers ?? []).length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No customers yet.</p>
              ) : (
                stats?.bestCustomers.map((c, i) => (
                  <div key={c.userId} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-xs font-semibold text-amber-500">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name || c.email}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCurrency(c.spent)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {isAdmin && (
        <FadeIn>
          <Card className="overflow-hidden border-border/30 bg-surface-1/50 backdrop-blur-sm">
            <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/40">
              <Link href="/admin/users" className="group p-6 sm:p-8 hover:bg-surface-2/50 transition-colors">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4 transition-transform group-hover:scale-110">
                  <Users className="h-5 w-5" />
                </span>
                <p className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">Users</p>
                <p className="text-sm text-muted-foreground/80 leading-relaxed">
                  {stats ? `${formatCompact(stats.users.total)} total registered users on the platform.` : 'Manage registered users on the platform.'}
                </p>
              </Link>
              <Link href="/admin/providers" className="group p-6 sm:p-8 hover:bg-surface-2/50 transition-colors">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 mb-4 transition-transform group-hover:scale-110">
                  <PiggyBank className="h-5 w-5" />
                </span>
                <p className="text-lg font-bold text-foreground mb-2 group-hover:text-emerald-500 transition-colors">Providers</p>
                <p className="text-sm text-muted-foreground/80 leading-relaxed">Monitor synchronization status and overall performance of integrated providers.</p>
              </Link>
              <Link href="/admin/audit-logs" className="group p-6 sm:p-8 hover:bg-surface-2/50 transition-colors">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 mb-4 transition-transform group-hover:scale-110">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <p className="text-lg font-bold text-foreground mb-2 group-hover:text-amber-500 transition-colors">Audit logs</p>
                <p className="text-sm text-muted-foreground/80 leading-relaxed">Review privileged actions and monitor security events across the system.</p>
              </Link>
            </div>
          </Card>
        </FadeIn>
      )}

      {/* Deposits quick-nav  visible to ADMIN and FINANCE roles */}
      {(isAdmin || useAuth_isFinance) && (
        <FadeIn>
          <Link href="/admin/deposits" className="block">
            <Card interactive>
              <CardContent className="flex items-center gap-4 p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Landmark className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-medium">Deposits</p>
                  <p className="text-xs text-muted-foreground">Finance review queue</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </FadeIn>
      )}

      {stats?.orders.failed ? (
        <FadeIn>
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{stats.orders.failed}</span> failed orders
              require attention.
            </span>
            <Link href="/admin/orders" className="ml-auto font-medium text-primary hover:underline">
              Review
            </Link>
          </div>
        </FadeIn>
      ) : null}
    </div>
  );
}
