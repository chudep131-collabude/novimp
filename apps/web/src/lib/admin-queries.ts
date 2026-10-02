import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { api, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/components/auth/auth-provider';
import type {
  AdminDashboardStats,
  AdminDepositsResponse,
  AdminOrder,
  AdminOrdersResponse,
  AdminProvider,
  AdminUserStats,
  AdminUsersResponse,
  AuditLogsResponse,
  CreatePricingRuleDto,
  OrderTrendPoint,
  PricingRule,
  ProviderPerformance,
  RevenuePoint,
  UpdatePricingRuleDto,
} from '@/lib/types';

/**
 * Back-office queries. Every hook is gated on `isStaff` so a customer session
 * never fires privileged requests (which would 403 and pollute the console).
 */

/* ------------------------------------------------------------------ */
/* Dashboard + analytics                                               */
/* ------------------------------------------------------------------ */

export function useAdminDashboard() {
  const { isStaff } = useAuth();
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api.get<AdminDashboardStats>('/admin/dashboard').then((r) => r.data),
    enabled: isStaff,
  });
}

export function useAdminRevenue(period: 'daily' | 'weekly' | 'monthly' = 'daily', days = 30) {
  const { isStaff } = useAuth();
  return useQuery({
    queryKey: ['admin', 'revenue', period, days],
    queryFn: () =>
      api
        .get<RevenuePoint[]>('/admin/analytics/revenue', { params: { period, days } })
        .then((r) => r.data),
    enabled: isStaff,
  });
}

export function useAdminOrderTrends(days = 30) {
  const { isStaff } = useAuth();
  return useQuery({
    queryKey: ['admin', 'order-trends', days],
    queryFn: () =>
      api.get<OrderTrendPoint[]>('/admin/analytics/orders', { params: { days } }).then((r) => r.data),
    enabled: isStaff,
  });
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export function useAdminOrders(
  params: { page?: number; limit?: number; status?: string; search?: string } = {},
) {
  const { isStaff } = useAuth();
  const { page = 1, limit = 20, status = '', search = '' } = params;
  return useQuery({
    queryKey: ['admin', 'orders', page, limit, status, search],
    queryFn: () =>
      api
        .get<AdminOrdersResponse>('/orders/admin/all', {
          params: {
            page,
            limit,
            status: status || undefined,
            search: search || undefined,
          },
        })
        .then((r) => r.data),
    enabled: isStaff,
    placeholderData: (prev) => prev,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: string;
      reason?: string;
    }) => api.post<AdminOrder>(`/orders/admin/${id}/status`, { status, reason }).then((r) => r.data),
    onSuccess: (order) => {
      toast({
        title: 'Order updated',
        description: `${order.orderNumber} is now ${order.status}.`,
      });
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (error) =>
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: getErrorMessage(error),
      }),
  });
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

export function useAdminUsers(params: { page?: number; limit?: number; search?: string } = {}) {
  const { isStaff } = useAuth();
  const { page = 1, limit = 20, search = '' } = params;
  return useQuery({
    queryKey: ['admin', 'users', page, limit, search],
    queryFn: () =>
      api
        .get<AdminUsersResponse>('/users', {
          params: { page, limit, search: search || undefined },
        })
        .then((r) => r.data),
    enabled: isStaff,
    placeholderData: (prev) => prev,
  });
}

export function useAdminUserStats() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ['admin', 'user-stats'],
    queryFn: () => api.get<AdminUserStats>('/users/stats').then((r) => r.data),
    enabled: isAdmin,
  });
}

/* ------------------------------------------------------------------ */
/* Providers                                                           */
/* ------------------------------------------------------------------ */

export function useAdminProviders() {
  const { isStaff } = useAuth();
  return useQuery({
    queryKey: ['admin', 'providers'],
    queryFn: () => api.get<AdminProvider[]>('/providers').then((r) => r.data),
    enabled: isStaff,
  });
}

export function useProviderPerformance() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ['admin', 'provider-performance'],
    queryFn: () => api.get<ProviderPerformance[]>('/admin/providers/performance').then((r) => r.data),
    enabled: isAdmin,
  });
}

export function useToggleProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'pause' | 'resume' }) =>
      api.post(`/providers/${id}/${action}`).then((r) => r.data),
    onSuccess: (_data, vars) => {
      toast({ title: vars.action === 'pause' ? 'Provider paused' : 'Provider resumed' });
      qc.invalidateQueries({ queryKey: ['admin', 'providers'] });
      qc.invalidateQueries({ queryKey: ['admin', 'provider-performance'] });
    },
    onError: (error) =>
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: getErrorMessage(error),
      }),
  });
}

