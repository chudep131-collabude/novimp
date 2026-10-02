'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Network, Smartphone, BarChart3, MessageCircleQuestion, ChevronRight,
  LogOut, Pencil, ClipboardList, CreditCard, AtSign,
  Lock, Shield, FileText,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/auth/auth-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

interface ProfileUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  role: string;
  emailVerified?: boolean;
}

function initials(user: ProfileUser) {
  const a = user.firstName?.[0] ?? '';
  const b = user.lastName?.[0] ?? '';
  return (a + b).toUpperCase() || user.email[0]?.toUpperCase() || '?';
}

/* ── Section row ──────────────────────────────────────────────────────────── */
function Row({
  icon: Icon,
  label,
  href,
  destructive,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  href?: string;
  destructive?: boolean;
  onClick?: () => void;
}) {
  const cls = `flex items-center gap-4 px-4 py-3.5 transition-colors
    ${destructive ? 'hover:bg-destructive/5' : 'hover:bg-muted/50'}`;

  const inner = (
    <>
      <Icon className={`h-[18px] w-[18px] shrink-0 ${destructive ? 'text-destructive' : 'text-muted-foreground'}`} />
      <span className={`flex-1 text-sm font-medium ${destructive ? 'text-destructive' : ''}`}>{label}</span>
      {!destructive && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />}
    </>
  );

  if (onClick) {
    return <button type="button" onClick={onClick} className={`w-full text-left ${cls}`}>{inner}</button>;
  }
  return <Link href={href!} className={cls}>{inner}</Link>;
}

/* ── Section group ────────────────────────────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <div className="overflow-hidden rounded-2xl bg-card divide-y divide-border/40">
        {children}
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function AccountPage() {
  const { logout } = useAuth();

  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: () => api.get<ProfileUser>('/users/me').then((r) => r.data),
  });

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-4">

      {/* ── Avatar + name row ─────────────────────────────────────────── */}
      <div className="flex items-center gap-4 rounded-2xl bg-card px-4 py-4">
        <Avatar className="h-14 w-14 shrink-0 rounded-full border-2 border-primary/20">
          <AvatarImage src={user?.avatarUrl ?? ''} alt="Profile" className="rounded-full" />
          <AvatarFallback className="bg-primary/10 text-base font-bold text-primary">
            {isLoading ? '…' : user ? initials(user) : '?'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
          ) : (
            <>
              <p className="truncate font-semibold">
                {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'No name set'}
              </p>
              <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
            </>
          )}
        </div>

        <Link
          href="/profile"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          aria-label="Edit profile"
        >
          <Pencil className="h-4 w-4" />
        </Link>
      </div>

      {/* ── General ───────────────────────────────────────────────────── */}
      <Section title="General">
        <Row icon={CreditCard}   label="Wallet"        href="/wallet" />
        <Row icon={ClipboardList} label="My Orders"    href="/orders" />
        <Row icon={Lock}         label="Change Password" href="/forgot-password" />
        <Row icon={Shield}       label="Profile & Security" href="/profile" />
      </Section>

      {/* ── Services ──────────────────────────────────────────────────── */}
      <Section title="Services">
        <Row icon={Network}    label="Proxies"        href="/proxy" />
        <Row icon={Smartphone} label="Phone Numbers"  href="/numbers" />
        <Row icon={BarChart3}  label="SMM Panel"      href="/smm" />
        <Row icon={AtSign}     label="Temp Email"     href="/email" />
      </Section>

      {/* ── Support ───────────────────────────────────────────────────── */}
      <Section title="Support">
        <Row icon={MessageCircleQuestion} label="Get Help"            href="/support" />
        <Row icon={FileText}              label="Terms & Conditions"  href="/terms" />
      </Section>

      {/* ── Sign out ──────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl bg-card">
        <Row icon={LogOut} label="Log Out" destructive onClick={logout} />
      </div>

    </div>
  );
}
