'use client';

import { use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ShoppingCart,
  Calendar,
  Hash,
  Globe,
  ExternalLink,
  RefreshCw,
  Package,
  TrendingDown,
  Server,
  Clock,
  MapPin,
} from 'lucide-react';
import { useOrderById, useCancelOrder } from '@/lib/queries';
import { formatCurrency, formatDate } from '@/lib/format';
import { orderStatusVariant, variantForStatus, humanizeStatus } from '@/lib/status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state';
import { cn } from '@/lib/utils';

interface Props {
  params: Promise<{ id: string }>;
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono = false,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0', className)}>
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" />
        <span>{label}</span>
      </div>
      <span className={cn('max-w-[60%] break-all text-right text-sm font-medium', mono && 'font-mono')}>
        {value}
      </span>
    </div>
  );
}

const STATUS_DESCRIPTIONS: Record<string, string> = {
  PENDING: 'Your order has been received and is waiting to be sent to the provider.',
  PROCESSING: 'The provider is actively working on your order.',
  COMPLETED: 'Your order has been delivered successfully.',
  FAILED: 'The provider was unable to fulfil this order. A refund will be issued if applicable.',
  CANCELLED: 'This order was cancelled before processing.',
  REFUNDED: 'This order has been refunded to your wallet.',
  PARTIAL: 'Part of your order was delivered. The remainder has been refunded.',
};

