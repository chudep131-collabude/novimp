'use client';

import * as React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  Wallet,
  XCircle,
} from 'lucide-react';
import { RequireRole } from '@/components/auth/require-role';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Badge, type BadgeProps } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminDeposits, useApproveDeposit, useRejectDeposit } from '@/lib/admin-queries';
import { formatCurrency, formatRelativeTime, toNumber } from '@/lib/format';
import { humanizeStatus } from '@/lib/status';
import type { AdminDeposit } from '@/lib/types';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

/**
 * Tabs. The first tab (Needs review) sends needsReview=true to the API so it
 * returns only deposits that require manual action  not all deposits.
 */
const STATUS_TABS = [
  { value: '', label: 'Needs review', needsReview: true },
  { value: 'PENDING', label: 'Pending', needsReview: false },
  { value: 'CONFIRMING', label: 'Confirming', needsReview: false },
  { value: 'UNDERPAID', label: 'Underpaid', needsReview: false },
  { value: 'OVERPAID', label: 'Overpaid', needsReview: false },
  { value: 'MANUAL_REVIEW', label: 'Manual review', needsReview: false },
  { value: 'COMPLETED', label: 'Completed', needsReview: false },
  { value: 'FAILED', label: 'Failed', needsReview: false },
] as const;

const STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
  PENDING: 'warning',
  CONFIRMING: 'info',
  UNDERPAID: 'warning',
  OVERPAID: 'warning',
  MANUAL_REVIEW: 'info',
  COMPLETED: 'success',
  FAILED: 'destructive',
  CANCELLED: 'secondary',
};

/** Statuses where no action is possible. */
const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);

export default function AdminDepositsPage() {
  return (
    <RequireRole allow={['ADMIN', 'SUPER_ADMIN', 'FINANCE']}>
      <AdminDepositsContent />
    </RequireRole>
  );
}

