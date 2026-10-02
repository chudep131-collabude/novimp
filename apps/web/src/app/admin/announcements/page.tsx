'use client';

import * as React from 'react';
import {
  Bell,
  Loader2,
  Megaphone,
  Plus,
  RefreshCw,
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
import { Textarea } from '@/components/ui/textarea';
import {
  useAdminAnnouncements,
  useCreateAnnouncement,
  useToggleAnnouncement,
} from '@/lib/admin-queries';
import { formatDate, formatRelativeTime } from '@/lib/format';
import { ADMIN_ROLES, type Announcement, type AnnouncementType } from '@/lib/types';
import { cn } from '@/lib/utils';

/* ── type colours ─────────────────────────────────────────────── */

const TYPE_CONFIG: Record<
  AnnouncementType,
  { label: string; dot: string; badge: 'info' | 'warning' | 'secondary' | 'success' }
> = {
  INFO:        { label: 'Info',        dot: 'bg-blue-500',   badge: 'info' },
  WARNING:     { label: 'Warning',     dot: 'bg-amber-500',  badge: 'warning' },
  MAINTENANCE: { label: 'Maintenance', dot: 'bg-orange-500', badge: 'warning' },
  PROMOTION:   { label: 'Promotion',   dot: 'bg-emerald-500', badge: 'success' },
};

export default function AdminAnnouncementsPage() {
  return (
    <RequireRole allow={ADMIN_ROLES}>
      <AdminAnnouncementsContent />
    </RequireRole>
  );
}

function AdminAnnouncementsContent() {
  const [creating, setCreating] = React.useState(false);

  const query = useAdminAnnouncements();
  const toggle = useToggleAnnouncement();

  const announcements: Announcement[] = query.data ?? [];

  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title="Could not load announcements"
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Broadcast platform news, maintenance windows, and promotions to all users."
        actions={
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={() => query.refetch()}
              aria-label="Refresh"
            >
              <RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />
            </Button>
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New announcement
            </Button>
          </>
        }
      />

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements yet"
          description="Create one to broadcast a message to all users and Telegram subscribers."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New announcement
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              toggling={toggle.isPending && toggle.variables?.id === a.id}
              onToggle={(isActive) => toggle.mutate({ id: a.id, isActive })}
            />
          ))}
        </div>
      )}

      <CreateAnnouncementDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

/* ── AnnouncementCard ─────────────────────────────────────────── */

function AnnouncementCard({
  announcement: a,
  toggling,
  onToggle,
}: {
  announcement: Announcement;
  toggling: boolean;
  onToggle: (isActive: boolean) => void;
}) {
  const cfg = TYPE_CONFIG[a.type] ?? TYPE_CONFIG.INFO;

  return (
    <Card className={cn(!a.isActive && 'opacity-60')}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Type dot */}
          <span
            className={cn(
              'mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              `${cfg.dot}/10`,
            )}
            aria-hidden
          >
            <span className={cn('h-2.5 w-2.5 rounded-full', cfg.dot)} />
          </span>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="font-semibold">{a.title}</span>
              <Badge variant={cfg.badge}>{cfg.label}</Badge>
              {!a.isActive && (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{a.content}</p>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span>Created {formatRelativeTime(a.createdAt)}</span>
              {a.startsAt && <span>Starts {formatDate(a.startsAt)}</span>}
              {a.expiresAt && <span>Expires {formatDate(a.expiresAt)}</span>}
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            {toggling ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Switch
                checked={a.isActive}
                onCheckedChange={onToggle}
                aria-label={a.isActive ? 'Deactivate announcement' : 'Activate announcement'}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── CreateAnnouncementDialog ─────────────────────────────────── */

function CreateAnnouncementDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [type, setType] = React.useState<AnnouncementType>('INFO');
  const [startsAt, setStartsAt] = React.useState('');
  const [expiresAt, setExpiresAt] = React.useState('');

  const create = useCreateAnnouncement();

  // Reset when dialog opens
  React.useEffect(() => {
    if (open) {
      setTitle('');
      setContent('');
      setType('INFO');
      setStartsAt('');
      setExpiresAt('');
    }
  }, [open]);

  const isValid = title.trim().length > 0 && content.trim().length > 0;

  const submit = () => {
    if (!isValid) return;
    create.mutate(
      {
        title: title.trim(),
        content: content.trim(),
        type,
        startsAt: startsAt || undefined,
        expiresAt: expiresAt || undefined,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New announcement</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5 text-primary" />
            On save, this will be broadcast to all Telegram-linked users.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="ann-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ann-title"
              placeholder="e.g. Scheduled maintenance on Friday"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label htmlFor="ann-content">
              Content <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="ann-content"
              rows={4}
              placeholder="Describe the announcement in detail…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label htmlFor="ann-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as AnnouncementType)}>
              <SelectTrigger id="ann-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INFO">Info — general update</SelectItem>
                <SelectItem value="WARNING">Warning — important notice</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance — scheduled downtime</SelectItem>
                <SelectItem value="PROMOTION">Promotion — offer or discount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Optional date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ann-starts">Starts at (optional)</Label>
              <Input
                id="ann-starts"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ann-expires">Expires at (optional)</Label>
              <Input
                id="ann-expires"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!isValid || create.isPending}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create &amp; broadcast
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