export default function OrderDetailPage({ params }: Props) {
  const { id } = use(params);
  const { data: order, isLoading, isError, error, refetch } = useOrderById(id);
  const cancelMutation = useCancelOrder();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/orders">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to orders
          </Link>
        </Button>
        <ErrorState
          error={error}
          title="Could not load order"
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const statusDesc = STATUS_DESCRIPTIONS[order.status] ?? '';
  // Only show cancel if order hasn't progressed far. We allow the backend to reject if the provider says no.
  const isActive = order.status === 'PENDING' || order.status === 'PROCESSING';
  const proxyDetails = order.deliveryData;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/orders">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to orders
          </Link>
        </Button>
        {isActive && (
          <div className="flex items-center gap-2">
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => cancelMutation.mutate(order.id)}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Refresh status
            </Button>
          </div>
        )}
      </div>

      {/* Hero status card */}
      <Card className="overflow-hidden">
        <div
          className={cn(
            'h-1.5 w-full',
            order.status === 'COMPLETED'
              ? 'bg-emerald-500'
              : order.status === 'FAILED' || order.status === 'CANCELLED'
              ? 'bg-destructive'
              : order.status === 'PARTIAL'
              ? 'bg-amber-500'
              : 'bg-primary',
          )}
        />
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className="font-mono text-lg font-bold">{order.orderNumber}</p>
                  <Badge variant={variantForStatus(order.status, orderStatusVariant)}>
                    {humanizeStatus(order.status)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {order.service?.name || 'Service'} &bull;{' '}
                  {order.service?.category || 'General'}
                </p>
                {statusDesc && (
                  <p className="mt-2 text-xs text-muted-foreground">{statusDesc}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums">
                {formatCurrency(order.totalAmount, order.currency)}
              </p>
              <p className="text-xs text-muted-foreground">Total charged</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Order Details
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border/60">
          <DetailRow icon={Hash} label="Order number" value={order.orderNumber} mono />
          <DetailRow
            icon={Calendar}
            label="Placed"
            value={formatDate(order.createdAt)}
          />
          {order.updatedAt && order.updatedAt !== order.createdAt && (
            <DetailRow
              icon={Clock}
              label="Last updated"
              value={formatDate(order.updatedAt)}
            />
          )}
          <DetailRow
            icon={Package}
            label="Quantity"
            value={order.quantity.toLocaleString()}
          />
          {order.service?.name && (
            <DetailRow
              icon={ShoppingCart}
              label="Service"
              value={order.service.name}
            />
          )}
          {order.targetUrl && (
            <DetailRow
              icon={Globe}
              label="Target URL"
              value={
                <a
                  href={order.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  {order.targetUrl.length > 40
                    ? `${order.targetUrl.slice(0, 40)}…`
                    : order.targetUrl}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              }
            />
          )}
          {order.targetUsername && (
            <DetailRow
              icon={Globe}
              label="Target username"
              value={`@${order.targetUsername}`}
              mono
            />
          )}
        </CardContent>
      </Card>

      {order.status === 'COMPLETED' &&
        order.service?.category === 'PROXY' &&
        proxyDetails && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Server className="h-4 w-4" />
                Proxy Connection
              </CardTitle>
              <CardDescription>Use these details in your proxy client.</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/60">
              {proxyDetails.proxyState != null && (
                <DetailRow icon={RefreshCw} label="Proxy status" value={String(proxyDetails.proxyState)} />
              )}
              {proxyDetails.host != null && (
                <DetailRow icon={Globe} label="Host" value={String(proxyDetails.host)} mono />
              )}
              {proxyDetails.port != null && (
                <DetailRow icon={Hash} label="Port" value={String(proxyDetails.port)} mono />
              )}
              {proxyDetails.protocol != null && (
                <DetailRow icon={Server} label="Protocol" value={String(proxyDetails.protocol).toUpperCase()} />
              )}
              {proxyDetails.username != null && (
                <DetailRow icon={Hash} label="Username" value={String(proxyDetails.username)} mono />
              )}
              {proxyDetails.password != null && (
                <DetailRow icon={Hash} label="Password" value={String(proxyDetails.password)} mono />
              )}
              {proxyDetails.countryCode != null && (
                <DetailRow icon={Globe} label="Country" value={String(proxyDetails.countryCode)} />
              )}
              {proxyDetails.city != null && (
                <DetailRow icon={MapPin} label="City" value={String(proxyDetails.city)} />
              )}
              {proxyDetails.expiresAt != null && (
                <DetailRow icon={Calendar} label="Expires" value={formatDate(String(proxyDetails.expiresAt))} />
              )}
              {proxyDetails.rotateIpUrl != null && (
                <DetailRow icon={RefreshCw} label="IP rotation URL" value={String(proxyDetails.rotateIpUrl)} mono />
              )}
            </CardContent>
          </Card>
        )}

      {/* Provider / fulfillment info */}
      {(order.providerOrderId || order.providerStatus || order.startCount != null || order.remains != null) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="h-4 w-4" />
              Fulfillment
            </CardTitle>
            <CardDescription>
              Real-time data from the delivery provider
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border/60">
            {order.providerOrderId && (
              <DetailRow
                icon={Hash}
                label="Provider order ID"
                value={order.providerOrderId}
                mono
              />
            )}
            {order.providerStatus && (
              <DetailRow
                icon={RefreshCw}
                label="Provider status"
                value={order.providerStatus}
              />
            )}
            {order.startCount != null && (
              <DetailRow
                icon={TrendingDown}
                label="Start count"
                value={order.startCount.toLocaleString()}
              />
            )}
            {order.remains != null && (
              <DetailRow
                icon={TrendingDown}
                label="Remaining"
                value={order.remains.toLocaleString()}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Custom data (proxy/number orders) */}
      {order.customData && Object.keys(order.customData).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/60">
            {Object.entries(order.customData).map(([key, val]) => {
              const label = key
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, (s) => s.toUpperCase())
                .replace(/_/g, ' ');
              return (
                <DetailRow
                  key={key}
                  icon={Package}
                  label={label}
                  value={String(val)}
                />
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Support CTA */}
      {(order.status === 'FAILED' || order.status === 'PARTIAL') && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="font-medium">Having an issue with this order?</p>
              <p className="text-sm text-muted-foreground">
                Open a support ticket and include your order number.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/support">Get help</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
