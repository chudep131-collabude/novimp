/**
 * Shared API response types. Monetary fields are typed as `string` because the
 * API serializes Prisma `Decimal(18, 8)` columns as strings  always pass them
 * through the helpers in `@/lib/format`.
 */

export interface Wallet {
  id: string;
  balance: string;
  currency: string;
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED';
}

export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'PURCHASE' | 'REFUND' | 'ADJUSTMENT' | 'BONUS';
  amount: string;
  balanceAfter: string;
  currency: string;
  description?: string | null;
  createdAt: string;
}

export interface PaginatedTransactions {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
}

export interface ServiceCountry {
  code: string;
  name: string;
  available: boolean;
}

/** Provider-specific spec bag. Keys vary by category (see adapters). */
export type ServiceFeatures = Record<string, unknown>;

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  platform?: string | null;
  subcategory?: string | null;
  customerPrice: string;
  currency?: string;
  customerMinQty: number;
  customerMaxQty?: number | null;
  estimatedTime?: string | null;
  /** Spec surface captured from the provider catalog. */
  features?: ServiceFeatures | null;
  /** Countries this resource is sold in (may be empty = "all"). */
  countries?: ServiceCountry[] | null;
  inStock?: boolean;
  stockQuantity?: number | null;
  lastSyncedAt?: string | null;
  /** Server-computed freshness flag. */
  _meta?: { stale: boolean };
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  quantity: number;
  totalAmount: string;
  currency: string;
  createdAt: string;
  service?: Pick<Service, 'id' | 'name' | 'category'> | null;
}

/** Full order detail  returned by GET /orders/:id */
export interface OrderDetail extends Order {
  updatedAt: string;
  targetUrl?: string | null;
  targetUsername?: string | null;
  providerOrderId?: string | null;
  providerStatus?: string | null;
  startCount?: number | null;
  remains?: number | null;
  deliveryData?: Record<string, unknown> | null;
  customData?: Record<string, unknown> | null;
  service?: Pick<Service, 'id' | 'name' | 'category' | 'platform' | 'subcategory'> | null;
}

export interface Paginated<T> {
  data?: T[];
  orders?: T[];
  total: number;
  page?: number;
  limit?: number;
}

export interface OrderStats {
  total: number;
  completed: number;
  pending: number;
  failed?: number;
  processing?: number;
}

export interface Platform {
  platform: string;
  count: number;
}

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

export type UserRole = 'CUSTOMER' | 'SUPPORT' | 'FINANCE' | 'ADMIN' | 'SUPER_ADMIN';

/** Roles allowed into the back office at all. */
export const STAFF_ROLES: UserRole[] = ['SUPPORT', 'FINANCE', 'ADMIN', 'SUPER_ADMIN'];
/** Roles with unrestricted console access. */
export const ADMIN_ROLES: UserRole[] = ['ADMIN', 'SUPER_ADMIN'];
/** Scoped "sub-admin" roles. */
export const SUBADMIN_ROLES: UserRole[] = ['SUPPORT', 'FINANCE'];

export function isStaffRole(role?: string | null): boolean {
  return !!role && STAFF_ROLES.includes(role as UserRole);
}

export function isAdminRole(role?: string | null): boolean {
  return !!role && ADMIN_ROLES.includes(role as UserRole);
}

/* ------------------------------------------------------------------ */
/* Admin  dashboard                                                   */
/* ------------------------------------------------------------------ */

export interface AdminDashboardStats {
  revenue: { total: string; today: string; thisMonth: string };
  profit: string;
  orders: { total: number; today: number; pending: number; failed: number };
  users: { total: number; newToday: number };
  walletLiability: string;
  popularServices: Array<{
    serviceId: string;
    name: string;
    category: string;
    revenue: string;
    quantity: number;
    orders: number;
  }>;
  bestCustomers: Array<{
    userId: string;
    email: string;
    name: string;
    spent: string;
  }>;
}

export interface RevenuePoint {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
}

export interface OrderTrendPoint {
  status: string;
  count: number;
}

/* ------------------------------------------------------------------ */
/* Admin  orders                                                      */
/* ------------------------------------------------------------------ */

export interface AdminOrderUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface AdminOrder extends Order {
  userId: string;
  quantity: number;
  providerCost: string;
  customerPrice: string;
  profit: string;
  targetUrl?: string | null;
  targetUsername?: string | null;
  user?: AdminOrderUser | null;
  service?: Pick<Service, 'id' | 'name' | 'category' | 'platform'> | null;
  provider?: { displayName: string } | null;
}

