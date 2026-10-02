'use client';

import * as React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { RequireRole } from '@/components/auth/require-role';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAdminOrders, useUpdateOrderStatus } from '@/lib/admin-queries';
import { formatCompact, formatCurrency, formatRelativeTime } from '@/lib/format';
import { humanizeStatus, orderStatusVariant, variantForStatus } from '@/lib/status';
import type { AdminOrder } from '@/lib/types';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
] as const;

const EDITABLE_STATUSES = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
] as const;

export default function AdminOrdersPage() {
  return (
    <RequireRole>
      <AdminOrdersContent />
    </RequireRole>
  );
}

function AdminOrdersContent() {
  const { isAdmin } = useAuth();
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState('');
  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState<AdminOrder | null>(null);

  // Debounce so typing doesn't fire a request per keystroke.
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const ordersQuery = useAdminOrders({ page, limit: PAGE_SIZE, status, search });
  const data = ordersQuery.data;
  const orders = data?.orders ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const counts = data?.statusCounts ?? {};

  const selectStatus = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  if (ordersQuery.isError) {
    return <ErrorState error={ordersQuery.error} title="Could not load orders" onRetry={() => ordersQuery.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Every order across all customers, with per-status totals."
        actions={
          <>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Order #, email or service…"
                className="pl-9"
                aria-label="Search orders"
              />
            </div>
            <Select value={status || 'ALL'} onValueChange={(v) => selectStatus(v === 'ALL' ? '' : v)}>
              <SelectTrigger className="w-[150px]" aria-label="Filter by status">
                <SlidersHorizontal className="h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(counts).length > 0
                  ? ['ALL', ...Object.keys(counts)]
                  : ['ALL', ...EDITABLE_STATUSES]
                ).map((value) => (
                  <SelectItem key={value} value={value}>
                    {value === 'ALL' ? 'All statuses' : humanizeStatus(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => ordersQuery.refetch()} aria-label="Refresh">
              <RefreshCw className={cn('h-4 w-4', ordersQuery.isFetching && 'animate-spin')} />
            </Button>
          </>
        }
      />

      <div className="flex gap-1 overflow-x-auto border-b border-border/60 pb-px">
        {STATUS_TABS.map((tab) => {
          const count = tab.value ? counts[tab.value] : undefined;
          const active = status === tab.value;
          return (
            <button
              key={tab.value || 'all'}
              type="button"
              onClick={() => selectStatus(tab.value)}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
              {typeof count === 'number' && count > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                  {formatCompact(count)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {ordersQuery.isLoading ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 w-full animate-pulse rounded-md bg-muted/60" />
            ))}
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title={search || status ? 'No matching orders' : 'No orders yet'}
          description={
            search || status
              ? 'Nothing matched the current filters. Try clearing them.'
              : 'Orders will appear here as customers place them.'
          }
          action={
            search || status ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchInput('');
                  setStatus('');
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  {isAdmin && <TableHead className="text-right">Profit</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      <span className="font-mono text-xs">{order.orderNumber}</span>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate text-sm">{order.user?.email ?? '—'}</p>
                        {(order.user?.firstName || order.user?.lastName) && (
                          <p className="truncate text-xs text-muted-foreground">
                            {[order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ')}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate text-sm">{order.service?.name ?? '—'}</p>
                        {order.service?.platform && (
                          <p className="truncate text-xs text-muted-foreground">{order.service.platform}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {order.quantity.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(order.totalAmount, order.currency)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right tabular-nums text-emerald-500">
                        {formatCurrency(order.profit, order.currency)}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant={variantForStatus(order.status, orderStatusVariant)}>
                        {humanizeStatus(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatRelativeTime(order.createdAt)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setSelected(order)}>
                          Update
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            {total.toLocaleString()} {total === 1 ? 'order' : 'orders'}
            {ordersQuery.isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <span className="tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {isAdmin && (
        <UpdateStatusDialog
          order={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function UpdateStatusDialog({ order, onClose }: { order: AdminOrder | null; onClose: () => void }) {
  const [status, setStatus] = React.useState('');
  const [reason, setReason] = React.useState('');
  const update = useUpdateOrderStatus();

  // Reset the form whenever a different order is opened.
  React.useEffect(() => {
    if (order) {
      setStatus(order.status);
      setReason('');
    }
  }, [order]);

  const submit = () => {
    if (!order || !status) return;
    update.mutate(
      { id: order.id, status, reason: reason.trim() || undefined },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update order status</DialogTitle>
          <DialogDescription>
            {order?.orderNumber} · {order?.user?.email ?? 'unknown customer'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="order-status">
              New status
            </label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="order-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {EDITABLE_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {humanizeStatus(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="order-reason">
              Reason <span className="font-normal text-muted-foreground">(recorded in audit log)</span>
            </label>
            <Textarea
              id="order-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this status changing?"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={update.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={update.isPending || status === order?.status}>
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
