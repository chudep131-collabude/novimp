'use client';

import * as React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { RequireRole } from '@/components/auth/require-role';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  useAdminUsers,
  useAdminUserStats,
  useUpdateUserStatus,
  useUpdateUserRole,
  useAdminUserDetail,
  useAdminUserTransactions,
  useAdminUserOrders,
  useAdminAdjustWallet,
} from '@/lib/admin-queries';
import {
  formatCompact,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  toNumber,
} from '@/lib/format';
import { humanizeStatus, orderStatusVariant, variantForStatus } from '@/lib/status';
import type { AdminUser, AdminUserDetail, AdminOrder, UserRole, WalletAdjustmentType, Transaction } from '@/lib/types';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

const ROLE_VARIANT: Record<UserRole, BadgeProps['variant']> = {
  CUSTOMER: 'secondary',
  SUPPORT: 'info',
  FINANCE: 'info',
  ADMIN: 'warning',
  SUPER_ADMIN: 'destructive',
};

const STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
  ACTIVE: 'success',
  PENDING_VERIFICATION: 'warning',
  SUSPENDED: 'destructive',
  BANNED: 'destructive',
  DEACTIVATED: 'secondary',
};

const ASSIGNABLE_ROLES: UserRole[] = ['CUSTOMER', 'SUPPORT', 'FINANCE', 'ADMIN'];

export default function AdminUsersPage() {
  return (
    <RequireRole allow={['ADMIN', 'SUPER_ADMIN', 'SUPPORT']}>
      <AdminUsersContent />
    </RequireRole>
  );
}