export function useCreateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      name: string;
      displayName: string;
      adapterType: string;
      apiUrl: string;
      apiKey: string;
      syncInterval?: number;
    }) => api.post<AdminProvider>('/providers', dto).then((r) => r.data),
    onSuccess: (provider) => {
      toast({ title: 'Provider added', description: `${provider.displayName} is now configured.` });
      qc.invalidateQueries({ queryKey: ['admin', 'providers'] });
      qc.invalidateQueries({ queryKey: ['admin', 'provider-performance'] });
    },
    onError: (error) =>
      toast({
        variant: 'destructive',
        title: 'Failed to add provider',
        description: getErrorMessage(error),
      }),
  });
}

export function useSyncProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/sync/providers/${id}`, {}, { params: { type: 'all' } }),
    onSuccess: () => {
      toast({ title: 'Sync started', description: 'Provider catalog is being refreshed.' });
      qc.invalidateQueries({ queryKey: ['admin', 'providers'] });
      qc.invalidateQueries({ queryKey: ['admin', 'provider-performance'] });
    },
    onError: (error) =>
      toast({
        variant: 'destructive',
        title: 'Sync failed',
        description: getErrorMessage(error),
      }),
  });
}

/* ------------------------------------------------------------------ */
/* Audit logs                                                          */
/* ------------------------------------------------------------------ */

export function useAuditLogs(
  params: { page?: number; limit?: number; action?: string } = {},
) {
  const { isAdmin } = useAuth();
  const { page = 1, limit = 50, action = '' } = params;
  return useQuery({
    queryKey: ['admin', 'audit-logs', page, limit, action],
    queryFn: () =>
      api
        .get<AuditLogsResponse>('/admin/audit-logs', {
          params: { page, limit, action: action || undefined },
        })
        .then((r) => r.data),
    enabled: isAdmin,
    placeholderData: (prev) => prev,
  });
}

/* ------------------------------------------------------------------ */
/* Deposits (finance review queue)                                     */
/* ------------------------------------------------------------------ */

export function useAdminDeposits(
  params: { page?: number; limit?: number; status?: string; needsReview?: boolean; search?: string } = {},
) {
  const { isStaff } = useAuth();
  const { page = 1, limit = 20, status = '', needsReview, search = '' } = params;
  return useQuery({
    queryKey: ['admin', 'deposits', page, limit, status, needsReview, search],
    queryFn: () =>
      api
        .get<AdminDepositsResponse>('/payments/admin/deposits', {
          params: {
            page,
            limit,
            status: status || undefined,
            needsReview: needsReview ?? undefined,
            search: search || undefined,
          },
        })
        .then((r) => r.data),
    enabled: isStaff,
    placeholderData: (prev) => prev,
  });
}

export function useApproveDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      api.post(`/payments/admin/deposits/${id}/approve`, { notes }).then((r) => r.data),
    onSuccess: () => {
      toast({ title: 'Deposit approved', description: 'Wallet has been credited.' });
      qc.invalidateQueries({ queryKey: ['admin', 'deposits'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (error) =>
      toast({
        variant: 'destructive',
        title: 'Approval failed',
        description: getErrorMessage(error),
      }),
  });
}

export function useRejectDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/payments/admin/deposits/${id}/reject`, { reason }).then((r) => r.data),
    onSuccess: () => {
      toast({ title: 'Deposit rejected', description: 'The deposit has been marked as failed.' });
      qc.invalidateQueries({ queryKey: ['admin', 'deposits'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (error) =>
      toast({
        variant: 'destructive',
        title: 'Rejection failed',
        description: getErrorMessage(error),
      }),
  });
}

/* ------------------------------------------------------------------ */
/* User management                                                     */
/* ------------------------------------------------------------------ */

export function useUpdateUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'SUSPENDED' | 'BANNED' }) =>
      api.patch(`/users/${id}/status`, { status }).then((r) => r.data),
    onSuccess: (_data, vars) => {
      const label = vars.status === 'ACTIVE' ? 'activated' : vars.status.toLowerCase();
      toast({ title: `User ${label}` });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'user-stats'] });
    },
    onError: (error) =>
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: getErrorMessage(error),
      }),
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch(`/users/${id}/role`, { role }).then((r) => r.data),
    onSuccess: () => {
      toast({ title: 'Role updated' });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'user-stats'] });
    },
    onError: (error) =>
      toast({
        variant: 'destructive',
        title: 'Role update failed',
        description: getErrorMessage(error),
      }),
  });
}

/* ------------------------------------------------------------------ */
/* Wallet adjustment                                                   */
/* ------------------------------------------------------------------ */

