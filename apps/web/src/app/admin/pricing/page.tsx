'use client';

import * as React from 'react';
import {
  Loader2,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
} from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  usePricingRules,
  useCreatePricingRule,
  useUpdatePricingRule,
  useDeletePricingRule,
} from '@/lib/admin-queries';
import { toNumber } from '@/lib/format';
import { ADMIN_ROLES, type PricingRule, type PricingRuleType, type PricingTargetType, type CreatePricingRuleDto } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/auth-provider';

/* ── helpers ──────────────────────────────────────────────────── */

const RULE_TYPE_LABELS: Record<PricingRuleType, string> = {
  MARKUP_PERCENT: 'Markup %',
  MARKUP_FIXED:   'Fixed add-on',
  OVERRIDE:       'Price override',
};

const TARGET_TYPE_LABELS: Record<PricingTargetType, string> = {
  global:   'Global (all services)',
  category: 'Category',
  service:  'Service',
  provider: 'Provider',
};

const RULE_TYPE_VARIANT: Record<PricingRuleType, 'info' | 'warning' | 'secondary'> = {
  MARKUP_PERCENT: 'info',
  MARKUP_FIXED:   'warning',
  OVERRIDE:       'secondary',
};

/* ── page ─────────────────────────────────────────────────────── */

export default function AdminPricingPage() {
  return (
    <RequireRole allow={ADMIN_ROLES}>
      <AdminPricingContent />
    </RequireRole>
  );
}

function AdminPricingContent() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [creating, setCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<PricingRule | null>(null);

  const query = usePricingRules();
  const updateRule = useUpdatePricingRule();
  const deleteRule = useDeletePricingRule();

  const rules: PricingRule[] = query.data ?? [];

  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title="Could not load pricing rules"
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing rules"
        description="Set global, category, service, or provider-level markup rules applied to customer prices."
        actions={
          <>
            <Button variant="outline" size="icon" onClick={() => query.refetch()} aria-label="Refresh">
              <RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />
            </Button>
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New rule
            </Button>
          </>
        }
      />

      {query.isLoading ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : rules.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No pricing rules"
          description="Rules override or augment the base provider price when calculating customer prices."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New rule
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead className="text-right">Markup %</TableHead>
                  <TableHead className="text-right">Fixed</TableHead>
                  <TableHead className="text-right">Priority</TableHead>
                  <TableHead>Active</TableHead>
                  {isSuperAdmin && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <PricingRuleRow
                    key={rule.id}
                    rule={rule}
                    isSuperAdmin={isSuperAdmin}
                    toggling={
                      updateRule.isPending &&
                      (updateRule.variables as any)?.id === rule.id
                    }
                    onToggle={(isActive) =>
                      updateRule.mutate({ id: rule.id, dto: { isActive } })
                    }
                    onDelete={() => setDeleting(rule)}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <CreateRuleDialog open={creating} onClose={() => setCreating(false)} />

      <DeleteRuleDialog
        rule={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            deleteRule.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
          }
        }}
        pending={deleteRule.isPending}
      />
    </div>
  );
}

/* ── PricingRuleRow ───────────────────────────────────────────── */

