export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'
  | 'info';

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIAL';

export type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_CUSTOMER'
  | 'RESOLVED'
  | 'CLOSED';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TxType = 'DEPOSIT' | 'PURCHASE' | 'REFUND' | 'ADJUSTMENT' | 'BONUS';

/** Order status → badge variant. */
export const orderStatusVariant: Record<OrderStatus, BadgeVariant> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  COMPLETED: 'success',
  FAILED: 'destructive',
  CANCELLED: 'secondary',
  REFUNDED: 'secondary',
  PARTIAL: 'warning',
};

/** Ticket status → badge variant. */
export const ticketStatusVariant: Record<TicketStatus, BadgeVariant> = {
  OPEN: 'warning',
  IN_PROGRESS: 'info',
  WAITING_CUSTOMER: 'secondary',
  RESOLVED: 'success',
  CLOSED: 'secondary',
};

/** Ticket priority → badge variant. */
export const ticketPriorityVariant: Record<TicketPriority, BadgeVariant> = {
  LOW: 'secondary',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'destructive',
};

/** Transaction type → text color class. */
export const txTypeColor: Record<TxType, string> = {
  DEPOSIT: 'text-success',
  PURCHASE: 'text-destructive',
  REFUND: 'text-success',
  ADJUSTMENT: 'text-primary',
  BONUS: 'text-warning',
};

/**
 * Look up a badge variant by status string. Falls back to `secondary` so an
 * unrecognized server value never renders as an unstyled/default badge.
 */
export function variantForStatus(
  status: string | undefined,
  map: Record<string, BadgeVariant>,
): BadgeVariant {
  if (!status) return 'secondary';
  return map[status] ?? 'secondary';
}

/** Human-readable label: SNAKE_CASE → Title Case. */
export function humanizeStatus(status: string | undefined): string {
  if (!status) return '';
  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
