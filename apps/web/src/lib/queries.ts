import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { api, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/components/auth/auth-provider';
import type {
  Order,
  OrderDetail,
  OrderStats,
  Service,
  Transaction,
  PaginatedTransactions,
  Wallet,
  Paginated,
  Announcement,
} from '@/lib/types';

/** All dashboard queries are gated on auth to avoid pre-session 401s. */

export function useWallet() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.get<Wallet>('/wallet').then((r) => r.data),
    enabled: isAuthenticated,
  });
}

export function useTransactions(params: { page?: number; limit?: number } = {}) {
  const { isAuthenticated } = useAuth();
  const { page = 1, limit = 20 } = params;
  return useQuery({
    queryKey: ['transactions', page, limit],
    queryFn: () =>
      api
        .get<PaginatedTransactions>('/wallet/transactions', { params: { page, limit } })
        .then((r) => {
          // Handle both paginated and legacy non-paginated shapes.
          const d = r.data as PaginatedTransactions & { transactions?: Transaction[] };
          if (Array.isArray(d.transactions) && typeof d.total === 'number') return d;
          // Legacy shape: just an array under `transactions`
          const txs: Transaction[] = (d as unknown as { transactions: Transaction[] }).transactions ?? [];
          return { transactions: txs, total: txs.length, page: 1, limit: txs.length };
        }),
    enabled: isAuthenticated,
    placeholderData: (prev) => prev,
  });
}

export function useOrderStats() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['order-stats'],
    queryFn: () => api.get<OrderStats>('/orders/stats').then((r) => r.data),
    enabled: isAuthenticated,
  });
}

export function useOrders(params: { page?: number; limit?: number; search?: string } = {}) {
  const { isAuthenticated } = useAuth();
  const { page = 1, limit = 10, search = '' } = params;
  return useQuery({
    queryKey: ['orders', page, limit, search],
    queryFn: () =>
      api
        .get<Paginated<Order>>('/orders', { params: { page, limit, search: search || undefined } })
        .then((r) => r.data),
    enabled: isAuthenticated,
    placeholderData: (prev) => prev,
  });
}

export function useOrderById(id: string | null) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get<OrderDetail>(`/orders/${id}`).then((r) => r.data),
    enabled: isAuthenticated && !!id,
  });
}

export function useServices(category?: string, limit?: number) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['services', category ?? 'all', limit ?? null],
    queryFn: () =>
      api
        .get<{ services: Service[]; total?: number }>('/services', {
          params: { category, limit },
        })
        .then((r) => r.data),
    enabled: isAuthenticated,
  });
}

export function useProxyTariffs(filters: {
  countryCode: string | null;
  proxyType: string | null;
  protocol: string | null;
}) {
  const { isAuthenticated } = useAuth();
  const enabled = !!filters.countryCode && !!filters.proxyType && !!filters.protocol;
  return useQuery({
    queryKey: ['proxy-tariffs', filters.countryCode, filters.proxyType, filters.protocol],
    queryFn: () =>
      api.get<{ tariffs: Array<{ period: number; price: number }>; currency: string }>(
        '/services/proxy/tariffs',
        { params: filters },
      ).then((response) => response.data),
    enabled: isAuthenticated && enabled,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      serviceId: string;
      quantity: number;
      targetUrl?: string;
      targetUsername?: string;
      customData?: Record<string, unknown>;
    }) => api.post('/orders', body).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast({ title: 'Order placed', description: 'Your order is now processing.' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Order failed',
        description: getErrorMessage(error, 'Unable to place the order.'),
      });
    },
  });
}

/** Request a password-reset code to be sent to the given email. */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      api.post('/auth/forgot-password', { email }).then((r) => r.data),
  });
}

/** Complete the reset with the 6-digit code and a new password. */
export function useResetPassword() {
  return useMutation({
    mutationFn: (body: { email: string; code: string; newPassword: string }) =>
      api.post('/auth/reset-password', body).then((r) => r.data),
  });
}

/** Fetch active announcements shown on the dashboard home. */
export function useAnnouncements() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['announcements'],
    queryFn: () =>
      api.get<Announcement[]>('/announcements').then((r) => r.data),
    enabled: isAuthenticated,
    // Announcements don't change frequently; 5-minute stale time is fine.
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch the live list of free public phone numbers from OnlineSIM for a given country.
 * countryCode is the numeric OnlineSIM country code stored in service.features.countryCode
 */
export function useFreeNumbers(countryCode: number | string | null) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['free-numbers', countryCode],
    queryFn: () =>
      api
        .get<{ numbers: Array<{ full_number?: string; number?: string; updated_at?: string }> }>(
          '/services/free-numbers',
          { params: { countryCode } },
        )
        .then((r) => r.data?.numbers ?? []),
    enabled: isAuthenticated && countryCode !== null,
    refetchInterval: 30_000, // refresh every 30s so inbox stays live
  });
}

/**
 * Fetch the public SMS inbox for a specific free phone number.
 */
export function useFreeMessages(phoneNumber: string | null) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['free-messages', phoneNumber],
    queryFn: () =>
      api
        .get<{
          messages: Array<{ sender?: string; from?: string; text?: string; message?: string; date?: string }>;
        }>('/services/free-messages', { params: { phone: phoneNumber } })
        .then((r) => {
          const msgs = r.data?.messages;
          return Array.isArray(msgs) ? msgs : [];
        }),
    enabled: isAuthenticated && !!phoneNumber,
    refetchInterval: 15_000, // poll every 15s for new SMS
  });
}

/* ── Temporary email (mail.tm via our API proxy) ──────────────────────────── */

export interface EmailDomain { id: string; domain: string; }
export interface EmailMessage {
  id: string;
  from: { address: string; name: string };
  subject: string;
  intro: string;
  seen: boolean;
  createdAt: string;
}
export interface EmailMessageDetail extends EmailMessage {
  text: string;
  html: string[];
}
export interface EmailAccount {
  id: string;
  address: string;
  token: string;
}

/** Available @domain options for creating a temp address. */
export function useEmailDomains() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['email-domains'],
    queryFn: () =>
      api.get<{ domains: EmailDomain[] }>('/services/email/domains').then((r) => r.data.domains),
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000, // domains rarely change
  });
}

/** Create a new temp mailbox returns address + auth token. */
export function useCreateEmailAccount() {
  return useMutation({
    mutationFn: (body: { address: string; password: string }) =>
      api.post<EmailAccount>('/services/email/account', body).then((r) => r.data),
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Could not create mailbox',
        description: getErrorMessage(error, 'The address may already be taken.'),
      });
    },
  });
}

/** Poll the inbox for a given account (needs the token returned at creation). */
export function useEmailInbox(address: string | null, token: string | null) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['email-inbox', address],
    queryFn: () =>
      api
        .get<{ messages: EmailMessage[] }>('/services/email/inbox', {
          params: { address, token },
        })
        .then((r) => r.data.messages),
    enabled: isAuthenticated && !!address && !!token,
    refetchInterval: 15_000,
  });
}

/** Fetch the full body of a single email. */
export function useEmailMessage(id: string | null, token: string | null) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['email-message', id],
    queryFn: () =>
      api
        .get<EmailMessageDetail>(`/services/email/message/${id}`, {
          params: { token },
        })
        .then((r) => r.data),
    enabled: isAuthenticated && !!id && !!token,
  });
}