function PricingRuleRow({
  rule,
  isSuperAdmin,
  toggling,
  onToggle,
  onDelete,
}: {
  rule: PricingRule;
  isSuperAdmin: boolean;
  toggling: boolean;
  onToggle: (isActive: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <TableRow className={cn(!rule.isActive && 'opacity-50')}>
      <TableCell className="font-medium">{rule.name}</TableCell>
      <TableCell>
        <Badge variant={RULE_TYPE_VARIANT[rule.ruleType] ?? 'secondary'}>
          {RULE_TYPE_LABELS[rule.ruleType]}
        </Badge>
      </TableCell>
      <TableCell className="text-sm">
        {TARGET_TYPE_LABELS[rule.targetType as PricingTargetType] ?? rule.targetType}
        {rule.targetId && (
          <span className="ml-1.5 font-mono text-xs text-muted-foreground">
            {rule.targetId.slice(0, 8)}…
          </span>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {toNumber(rule.markupPercent) !== 0 ? `${toNumber(rule.markupPercent)}%` : '—'}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {rule.fixedAmount ? `$${toNumber(rule.fixedAmount).toFixed(4)}` : '—'}
      </TableCell>
      <TableCell className="text-right tabular-nums">{rule.priority}</TableCell>
      <TableCell>
        {toggling ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Switch
            checked={rule.isActive}
            onCheckedChange={onToggle}
            aria-label={rule.isActive ? 'Deactivate rule' : 'Activate rule'}
          />
        )}
      </TableCell>
      {isSuperAdmin && (
        <TableCell>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
            aria-label="Delete rule"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
}

/* ── CreateRuleDialog ─────────────────────────────────────────── */

const DEFAULT_FORM: CreatePricingRuleDto = {
  name: '',
  ruleType: 'MARKUP_PERCENT',
  targetType: 'global',
  targetId: '',
  markupPercent: 0,
  fixedAmount: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  isActive: true,
  priority: 0,
};

function CreateRuleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = React.useState<CreatePricingRuleDto>(DEFAULT_FORM);
  const create = useCreatePricingRule();

  React.useEffect(() => {
    if (open) setForm(DEFAULT_FORM);
  }, [open]);

  const set = <K extends keyof CreatePricingRuleDto>(k: K, v: CreatePricingRuleDto[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const isValid = form.name.trim().length > 0;
  const needsTarget = form.targetType !== 'global';

  const submit = () => {
    if (!isValid) return;
    create.mutate(
      {
        ...form,
        name: form.name.trim(),
        targetId: needsTarget && form.targetId?.trim() ? form.targetId.trim() : undefined,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New pricing rule</DialogTitle>
          <DialogDescription>
            Rules are applied when calculating customer prices from provider cost.
            Higher priority rules take precedence.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="pr-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pr-name"
              placeholder="e.g. Global 20% markup"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Rule type */}
            <div className="space-y-1.5">
              <Label htmlFor="pr-type">Rule type</Label>
              <Select
                value={form.ruleType}
                onValueChange={(v) => set('ruleType', v as PricingRuleType)}
              >
                <SelectTrigger id="pr-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MARKUP_PERCENT">Markup % of cost</SelectItem>
                  <SelectItem value="MARKUP_FIXED">Fixed add-on amount</SelectItem>
                  <SelectItem value="OVERRIDE">Price override</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Target type */}
            <div className="space-y-1.5">
              <Label htmlFor="pr-target">Target</Label>
              <Select
                value={form.targetType}
                onValueChange={(v) => set('targetType', v as PricingTargetType)}
              >
                <SelectTrigger id="pr-target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="provider">Provider</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Target ID (when not global) */}
          {needsTarget && (
            <div className="space-y-1.5">
              <Label htmlFor="pr-target-id">
                Target ID{' '}
                <span className="font-normal text-muted-foreground">
                  ({form.targetType} ID or slug)
                </span>
              </Label>
              <Input
                id="pr-target-id"
                placeholder={`Enter ${form.targetType} ID…`}
                value={form.targetId ?? ''}
                onChange={(e) => set('targetId', e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Markup percent */}
            <div className="space-y-1.5">
              <Label htmlFor="pr-markup">Markup %</Label>
              <Input
                id="pr-markup"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={form.markupPercent}
                onChange={(e) => set('markupPercent', parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Fixed amount */}
            <div className="space-y-1.5">
              <Label htmlFor="pr-fixed">Fixed add-on ($)</Label>
              <Input
                id="pr-fixed"
                type="number"
                step="0.0001"
                min="0"
                placeholder="0.0000"
                value={form.fixedAmount ?? ''}
                onChange={(e) =>
                  set('fixedAmount', e.target.value ? parseFloat(e.target.value) : undefined)
                }
              />
            </div>

            {/* Min price */}
            <div className="space-y-1.5">
              <Label htmlFor="pr-min">Min price ($)</Label>
              <Input
                id="pr-min"
                type="number"
                step="0.0001"
                min="0"
                placeholder="No floor"
                value={form.minPrice ?? ''}
                onChange={(e) =>
                  set('minPrice', e.target.value ? parseFloat(e.target.value) : undefined)
                }
              />
            </div>

            {/* Max price */}
            <div className="space-y-1.5">
              <Label htmlFor="pr-max">Max price ($)</Label>
              <Input
                id="pr-max"
                type="number"
                step="0.0001"
                min="0"
                placeholder="No ceiling"
                value={form.maxPrice ?? ''}
                onChange={(e) =>
                  set('maxPrice', e.target.value ? parseFloat(e.target.value) : undefined)
                }
              />
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label htmlFor="pr-priority">Priority</Label>
              <Input
                id="pr-priority"
                type="number"
                step="1"
                placeholder="0"
                value={form.priority ?? 0}
                onChange={(e) => set('priority', parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <Switch
              id="pr-active"
              checked={form.isActive ?? true}
              onCheckedChange={(v) => set('isActive', v)}
            />
            <Label htmlFor="pr-active" className="cursor-pointer">
              Active immediately
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!isValid || create.isPending}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── DeleteRuleDialog ─────────────────────────────────────────── */

function DeleteRuleDialog({
  rule,
  onClose,
  onConfirm,
  pending,
}: {
  rule: PricingRule | null;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <Dialog open={!!rule} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete pricing rule</DialogTitle>
          <DialogDescription>
            This will permanently remove <strong>{rule?.name}</strong>. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
