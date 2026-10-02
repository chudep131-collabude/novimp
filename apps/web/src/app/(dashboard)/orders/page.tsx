'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightIcon,
  Package,
  Loader2,
} from 'lucide-react';
import { useOrders } from '@/lib/queries';
import { formatCurrency, formatDate } from '@/lib/format';
import { orderStatusVariant, variantForStatus, humanizeStatus } from '@/lib/status';
import type { Order } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { StaggerList, StaggerItem } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const PAGE_SIZE = 10;

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isFetching, isError, error, refetch } = useOrders({
    page,
    limit: PAGE_SIZE,
    search,
  });

  const orders: Order[] = data?.orders ?? data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Track and manage every order across your services."
        actions={
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by order # or service..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
              aria-label="Search orders"
            />
          </div>
        }
      />

      {isError ? (
        <ErrorState error={error} title="Could not load orders" onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title={search ? 'No matching orders' : 'No orders yet'}
          description={
            search
              ? `Nothing matched "${search}". Try a different order number or service.`
              : 'Your orders will appear here once you place one.'
          }
          action={
            search ? (
              <Button variant="outline" size="sm" onClick={() => setSearchInput('')}>
                Clear search
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {total.toLocaleString()} {total === 1 ? 'order' : 'orders'}
              {isFetching && <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />}
            </span>
          </div>

          <StaggerList className="space-y-3">
            {orders.map((order) => (
              <StaggerItem key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                >
                  <Card interactive className="rounded-xl">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex flex-1 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-200 group-hover:scale-110">
                            <ShoppingCart className="h-5 w-5 text-primary" aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-sm">{order.orderNumber}</p>
                              <Badge variant={variantForStatus(order.status, orderStatusVariant)}>
                                {humanizeStatus(order.status)}
                              </Badge>
                            </div>
                            <p className="truncate text-sm text-muted-foreground">
                              {order.service?.name || 'Service'} · {order.service?.category || 'General'}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Qty {order.quantity} · {formatDate(order.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <div className="text-left sm:text-right">
                            <p className="text-base font-semibold tabular-nums sm:text-lg">
                              {formatCurrency(order.totalAmount, order.currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">{order.currency || 'USD'}</p>
                          </div>
                          <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </StaggerItem>
            ))}
          </StaggerList>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isFetching}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isFetching}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
