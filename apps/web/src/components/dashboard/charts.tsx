'use client';

import * as React from 'react';
import {
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
} from 'recharts';
import { useReducedMotion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, toNumber } from '@/lib/format';
import type { Order } from '@/lib/types';

const STATUS_FILL: Record<string, string> = {
  COMPLETED: 'hsl(160 84% 45%)',
  PENDING: 'hsl(38 92% 55%)',
  PROCESSING: 'hsl(199 89% 48%)',
  FAILED: 'hsl(0 84% 60%)',
};

const STATUS_LEGEND = [
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'FAILED', label: 'Failed' },
];

interface SpendChartProps {
  orders: Order[] | undefined;
  isLoading: boolean;
}

/** 7-day spend bar chart built from recent orders. */
export function SpendChart({ orders, isLoading }: SpendChartProps) {
  const reduce = useReducedMotion();

  const data = React.useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      return { date: d, label: d.toLocaleDateString('en-US', { weekday: 'short' }), total: 0 };
    });

    for (const order of orders ?? []) {
      const created = new Date(order.createdAt);
      created.setHours(0, 0, 0, 0);
      const bucket = days.find((day) => day.date.getTime() === created.getTime());
      if (bucket) bucket.total += toNumber(order.totalAmount);
    }
    return days;
  }, [orders]);

  const hasSpend = data.some((d) => d.total > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spend · last 7 days</CardTitle>
        <CardDescription>Based on your recent orders</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : !hasSpend ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            No spending in the last 7 days
          </div>
        ) : (
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <RTooltip
                  cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Spend']}
                />
                <Bar
                  dataKey="total"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={!reduce}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface StatusChartProps {
  counts: Record<string, number>;
  isLoading: boolean;
  total: number;
}

/** Order status distribution donut with a compact legend. */
export function StatusChart({ counts, isLoading, total }: StatusChartProps) {
  const reduce = useReducedMotion();
  const data = STATUS_LEGEND.map((s) => ({
    name: s.label,
    key: s.key,
    value: counts[s.key] ?? 0,
  })).filter((d) => d.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order status</CardTitle>
        <CardDescription>{total} orders all-time</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            No order data yet
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="h-[160px] w-[160px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                    isAnimationActive={!reduce}
                    stroke="none"
                  >
                    {data.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_FILL[entry.key] ?? 'hsl(var(--muted))'} />
                    ))}
                  </Pie>
                  <RTooltip
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex-1 space-y-2">
              {data.map((entry) => (
                <li key={entry.key} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: STATUS_FILL[entry.key] ?? 'hsl(var(--muted))' }}
                      aria-hidden
                    />
                    {entry.name}
                  </span>
                  <span className="font-medium tabular-nums">{entry.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
