'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bitcoin,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Landmark,
  Loader2,
  Wallet as WalletIcon,
} from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { formatDate, formatSignedAmount, toNumber } from '@/lib/format';
import { txTypeColor, type TxType } from '@/lib/status';
import { useTransactions, useWallet } from '@/lib/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedCurrency } from '@/components/ui/animated-number';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { StaggerItem, StaggerList } from '@/components/motion';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const TX_PAGE_SIZE = 20;

const txTypeIcons: Record<TxType, typeof ArrowDownLeft> = {
  DEPOSIT: ArrowDownLeft,
  PURCHASE: ArrowUpRight,
  REFUND: ArrowDownLeft,
  ADJUSTMENT: ArrowDownLeft,
  BONUS: ArrowDownLeft,
};

const gateways = [
  { id: 'crypto', name: 'Crypto', icon: Bitcoin, description: 'BTC, ETH, USDT' },
];

export default function WalletPage() {
  const [amount, setAmount] = useState('');
  const [gateway, setGateway] = useState('crypto');
  const [txPage, setTxPage] = useState(1);
  const { toast } = useToast();

  const wallet = useWallet();
  const transactions = useTransactions({ page: txPage, limit: TX_PAGE_SIZE });

  const deposit = useMutation({
    mutationFn: (body: { amount: number; gateway: string }) =>
      api.post('/payments/deposit', body).then((r) => r.data),
    onSuccess: (data: { checkoutUrl?: string }) => {
      toast({
        title: 'Deposit initiated',
        description: 'Complete the payment to credit your wallet.',
      });
      if (data?.checkoutUrl) window.location.href = data.checkoutUrl;
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Deposit failed',
        description: getErrorMessage(error, 'Could not start the deposit.'),
      });
    },
  });

  const parsed = toNumber(amount);
  const canSubmit = parsed > 0 && !deposit.isPending;

  const txList = transactions.data?.transactions ?? [];
  const txTotal = transactions.data?.total ?? 0;
  const txTotalPages = Math.max(1, Math.ceil(txTotal / TX_PAGE_SIZE));

  if (wallet.isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-40 w-full rounded-lg" />
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="h-96 w-full rounded-lg" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (wallet.isError) {
    return (
      <ErrorState
        error={wallet.error}
        title="Could not load wallet"
        onRetry={() => wallet.refetch()}
      />
    );
  }

  return (
    <StaggerList className="space-y-8">
      <StaggerItem>
        <PageHeader title="Wallet" description="Manage your balance and transactions" />
      </StaggerItem>

      {/* Balance hero */}
      <StaggerItem>
        <div className="relative overflow-hidden rounded-[16px] bg-foreground p-6 text-background">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{ background: 'radial-gradient(ellipse 80% 60% at 100% 0%, hsl(10 100% 55%), transparent)' }}
            aria-hidden
          />
          <div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-50">
                Available Balance
              </p>
              <h2 className="mt-2 text-4xl font-bold tabular-nums tracking-tight leading-none sm:text-5xl">
                <AnimatedCurrency
                  value={wallet.data?.balance ?? 0}
                  currency={wallet.data?.currency}
                />
              </h2>
              <p className="mt-2 text-xs opacity-40">
                {wallet.data?.currency ?? 'USD'} · {wallet.data?.status ?? 'ACTIVE'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/10">
                <WalletIcon className="h-5 w-5 opacity-70" aria-hidden />
              </div>
            </div>
          </div>
        </div>
      </StaggerItem>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Deposit */}
        <StaggerItem>
          <Card className="rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
                  <CreditCard className="h-4 w-4 text-success" aria-hidden />
                </div>
                Deposit Funds
              </CardTitle>
              <CardDescription>Add money to your wallet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">$</span>
                  <Input
                    id="amount"
                    type="number"
                    inputMode="decimal"
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8 text-lg font-semibold tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <div className="grid gap-2">
                  {gateways.map((gw) => {
                    const selected = gateway === gw.id;
                    return (
                      <button
                        key={gw.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setGateway(gw.id)}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200',
                          selected
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/30 hover:bg-muted/30'
                        )}
                      >
                        <div className={cn(
                          'flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200',
                          selected ? 'bg-primary/10 text-primary scale-110' : 'bg-muted text-muted-foreground'
                        )}>
                          <gw.icon className="h-5 w-5" aria-hidden />
                        </div>
                        <div>
                          <p className="font-semibold">{gw.name}</p>
                          <p className="text-xs text-muted-foreground">{gw.description}</p>
                        </div>
                        {selected && (
                          <div className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 12 12">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {gateway === 'crypto' && (
                <div className="rounded-xl border border-info/20 bg-info/5 px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    A deposit address and QR code will be generated when you continue. Funds are credited after network confirmations.
                  </p>
                </div>
              )}

              <Button className="w-full" size="lg" disabled={!canSubmit} onClick={() => deposit.mutate({ amount: parsed, gateway })}>
                {deposit.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing…</>
                ) : (
                  'Proceed to Payment'
                )}
              </Button>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Transactions */}
        <StaggerItem>
          <Card className="flex h-full flex-col rounded-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Landmark className="h-4 w-4 text-primary" aria-hidden />
                </div>
                <div>
                  <CardTitle className="text-base">Transaction History</CardTitle>
                  <CardDescription>
                    {txTotal > 0
                      ? `${txTotal.toLocaleString()} transaction${txTotal === 1 ? '' : 's'}`
                      : 'Your recent wallet activity'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              {transactions.isError ? (
                <ErrorState error={transactions.error} title="Could not load transactions" onRetry={() => transactions.refetch()} />
              ) : transactions.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 py-2">
                      <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                      <div className="space-y-1.5 text-right">
                        <Skeleton className="h-3.5 w-16" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : txList.length === 0 ? (
                <EmptyState icon={WalletIcon} title="No transactions yet" description="Deposits and purchases will appear here" />
              ) : (
                <>
                  <ul className="flex-1 divide-y divide-border/60">
                    {txList.map((tx) => {
                      const Icon = txTypeIcons[tx.type as TxType] ?? ArrowDownLeft;
                      const { text, negative } = formatSignedAmount(tx.amount, tx.currency);
                      return (
                        <li key={tx.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                            <Icon className={cn('h-5 w-5', txTypeColor[tx.type as TxType])} aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">
                              {tx.type.charAt(0) + tx.type.slice(1).toLowerCase()}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {tx.description || 'No description'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={cn('font-bold tabular-nums text-sm', negative ? 'text-destructive' : 'text-success')}>
                              {text}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {txTotalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
                      <span className="text-xs text-muted-foreground">Page {txPage} of {txTotalPages}</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => setTxPage((p) => Math.max(1, p - 1))} disabled={txPage <= 1 || transactions.isFetching} aria-label="Previous page">
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setTxPage((p) => Math.min(txTotalPages, p + 1))} disabled={txPage >= txTotalPages || transactions.isFetching} aria-label="Next page">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </StaggerItem>
      </div>
    </StaggerList>
  );
}
