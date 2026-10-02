'use client';

import * as React from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { RequireRole } from '@/components/auth/require-role';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuditLogs } from '@/lib/admin-queries';
import { formatDate, formatRelativeTime } from '@/lib/format';
import { ADMIN_ROLES, type AuditLogEntry } from '@/lib/types';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 50;

/** Colour-code entries by the verb implied in the action name. */
function actionVariant(action: string) {
  if (/(delete|remove|ban|suspend|fail)/.test(action)) return 'destructive' as const;
  if (/(approve|complete|resume|enable|resolve)/.test(action)) return 'success' as const;
  if (/(pause|update|refund|review)/.test(action)) return 'warning' as const;
  if (/(create|register|add)/.test(action)) return 'info' as const;
  return 'secondary' as const;
}

export default function AdminAuditLogsPage() {
  return (
    <RequireRole allow={ADMIN_ROLES}>
      <AdminAuditLogsContent />
    </RequireRole>
  );
}

function AdminAuditLogsContent() {
  const [page, setPage] = React.useState(1);
  const [actionInput, setActionInput] = React.useState('');
  const [action, setAction] = React.useState('');
  const [expanded, setExpanded] = React.useState<string | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setAction(actionInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [actionInput]);

  const logsQuery = useAuditLogs({ page, limit: PAGE_SIZE, action });
  const data = logsQuery.data;
  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (logsQuery.isError) {
    return (
      <ErrorState
        error={logsQuery.error}
        title="Could not load audit logs"
        onRetry={() => logsQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit logs"
        description="Immutable record of privileged actions taken in the console."
        actions={
          <>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={actionInput}
                onChange={(e) => setActionInput(e.target.value)}
                placeholder="Filter by action, e.g. order.status_update"
                className="pl-9"
                aria-label="Filter by action"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => logsQuery.refetch()} aria-label="Refresh">
              <RefreshCw className={cn('h-4 w-4', logsQuery.isFetching && 'animate-spin')} />
            </Button>
          </>
        }
      />

      {logsQuery.isLoading ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={action ? 'No matching entries' : 'No audit entries yet'}
          description={
            action
              ? `Nothing matched “${action}”. Try a different action key.`
              : 'Privileged actions such as order status changes and deposit approvals will be recorded here.'
          }
          action={
            action ? (
              <Button variant="outline" size="sm" onClick={() => setActionInput('')}>
                Clear filter
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <AuditRow
              key={log.id}
              log={log}
              open={expanded === log.id}
              onToggle={() => setExpanded((prev) => (prev === log.id ? null : log.id))}
            />
          ))}
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            {total.toLocaleString()} {total === 1 ? 'entry' : 'entries'}
            {logsQuery.isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
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
    </div>
  );
}

function AuditRow({
  log,
  open,
  onToggle,
}: {
  log: AuditLogEntry;
  open: boolean;
  onToggle: () => void;
}) {
  const actor = log.user
    ? [log.user.firstName, log.user.lastName].filter(Boolean).join(' ') || log.user.email
    : 'System';

  const hasDetail = log.oldValue || log.newValue || log.reason;

  return (
    <Card>
      <CardContent className="p-0">
        <button
          type="button"
          onClick={hasDetail ? onToggle : undefined}
          className={cn(
            'flex w-full items-center gap-3 p-4 text-left transition-colors',
            hasDetail && 'hover:bg-muted/40',
          )}
        >
          <Badge variant={actionVariant(log.action)} className="shrink-0 font-mono text-[10px]">
            {log.action}
          </Badge>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">
              <span className="font-medium">{actor}</span>
              <span className="text-muted-foreground">
                {' '}
                on {log.entityType}
              </span>
            </p>
            <p className="truncate font-mono text-xs text-muted-foreground">{log.entityId}</p>
          </div>
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:block" title={formatDate(log.createdAt)}>
            {formatRelativeTime(log.createdAt)}
          </span>
          {hasDetail && (
            <ChevronDown
              className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
            />
          )}
        </button>

        {open && hasDetail && (
          <div className="space-y-3 border-t border-border/60 bg-muted/20 p-4">
            {log.reason && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Reason</p>
                <p className="text-sm">{log.reason}</p>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {log.oldValue && Object.keys(log.oldValue).length > 0 && (
                <JsonBlock label="Before" value={log.oldValue} />
              )}
              {log.newValue && Object.keys(log.newValue).length > 0 && (
                <JsonBlock label="After" value={log.newValue} />
              )}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>At {formatDate(log.createdAt)}</span>
              {log.ipAddress && <span>IP {log.ipAddress}</span>}
              {log.userId && <span className="font-mono">Actor {log.userId}</span>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function JsonBlock({ label, value }: { label: string; value: Record<string, unknown> }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <pre className="overflow-x-auto rounded-lg bg-background/60 p-3 text-xs leading-relaxed">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