export function useAdminAdjustWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      userId: string;
      amount: number;
      type: 'ADJUSTMENT' | 'BONUS' | 'CHARGEBACK';
      description: string;
      reason: string;
    }) => api.post('/wallet/admin/adjust', dto).then((r) => r.data),
    onSuccess: (_data, vars) => {
      toast({ title: 'Wallet adjusted', description: `Balance updated for user.` });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'user-transactions', vars.userId] });
      qc.invalidateQueries({ queryKey: ['admin', 'user-detail', vars.userId] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (error) =>
      toast({
        variant: 'destructive',
        title: 'Adjustment failed',
        description: getErrorMessage(error),
      }),
  });
}

/* ------------------------------------------------------------------ */
/* User detail (drawer)                                                */
/* ------------------------------------------------------------------ */

export function useAdminUserDetail(userId: string | null) {
  const { isStaff } = useAuth();
  return useQuery({
    queryKey: ['admin', 'user-detail', userId],
    queryFn: () =>
      api.get(`/users/${userId}`).then((r) => r.data),
    enabled: isStaff && !!userId,
  });
}

export function useAdminUserTransactions(
  userId: string | null,
  params: { page?: number; limit?: number } = {},
) {
  const { isStaff } = useAuth();
  const { page = 1, limit = 10 } = params;
  return useQuery({
    queryKey: ['admin', 'user-transactions', userId, page, limit],
    queryFn: () =>
      api
        .get(`/wallet/admin/user/${userId}/transactions`, { params: { page, limit } })
        .then((r) => r.data),
    enabled: isStaff && !!userId,
    placeholderData: (prev) => prev,
  });
}

export function useAdminUserOrders(userId: string | null) {
  const { isStaff } = useAuth();
  return useQuery({
    queryKey: ['admin', 'user-orders', userId],
    queryFn: () =>
      api
        .get('/orders/admin/all', { params: { userId, limit: 5, page: 1 } })
        .then((r) => r.data),
    enabled: isStaff && !!userId,
  });
}

/* ------------------------------------------------------------------ */
/* Announcements                                                       */
/* ------------------------------------------------------------------ */

export function useAdminAnnouncements() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ['admin', 'announcements'],
    queryFn: () => api.get('/announcements/all').then((r) => r.data),
    enabled: isAdmin,
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      title: string;
      content: string;
      type?: string;
      startsAt?: string;
      expiresAt?: string;
    }) => api.post('/announcements', dto).then((r) => r.data),
    onSuccess: () => {
      toast({ title: 'Announcement created', description: 'Broadcast to Telegram users sent.' });
      qc.invalidateQueries({ queryKey: ['admin', 'announcements'] });
    },
    onError: (error) =>
      toast({
        variant: 'destructive',
        title: 'Failed to create announcement',
        description: getErrorMessage(error),
      }),
  });
}

export function useToggleAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/announcements/${id}/active`, { isActive }).then((r) => r.data),
    onSuccess: (_data, vars) => {
      toast({ title: vars.isActive ? 'Announcement activated' : 'Announcement deactivated' });
      qc.invalidateQueries({ queryKey: ['admin', 'announcements'] });
    },
    onError: (error) =>
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: getErrorMessage(error),
      }),
  });
}

/* ------------------------------------------------------------------ */
/* Pricing rules                                                       */
/* ------------------------------------------------------------------ */

export function usePricingRules() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ['admin', 'pricing-rules'],
    queryFn: () => api.get<PricingRule[]>('/admin/pricing-rules').then((r) => r.data),
    enabled: isAdmin,
  });
}

export function useCreatePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePricingRuleDto) =>
      api.post<PricingRule>('/admin/pricing-rules', dto).then((r) => r.data),
    onSuccess: (rule) => {
      toast({ title: 'Pricing rule created', description: rule.name });
      qc.invalidateQueries({ queryKey: ['admin', 'pricing-rules'] });
    },
    onError: (error) =>
      toast({
        variant: 'destructive',
        title: 'Failed to create rule',
        description: getErrorMessage(error),
      }),
  });
}

export function useUpdatePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePricingRuleDto }) =>
      api.patch<PricingRule>(`/admin/pricing-rules/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'pricing-rules'] });
    },
    onError: (error) =>
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: getErrorMessage(error),
      }),
  });
}

export function useDeletePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/admin/pricing-rules/${id}`).then((r) => r.data),
    onSuccess: () => {
      toast({ title: 'Pricing rule deleted' });
      qc.invalidateQueries({ queryKey: ['admin', 'pricing-rules'] });
    },
    onError: (error) =>
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: getErrorMessage(error),
      }),
  });
}