function AdminUsersContent() {
  const { isAdmin, user: me } = useAuth();
  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [detailUserId, setDetailUserId] = React.useState<string | null>(null);
  const [adjustTarget, setAdjustTarget] = React.useState<AdminUser | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const usersQuery = useAdminUsers({ page, limit: PAGE_SIZE, search });
  const statsQuery = useAdminUserStats();
  const updateStatus = useUpdateUserStatus();
  const updateRole = useUpdateUserRole();

  const data = usersQuery.data;
  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const stats = statsQuery.data;

  if (usersQuery.isError) {
    return (
      <ErrorState
        error={usersQuery.error}
        title="Could not load users"
        onRetry={() => usersQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Search accounts and manage role, status, and wallet balances."
        actions={
          <>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Name or email…"
                className="pl-9"
                aria-label="Search users"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => usersQuery.refetch()}
              aria-label="Refresh"
            >
              <RefreshCw className={cn('h-4 w-4', usersQuery.isFetching && 'animate-spin')} />
            </Button>
          </>
        }
      />

      {isAdmin && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total users"
            icon={Users}
            footer={stats ? <span>{stats.active} active</span> : <Skeleton className="h-4 w-24" />}
          >
            {stats ? formatCompact(stats.total) : <Skeleton className="h-8 w-20" />}
          </StatCard>
          <StatCard
            label="New today"
            icon={UserPlus}
            accent="bg-emerald-500/10 text-emerald-500"
            footer={<span>Joined in the last 24h</span>}
          >
            {stats ? formatCompact(stats.newToday) : <Skeleton className="h-8 w-20" />}
          </StatCard>
          <StatCard
            label="Active"
            icon={UserCheck}
            accent="bg-blue-500/10 text-blue-500"
            footer={
              stats ? (
                <span>
                  {stats.total > 0 ? `${((stats.active / stats.total) * 100).toFixed(0)}% of base` : '—'}
                </span>
              ) : (
                <Skeleton className="h-4 w-24" />
              )
            }
          >
            {stats ? formatCompact(stats.active) : <Skeleton className="h-8 w-20" />}
          </StatCard>
          <StatCard
            label="Staff accounts"
            icon={ShieldCheck}
            accent="bg-primary/10 text-primary"
            footer={<span>Admin, support &amp; finance</span>}
          >
            {stats ? (
              formatCompact(
                stats.byRole
                  .filter((r) => r.role !== 'CUSTOMER')
                  .reduce((sum, r) => sum + r.count, 0),
              )
            ) : (
              <Skeleton className="h-8 w-20" />
            )}
          </StatCard>
        </div>
      )}

      {isAdmin && stats && stats.byRole.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap gap-2 p-4">
            {stats.byRole.map((entry) => (
              <span
                key={entry.role}
                className="flex items-center gap-2 rounded-lg bg-accent/40 px-3 py-1.5 text-sm"
              >
                <Badge variant={ROLE_VARIANT[entry.role] ?? 'secondary'}>
                  {humanizeStatus(entry.role)}
                </Badge>
                <span className="font-semibold tabular-nums">{entry.count}</span>
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      {usersQuery.isLoading ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 w-full animate-pulse rounded-md bg-muted/60" />
            ))}
          </CardContent>
        </Card>
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'No matching users' : 'No users yet'}
          description={
            search
              ? `Nothing matched "${search}". Try a different name or email.`
              : 'Accounts will appear here once customers register.'
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
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="text-right">Wallet</TableHead>}
                  <TableHead>Joined</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    isAdmin={isAdmin}
                    isSelf={user.id === me?.id}
                    onViewDetail={() => setDetailUserId(user.id)}
                    onAdjustWallet={() => setAdjustTarget(user)}
                    onSuspend={() => updateStatus.mutate({ id: user.id, status: 'SUSPENDED' })}
                    onActivate={() => updateStatus.mutate({ id: user.id, status: 'ACTIVE' })}
                    onBan={() => updateStatus.mutate({ id: user.id, status: 'BANNED' })}
                    onRoleChange={(role) => updateRole.mutate({ id: user.id, role })}
                    actionPending={
                      (updateStatus.isPending || updateRole.isPending) &&
                      (updateStatus.variables?.id === user.id ||
                        updateRole.variables?.id === user.id)
                    }
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            {total.toLocaleString()} {total === 1 ? 'user' : 'users'}
            {usersQuery.isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
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

      {/* User detail dialog */}
      <UserDetailDialog
        userId={detailUserId}
        onClose={() => setDetailUserId(null)}
        isAdmin={isAdmin}
        onAdjustWallet={(user) => {
          setDetailUserId(null);
          // Small delay so dialogs don't fight each other
          setTimeout(() => setAdjustTarget(user), 150);
        }}
      />

      {/* Wallet adjustment dialog */}
      <WalletAdjustDialog
        user={adjustTarget}
        onClose={() => setAdjustTarget(null)}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────── UserRow ─────── */

function UserRow({
  user,
  isAdmin,
  isSelf,
  onViewDetail,
  onAdjustWallet,
  onSuspend,
  onActivate,
  onBan,
  onRoleChange,
  actionPending,
}: {
  user: AdminUser;
  isAdmin: boolean;
  isSelf: boolean;
  onViewDetail: () => void;
  onAdjustWallet: () => void;
  onSuspend: () => void;
  onActivate: () => void;
  onBan: () => void;
  onRoleChange: (role: UserRole) => void;
  actionPending: boolean;
}) {
  return (
    <TableRow
      className="cursor-pointer"
      onClick={onViewDetail}
    >
      <TableCell>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={ROLE_VARIANT[user.role] ?? 'secondary'}>
          {humanizeStatus(user.role)}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={STATUS_VARIANT[user.status] ?? 'secondary'}>
          {humanizeStatus(user.status)}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatRelativeTime(user.createdAt)}
      </TableCell>
      {isAdmin && (
        <TableCell className="text-right font-medium tabular-nums">
          {user.wallet ? formatCurrency(user.wallet.balance) : '—'}
        </TableCell>
      )}
      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
        {formatRelativeTime(user.createdAt)}
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
        {user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : 'Never'}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        {isSelf ? (
          <span className="text-xs text-muted-foreground">You</span>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={actionPending} aria-label="User actions">
                {actionPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={onViewDetail}>
                <ExternalLink className="mr-2 h-4 w-4" />
                View details
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={onAdjustWallet}>
                  <Wallet className="mr-2 h-4 w-4" />
                  Adjust wallet
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              {user.status !== 'ACTIVE' && (
                <DropdownMenuItem onClick={onActivate}>Activate</DropdownMenuItem>
              )}
              {user.status === 'ACTIVE' && (
                <DropdownMenuItem
                  onClick={onSuspend}
                  className="text-amber-600 focus:text-amber-600"
                >
                  Suspend
                </DropdownMenuItem>
              )}
              {user.status !== 'BANNED' && (
                <DropdownMenuItem
                  onClick={onBan}
                  className="text-destructive focus:text-destructive"
                >
                  Ban
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Change role</DropdownMenuLabel>
                  {ASSIGNABLE_ROLES.filter((r) => r !== user.role).map((role) => (
                    <DropdownMenuItem key={role} onClick={() => onRoleChange(role)}>
                      Set as {humanizeStatus(role)}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );
}

/* ─────────────────────────────────────────── UserDetailDialog ── */

function UserDetailDialog({
  userId,
  onClose,
  isAdmin,
  onAdjustWallet,
}: {
  userId: string | null;
  onClose: () => void;
  isAdmin: boolean;
  onAdjustWallet: (user: AdminUser) => void;
}) {
  const detailQuery = useAdminUserDetail(userId);
  const transactionsQuery = useAdminUserTransactions(userId, { limit: 5 });
  const ordersQuery = useAdminUserOrders(userId);

  const user = detailQuery.data as AdminUserDetail | undefined;
  const transactions = (transactionsQuery.data?.transactions ?? []) as Transaction[];
  const orders = (ordersQuery.data?.orders ?? []) as AdminOrder[];

  return (
    <Dialog open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User details</DialogTitle>
          <DialogDescription>
            {user?.email ?? 'Loading…'}
          </DialogDescription>
        </DialogHeader>

        {detailQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : !user ? (
          <p className="text-sm text-muted-foreground py-4 text-center">User not found.</p>
        ) : (
          <div className="space-y-5">
            {/* Profile */}
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">
                  {[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium truncate">{user.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <Badge variant={ROLE_VARIANT[user.role] ?? 'secondary'} className="mt-0.5">
                  {humanizeStatus(user.role)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={STATUS_VARIANT[user.status] ?? 'secondary'} className="mt-0.5">
                  {humanizeStatus(user.status)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email verified</p>
                <p className="font-medium">{user.emailVerified ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="font-medium">{formatDate(user.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last login</p>
                <p className="font-medium">
                  {user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : 'Never'}
                </p>
              </div>
              {user.telegramUsername && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Telegram</p>
                  <p className="font-medium">@{user.telegramUsername}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Wallet */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Wallet</h3>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onAdjustWallet({
                        id: user.id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        role: user.role,
                        status: user.status,
                        createdAt: user.createdAt,
                        lastLoginAt: user.lastLoginAt,
                        wallet: user.wallet ?? undefined,
                      } as AdminUser)
                    }
                  >
                    <Wallet className="mr-1.5 h-3.5 w-3.5" />
                    Adjust balance
                  </Button>
                )}
              </div>
              {user.wallet ? (
                <div className="rounded-lg border border-border/60 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="text-xl font-semibold tabular-nums">
                      {formatCurrency(user.wallet.balance, user.wallet.currency)}
                    </p>
                  </div>
                  <Badge variant={user.wallet.status === 'ACTIVE' ? 'success' : 'destructive'}>
                    {user.wallet.status}
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No wallet found.</p>
              )}

              {/* Recent transactions */}
              {transactions.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Recent transactions
                  </p>
                  {transactionsQuery.isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-7 w-full" />
                    ))
                  ) : (
                    transactions.map((tx) => {
                      const amt = toNumber(tx.amount);
                      return (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5 text-xs"
                        >
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            {amt >= 0 ? (
                              <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <ArrowDownCircle className="h-3.5 w-3.5 text-destructive" />
                            )}
                            {humanizeStatus(tx.type)}
                            {tx.description && (
                              <span className="text-muted-foreground/60">· {tx.description}</span>
                            )}
                          </span>
                          <span
                            className={cn(
                              'font-semibold tabular-nums',
                              amt >= 0 ? 'text-emerald-500' : 'text-destructive',
                            )}
                          >
                            {amt >= 0 ? '+' : ''}
                            {formatCurrency(tx.amount)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Recent orders */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Recent orders</h3>
              {ordersQuery.isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full mb-1.5" />
                ))
              ) : orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-mono font-medium">{order.orderNumber}</span>
                        {order.service?.name && (
                          <span className="ml-2 text-muted-foreground truncate">
                            {order.service.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge
                          variant={variantForStatus(order.status, orderStatusVariant)}
                          className="text-[10px] h-5"
                        >
                          {humanizeStatus(order.status)}
                        </Badge>
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(order.totalAmount, order.currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────────────────────────── WalletAdjustDialog ─── */

function WalletAdjustDialog({
  user,
  onClose,
}: {
  user: AdminUser | null;
  onClose: () => void;
}) {
  const [amount, setAmount] = React.useState('');
  const [type, setType] = React.useState<WalletAdjustmentType>('ADJUSTMENT');
  const [description, setDescription] = React.useState('');
  const [reason, setReason] = React.useState('');
  const adjust = useAdminAdjustWallet();

  React.useEffect(() => {
    if (user) {
      setAmount('');
      setType('ADJUSTMENT');
      setDescription('');
      setReason('');
    }
  }, [user]);

  const parsedAmount = parseFloat(amount);
  const isValid =
    amount !== '' &&
    !isNaN(parsedAmount) &&
    parsedAmount !== 0 &&
    description.trim().length > 0 &&
    reason.trim().length > 0;

  const submit = () => {
    if (!user || !isValid) return;
    adjust.mutate(
      {
        userId: user.id,
        amount: parsedAmount,
        type,
        description: description.trim(),
        reason: reason.trim(),
      },
      { onSuccess: onClose },
    );
  };

  const balance = user?.wallet ? toNumber(user.wallet.balance) : null;

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust wallet balance</DialogTitle>
          <DialogDescription>
            {user?.email} · Current balance:{' '}
            {balance !== null ? formatCurrency(balance) : '—'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="adj-amount">
              Amount{' '}
              <span className="font-normal text-muted-foreground">
                (positive = credit, negative = debit)
              </span>
            </Label>
            <Input
              id="adj-amount"
              type="number"
              step="0.01"
              placeholder="e.g. 5.00 or -2.50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {parsedAmount !== 0 && balance !== null && !isNaN(parsedAmount) && (
              <p className="text-xs text-muted-foreground">
                New balance:{' '}
                <span
                  className={cn(
                    'font-semibold',
                    balance + parsedAmount < 0 ? 'text-destructive' : 'text-foreground',
                  )}
                >
                  {formatCurrency(balance + parsedAmount)}
                </span>
              </p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label htmlFor="adj-type">Transaction type</Label>
            <Select value={type} onValueChange={(v) => setType(v as WalletAdjustmentType)}>
              <SelectTrigger id="adj-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADJUSTMENT">Adjustment (general correction)</SelectItem>
                <SelectItem value="BONUS">Bonus (promo credit)</SelectItem>
                <SelectItem value="CHARGEBACK">Chargeback (dispute reversal)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="adj-description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Input
              id="adj-description"
              placeholder="Visible on the user's transaction history"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Internal reason */}
          <div className="space-y-1.5">
            <Label htmlFor="adj-reason">
              Internal reason <span className="text-destructive">*</span>{' '}
              <span className="font-normal text-muted-foreground">(recorded in audit log)</span>
            </Label>
            <Textarea
              id="adj-reason"
              rows={2}
              placeholder="Why is this adjustment being made?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={adjust.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!isValid || adjust.isPending}>
            {adjust.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