export interface AdminOrdersResponse {
  orders: AdminOrder[];
  total: number;
  page: number;
  limit: number;
  statusCounts: Record<string, number>;
}

/* ------------------------------------------------------------------ */
/* Admin  users                                                       */
/* ------------------------------------------------------------------ */

export interface AdminUser {
  id: string;
  email: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role: UserRole;
  status: string;
  kycStatus: string;
  createdAt: string;
  lastLoginAt?: string | null;
  wallet?: { balance: string } | null;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminUserStats {
  total: number;
  active: number;
  newToday: number;
  byRole: Array<{ role: UserRole; count: number }>;
}

/* ------------------------------------------------------------------ */
/* Admin  providers                                                   */
/* ------------------------------------------------------------------ */

export interface AdminProvider {
  id: string;
  name: string;
  displayName: string;
  adapterType: string;
  status: string;
  balance?: string | null;
  currency?: string | null;
  lastSyncAt?: string | null;
  lastSyncError?: string | null;
  syncEnabled: boolean;
  syncInterval: number;
  consecutiveFailures: number;
  avgResponseMs?: number | null;
  _count?: { services: number };
}

export interface ProviderPerformance {
  id: string;
  name: string;
  displayName: string;
  status: string;
  lastSyncAt?: string | null;
  avgResponseMs?: number | null;
  consecutiveFailures: number;
  serviceCount: number;
  orderCount: number;
  completedOrders: number;
  failedOrders: number;
  successRate: number;
  revenue: number;
  profit: number;
}

/* ------------------------------------------------------------------ */
/* Admin  audit logs                                                  */
/* ------------------------------------------------------------------ */

export interface AuditLogEntry {
  id: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  reason?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
}

export interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

/* ------------------------------------------------------------------ */
/* Admin  deposits (finance review queue)                             */
/* ------------------------------------------------------------------ */

export interface AdminDeposit {
  id: string;
  userId: string;
  amount: string;
  currency: string;
  /** Gateway key: stripe | crypto | bank_transfer. */
  gateway: string;
  paymentMethod?: string | null;
  status: string;
  requiresReview: boolean;
  reviewReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  createdAt: string;
  user?: AdminOrderUser | null;
}

export interface AdminDepositsResponse {
  deposits: AdminDeposit[];
  total: number;
  page: number;
  limit: number;
}

export interface SyncHistoryEntry {
  id: string;
  providerId: string;
  jobType: string;
  status: string;
  itemsProcessed?: number | null;
  error?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  provider?: { displayName: string } | null;
}

/* ------------------------------------------------------------------ */
/* Announcements                                                       */
/* ------------------------------------------------------------------ */

export type AnnouncementType = 'INFO' | 'WARNING' | 'MAINTENANCE' | 'PROMOTION';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  isActive: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Admin — wallet adjustment                                           */
/* ------------------------------------------------------------------ */

export type WalletAdjustmentType = 'ADJUSTMENT' | 'BONUS' | 'CHARGEBACK';

export interface WalletAdjustmentDto {
  userId: string;
  amount: number;
  type: WalletAdjustmentType;
  description: string;
  reason: string;
}

/* ------------------------------------------------------------------ */
/* Admin — user detail (drawer)                                        */
/* ------------------------------------------------------------------ */

export interface AdminUserDetail {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: UserRole;
  status: string;
  kycStatus: string;
  emailVerified: boolean;
  telegramId?: string | null;
  telegramUsername?: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
  wallet?: {
    id: string;
    balance: string;
    currency: string;
    status: string;
  } | null;
}

/* ------------------------------------------------------------------ */
/* Admin — pricing rules                                               */
/* ------------------------------------------------------------------ */

export type PricingRuleType = 'MARKUP_PERCENT' | 'MARKUP_FIXED' | 'OVERRIDE';
export type PricingTargetType = 'global' | 'category' | 'service' | 'provider';

export interface PricingRule {
  id: string;
  name: string;
  ruleType: PricingRuleType;
  targetType: PricingTargetType;
  targetId?: string | null;
  markupPercent: string;
  fixedAmount?: string | null;
  minPrice?: string | null;
  maxPrice?: string | null;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePricingRuleDto {
  name: string;
  ruleType: PricingRuleType;
  targetType: PricingTargetType;
  targetId?: string;
  markupPercent: number;
  fixedAmount?: number;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
  priority?: number;
}

export interface UpdatePricingRuleDto {
  name?: string;
  markupPercent?: number;
  fixedAmount?: number;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
  priority?: number;
}