function AdminDepositsContent() {
  const [page, setPage] = React.useState(1);
  const [activeTab, setActiveTab] = React.useState(0); // index into STATUS_TABS
  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [approving, setApproving] = React.useState<AdminDeposit | null>(null);
  const [rejecting, setRejecting] = React.useState<AdminDeposit | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const tab = STATUS_TABS[activeTab];

  const depositsQuery = useAdminDeposits({
    page,
    limit: PAGE_SIZE,
    status: tab.value || undefined,
    needsReview: tab.needsReview ? true : undefined,
    search,
  });

  const data = depositsQuery.data;
  const deposits = data?.deposits ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const queueValue = React.useMemo(
    () => deposits.reduce((sum, d) => sum + toNumber(d.amount), 0),
    [deposits],
  );

  const selectTab = (index: number) => {
    setActiveTab(index);
    setPage(1);
  };

  if (depositsQuery.isError) {
    return (
      <ErrorState
        error={depositsQuery.error}
        title="Could not load deposits"
        onRetry={() => depositsQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deposits"
        description="Finance review queue for deposits that require manual verification."
        actions={
          <>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Customer email…"
                className="pl-9"
                aria-label="Search deposits by email"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => depositsQuery.refetch()}
              aria-label="Refresh"
            >
              <RefreshCw className={cn('h-4 w-4', depositsQuery.isFetching && 'animate-spin')} />
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Awaiting review"
          icon={Clock}
          accent="bg-amber-500/10 text-amber-500"
          footer={<span>On this page</span>}
        >
          {depositsQuery.isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            deposits.filter((d) => !TERMINAL_STATUSES.has(d.status)).length
          )}
        </StatCard>
        <StatCard label="Queue value" icon={Wallet} footer={<span>On this page</span>}>
          {depositsQuery.isLoading ? <Skeleton className="h-8 w-28" /> : formatCurrency(queueValue)}
        </StatCard>
        <StatCard
          label="Matched deposits"
          icon={CheckCircle2}
          accent="bg-emerald-500/10 text-emerald-500"
          footer={<span>Total results for this filter</span>}
        >
          {depositsQuery.isLoading ? <Skeleton className="h-8 w-20" /> : total.toLocaleString()}
        </StatCard>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border/60 pb-px">
        {STATUS_TABS.map((t, i) => (
          <button
            key={t.value || 'queue'}
            type="button"
            onClick={() => selectTab(i)}
            className={cn(
              'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              activeTab === i
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {depositsQuery.isLoading ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : deposits.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing to review"
          description={
            tab.needsReview
              ? 'No deposits need manual verification right now.'
              : 'No deposits match this status.'
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Review notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deposits.map((deposit) => {
                  const isTerminal = TERMINAL_STATUSES.has(deposit.status);
                  return (
                    <TableRow key={deposit.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate text-sm">
                            {deposit.user?.email ?? deposit.userId}
                          </p>
                          {(deposit.user?.firstName || deposit.user?.lastName) && (
                            <p className="truncate text-xs text-muted-foreground">
                              {[deposit.user?.firstName, deposit.user?.lastName]
                                .filter(Boolean)
                                .join(' ')}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(deposit.amount, deposit.currency)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {deposit.paymentMethod ?? humanizeStatus(deposit.gateway)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={STATUS_VARIANT[deposit.status] ?? 'secondary'}>
                            {humanizeStatus(deposit.status)}
                          </Badge>
                          {deposit.requiresReview && (
                            <AlertTriangle
                              className="h-3.5 w-3.5 text-amber-500"
                              aria-label="Requires review"
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatRelativeTime(deposit.createdAt)}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
                        {deposit.reviewNotes ?? deposit.reviewReason ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isTerminal}
                            onClick={() => setApproving(deposit)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isTerminal}
                            className="text-destructive hover:border-destructive/40 hover:bg-destructive/5"
                            onClick={() => setRejecting(deposit)}
                          >
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            {total.toLocaleString()} {total === 1 ? 'deposit' : 'deposits'}
            {depositsQuery.isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
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

      <ApproveDepositDialog deposit={approving} onClose={() => setApproving(null)} />
      <RejectDepositDialog deposit={rejecting} onClose={() => setRejecting(null)} />
    </div>
  );
}

function ApproveDepositDialog({
  deposit,
  onClose,
}: {
  deposit: AdminDeposit | null;
  onClose: () => void;
}) {
  const [notes, setNotes] = React.useState('');
  const approve = useApproveDeposit();

  React.useEffect(() => {
    if (deposit) setNotes('');
  }, [deposit]);

  const submit = () => {
    if (!deposit) return;
    approve.mutate({ id: deposit.id, notes: notes.trim() || undefined }, { onSuccess: onClose });
  };

  return (
    <Dialog open={!!deposit} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve deposit</DialogTitle>
          <DialogDescription>
            This credits the customer wallet immediately and is recorded in the audit log.
          </DialogDescription>
        </DialogHeader>

        {deposit && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-accent/40 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {deposit.user?.email ?? deposit.userId}
                </p>
                <p className="text-xs text-muted-foreground">
                  {deposit.paymentMethod ?? humanizeStatus(deposit.gateway)} ·{' '}
                  {humanizeStatus(deposit.status)}
                </p>
              </div>
              <span className="shrink-0 text-lg font-semibold tabular-nums">
                {formatCurrency(deposit.amount, deposit.currency)}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="approve-notes">
                Notes <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="approve-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reference, reconciliation detail…"
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={approve.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={approve.isPending}>
            {approve.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Approve &amp; credit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDepositDialog({
  deposit,
  onClose,
}: {
  deposit: AdminDeposit | null;
  onClose: () => void;
}) {
  const [reason, setReason] = React.useState('');
  const reject = useRejectDeposit();

  React.useEffect(() => {
    if (deposit) setReason('');
  }, [deposit]);

  const submit = () => {
    if (!deposit || !reason.trim()) return;
    reject.mutate({ id: deposit.id, reason: reason.trim() }, { onSuccess: onClose });
  };

  return (
    <Dialog open={!!deposit} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject deposit</DialogTitle>
          <DialogDescription>
            The deposit will be marked as Failed. Provide a reason  it is stored in the audit log
            and shown to the finance team.
          </DialogDescription>
        </DialogHeader>

        {deposit && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-destructive/5 border border-destructive/20 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {deposit.user?.email ?? deposit.userId}
                </p>
                <p className="text-xs text-muted-foreground">
                  {deposit.paymentMethod ?? humanizeStatus(deposit.gateway)}
                </p>
              </div>
              <span className="shrink-0 text-lg font-semibold tabular-nums text-destructive">
                {formatCurrency(deposit.amount, deposit.currency)}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reject-reason">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reject-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe why this deposit is being rejected…"
                rows={3}
                aria-required
              />
              {reason.length === 0 && (
                <p className="text-xs text-muted-foreground">A reason is required to reject.</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={reject.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={reject.isPending || !reason.trim()}
          >
            {reject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reject deposit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
