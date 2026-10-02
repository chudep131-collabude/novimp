'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/format';
import { humanizeStatus } from '@/lib/status';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { StaggerList, StaggerItem } from '@/components/motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Mail,
  Shield,
  Key,
  Loader2,
  Check,
  Calendar,
  ExternalLink,
  Pencil,
  Shuffle,
  Send,
  Unlink,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, isSyntheticEmail } from '@/lib/utils';

/* ── Types ──────────────────────────────────────────────────────── */

interface ProfileUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  telegramId?: string | null;
  telegramUsername?: string | null;
  role: string;
  status: string;
  emailVerified?: boolean;
  createdAt?: string;
}

const profileSchema = z.object({
  firstName: z.string().max(60).optional(),
  lastName: z.string().max(60).optional(),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

function initials(user: ProfileUser): string {
  const a = user.firstName?.[0] ?? '';
  const b = user.lastName?.[0] ?? '';
  return (a + b).toUpperCase() || user.email[0]?.toUpperCase() || '?';
}



/* ── DiceBear avatar catalog ──────────────────────────────────────── */

const AVATAR_SEEDS = [
  'Felix', 'Mia', 'Noah', 'Zoe', 'Leo', 'Ava',
  'Lucas', 'Emma', 'Ethan', 'Lily', 'Ryan', 'Grace',
  'Aiden', 'Chloe', 'Mason', 'Ella', 'Liam', 'Nora',
  'Oliver', 'Sofia', 'James', 'Riley', 'Jack', 'Luna',
  'Henry', 'Hazel', 'Sebastian', 'Violet', 'Dylan', 'Aurora',
  'Caleb', 'Penelope',
];

const BG_COLORS = [
  'b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc',
  'ffdfbf', 'c1f0c1', 'f4e0b6', 'e0c1f4',
];

type AvatarStyle = 'avataaars' | 'lorelei' | 'notionists';

const STYLES: { value: AvatarStyle; label: string }[] = [
  { value: 'avataaars',  label: 'Illustrated' },
  { value: 'lorelei',    label: 'Minimal' },
  { value: 'notionists', label: 'Notion' },
];

function dicebearUrl(seed: string, style: AvatarStyle, idx: number): string {
  const bg = BG_COLORS[idx % BG_COLORS.length];
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg}&radius=50`;
}

/* ── Avatar picker dialog ─────────────────────────────────────────── */

function AvatarPickerDialog({
  open,
  current,
  onClose,
  onPick,
  isSaving,
}: {
  open: boolean;
  current?: string | null;
  onClose: () => void;
  onPick: (url: string) => void;
  isSaving: boolean;
}) {
  const [style, setStyle] = useState<AvatarStyle>('avataaars');
  const [selected, setSelected] = useState<string | null>(current ?? null);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose your avatar</DialogTitle>
          <DialogDescription>
            Pick any avatar — it will show across the platform.
          </DialogDescription>
        </DialogHeader>

        {/* Style switcher */}
        <div className="flex gap-2">
          {STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStyle(s.value)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                style === s.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Avatar grid */}
        <div className="grid grid-cols-6 gap-3 max-h-72 overflow-y-auto pr-1">
          {AVATAR_SEEDS.map((seed, i) => {
            const url = dicebearUrl(seed, style, i);
            const isSelected = selected === url;
            return (
              <button
                key={`${style}-${seed}`}
                type="button"
                onClick={() => setSelected(url)}
                className={cn(
                  'relative rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110',
                )}
                aria-label={`Avatar: ${seed}`}
                aria-pressed={isSelected}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={seed}
                  width={56}
                  height={56}
                  loading="lazy"
                  className="h-full w-full rounded-full"
                />
                {isSelected && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!selected || isSaving}
            onClick={() => selected && onPick(selected)}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Use this avatar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Telegram link card ───────────────────────────────────────────── */

function TelegramLinkCard({
  telegramId,
  telegramUsername,
  onUnlinked,
}: {
  telegramId?: string | null;
  telegramUsername?: string | null;
  onUnlinked: () => void;
}) {
  const unlink = useMutation({
    mutationFn: () => api.delete('/users/me/telegram').then((r) => r.data),
    onSuccess: () => {
      toast({ title: 'Telegram unlinked' });
      onUnlinked();
    },
    onError: (err) =>
      toast({ variant: 'destructive', title: 'Failed to unlink', description: getErrorMessage(err) }),
  });

  const isLinked = !!telegramId;

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10">
            <Send className="h-4 w-4 text-sky-500" aria-hidden />
          </div>
          Telegram Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLinked ? (
          <>
            <div className="flex items-center justify-between rounded-xl bg-sky-500/5 border border-sky-500/20 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/15 text-sky-500 text-sm font-bold">
                  tg
                </span>
                <div>
                  <p className="text-sm font-medium">
                    {telegramUsername ? `@${telegramUsername}` : `ID: ${telegramId}`}
                  </p>
                  <p className="text-xs text-muted-foreground">Receiving order & platform notifications</p>
                </div>
              </div>
              <Badge variant="success" className="shrink-0">Connected</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive hover:border-destructive/40 hover:bg-destructive/5"
              onClick={() => unlink.mutate()}
              disabled={unlink.isPending}
            >
              {unlink.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Unlink className="h-3.5 w-3.5" />
              )}
              Disconnect Telegram
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Connect your Telegram account to receive order updates and platform announcements directly in Telegram.
            </p>
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
              <p className="text-sm font-medium">How to connect:</p>
              <ol className="space-y-2 text-sm text-muted-foreground list-none">
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold mt-0.5">1</span>
                  Open our Telegram bot
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold mt-0.5">2</span>
                  Send <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">/start</code> to get your link code
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold mt-0.5">3</span>
                  Or log in via Telegram on the sign-in page to auto-link
                </li>
              </ol>
              <Button size="sm" variant="outline" className="gap-2 w-full" asChild>
                <a
                  href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'NoviMPBot'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Send className="h-3.5 w-3.5" />
                  Open Telegram Bot
                </a>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Profile page ─────────────────────────────────────────────────── */

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: user, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['user'],
    queryFn: () => api.get<ProfileUser>('/users/me').then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: '', lastName: '' },
  });

  const updateProfile = useMutation({
    mutationFn: (data: Partial<ProfileFormValues & { avatarUrl: string }>) =>
      api.put('/users/me', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setIsEditing(false);
      setPickerOpen(false);
      toast({ title: 'Profile updated' });
    },
    onError: (err) =>
      toast({ variant: 'destructive', title: 'Update failed', description: getErrorMessage(err) }),
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="max-w-2xl">
        <ErrorState error={error} title="Could not load profile" onRetry={() => refetch()} />
      </div>
    );
  }

  const startEdit = () => {
    reset({ firstName: user.firstName ?? '', lastName: user.lastName ?? '' });
    setIsEditing(true);
  };

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');

  return (
    <StaggerList className="max-w-2xl space-y-5">
      <StaggerItem>
        <PageHeader title="Profile" description="Manage your account settings." />
      </StaggerItem>

      {/* ── Identity card ────────────────────────────────────────────── */}
      <StaggerItem>
        <Card className="overflow-hidden rounded-2xl">
          {/* Gradient banner */}
          <div className="h-24 brand-gradient-strong" />

          <CardContent className="px-5 pb-6">
            {/* Avatar + action buttons row — avatar overlaps banner */}
            <div className="flex items-end justify-between -mt-10 mb-4">
              {/* Avatar with hover overlay */}
              <div className="group relative shrink-0">
                <Avatar className="h-20 w-20 rounded-full border-4 border-card shadow-lg">
                  <AvatarImage
                    src={user.avatarUrl ?? ''}
                    alt="Profile avatar"
                    className="rounded-full object-cover"
                  />
                  <AvatarFallback className="rounded-full bg-primary text-2xl font-bold text-primary-foreground select-none">
                    {initials(user)}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label="Change avatar"
                >
                  <Shuffle className="h-5 w-5 text-white" />
                </button>
              </div>

              {/* Buttons aligned to bottom of avatar */}
              <div className="flex gap-2 pb-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPickerOpen(true)}
                  className="h-8 gap-1.5 text-xs"
                >
                  <Shuffle className="h-3.5 w-3.5" aria-hidden />
                  Avatar
                </Button>
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startEdit}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Edit
                  </Button>
                )}
              </div>
            </div>

            {/* Name / email / meta */}
            <div className="space-y-1">
              <p className="text-lg font-bold tracking-tight leading-tight">
                {fullName || (
                  <span className="italic text-base text-muted-foreground">No name set</span>
                )}
              </p>
              <p className="text-sm text-muted-foreground break-all">{user.email}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="secondary">{humanizeStatus(user.role)}</Badge>
                {user.createdAt && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" aria-hidden />
                    Joined {formatDate(user.createdAt)}
                  </span>
                )}
              </div>
            </div>

            {/* Edit form */}
            {isEditing && (
              <form
                onSubmit={handleSubmit((data) => updateProfile.mutate(data))}
                className="mt-5 space-y-4 border-t border-border pt-5"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      autoComplete="given-name"
                      aria-invalid={!!errors.firstName}
                      {...register('firstName')}
                    />
                    {errors.firstName && (
                      <p className="text-xs text-destructive" role="alert">
                        {errors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      autoComplete="family-name"
                      aria-invalid={!!errors.lastName}
                      {...register('lastName')}
                    />
                    {errors.lastName && (
                      <p className="text-xs text-destructive" role="alert">
                        {errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateProfile.isPending} className="gap-2">
                    {updateProfile.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Save changes
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </StaggerItem>

      {/* ── Account status ───────────────────────────────────────────── */}
      <StaggerItem>
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-4 w-4 text-primary" aria-hidden />
              </div>
              Account Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" aria-hidden />
                <div>
                  <span className="text-sm font-medium">Email Verification</span>
                  {isSyntheticEmail(user.email) && (
                    <p className="text-xs text-muted-foreground mt-0.5">Telegram login — no email on file</p>
                  )}
                </div>
              </div>
              {isSyntheticEmail(user.email) ? (
                <Badge variant="secondary">N/A</Badge>
              ) : user.emailVerified ? (
                <Badge variant="success">Verified</Badge>
              ) : (
                <Badge variant="warning">Pending</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </StaggerItem>

      {/* ── Telegram ─────────────────────────────────────────────────── */}
      <StaggerItem>
        <TelegramLinkCard
          telegramId={user.telegramId}
          telegramUsername={user.telegramUsername}
          onUnlinked={() => queryClient.invalidateQueries({ queryKey: ['user'] })}
        />
      </StaggerItem>

      {/* ── Security ─────────────────────────────────────────────────── */}
      <StaggerItem>
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
                <Key className="h-4 w-4 text-warning" aria-hidden />
              </div>
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To change your password, use the forgot-password flow. A one-time code will be sent
              to your email.
            </p>
            <Button variant="outline" asChild className="gap-2">
              <Link href="/forgot-password">
                <ExternalLink className="h-4 w-4" aria-hidden />
                Change password
              </Link>
            </Button>
          </CardContent>
        </Card>
      </StaggerItem>

      {/* ── Avatar picker ─────────────────────────────────────────────── */}
      <AvatarPickerDialog
        open={pickerOpen}
        current={user.avatarUrl}
        onClose={() => setPickerOpen(false)}
        onPick={(avatarUrl) => updateProfile.mutate({ avatarUrl })}
        isSaving={updateProfile.isPending}
      />
    </StaggerList>
  );
}
