'use client';

import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LogOut, ShieldCheck, ChevronDown, LayoutGrid, House, ClipboardList, CreditCard, CircleUser, Bell, ArrowLeft } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ThemeLogo } from '@/components/theme-logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/theme-toggle';
import { navigation } from '@/components/dashboard/nav-items';
import { useAuth } from '@/components/auth/auth-provider';
import { useWallet } from '@/lib/queries';
import { formatCurrency } from '@/lib/format';
import { EASE_OUT, springSoft } from '@/lib/motion';

function initials(email?: string, first?: string, last?: string) {
  if (first || last) return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || 'U';
  return email?.slice(0, 2).toUpperCase() ?? 'U';
}

const mainNav: typeof navigation = []; // No main header nav
const accountNav = navigation; // Support, Notifications, Account

/** Bottom-nav root pages — these never show a back button. */
const ROOT_PATHS = new Set(['/home', '/orders', '/wallet', '/notifications', '/account']);

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isStaff } = useAuth();
  const wallet = useWallet();
  const reduceMotion = useReducedMotion();

  // Show a back button on any page that's NOT a root bottom-nav destination.
  const isSubPage = !ROOT_PATHS.has(pathname);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="app-bg min-h-screen overflow-x-hidden">
        {/* ── Top bar ────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 h-16 border-b border-border/50 bg-card/95 backdrop-blur-md">
          <div className="mx-auto flex h-full max-w-7xl items-center gap-3 px-4 lg:px-6">
            {/* Brand */}
            <Link
              href="/home"
              className="flex shrink-0 items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ThemeLogo width={32} height={32} className="rounded-lg" />
              <span className="text-[17px] font-bold tracking-tight">NoviMP</span>
            </Link>

            {/* Desktop main navigation */}
            <nav className="hidden lg:flex items-center gap-1 ml-6">
              {mainNav.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="flex-1" />

            {/* Wallet chip */}
            {wallet.data && (
              <Link
                href="/wallet"
                className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-accent sm:flex"
              >
                <span className="h-2 w-2 rounded-full bg-success" />
                {formatCurrency(wallet.data.balance, wallet.data.currency)}
              </Link>
            )}

            {/* Admin shortcut */}
            {isStaff && (
              <Link
                href="/admin"
                className="hidden items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 sm:flex"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Admin
              </Link>
            )}

            <ThemeToggle />

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="User menu"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user?.avatarUrl || '/avatar-icon.png'}
                      alt="Profile"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/avatar-icon.png'; }}
                    />
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {initials(user?.email, user?.firstName, user?.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-3 py-2.5">
                  <p className="truncate text-sm font-semibold">
                    {user?.firstName
                      ? `${user.firstName} ${user.lastName ?? ''}`.trim()
                      : user?.email ?? 'User'}
                  </p>
                  <p className="truncate text-xs capitalize text-muted-foreground">
                    {user?.role?.toLowerCase().replace('_', ' ') ?? 'Customer'}
                  </p>
                </div>
                <DropdownMenuSeparator />

                {accountNav.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  </DropdownMenuItem>
                ))}

                {isStaff && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        href="/admin"
                        className="flex items-center gap-2 font-semibold text-primary focus:bg-primary/10 focus:text-primary"
                      >
                        <LayoutGrid className="h-4 w-4" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Terms &amp; Conditions
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="flex items-center gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* ── Page content ───────────────────────────────────────────────── */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -3 }}
            transition={{ duration: reduceMotion ? 0 : 0.15, ease: EASE_OUT }}
            className="mx-auto max-w-7xl overflow-x-hidden p-4 pb-28 lg:p-6 lg:pb-8"
          >
            {isSubPage && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              </div>
            )}
            {children}
          </motion.main>
        </AnimatePresence>

        {/* ── Mobile bottom nav ──────────────────────────────────────────── */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-30 h-20 border-t border-border/50 bg-card/98 backdrop-blur-md lg:hidden"
          aria-label="Bottom navigation"
        >
          {/* Indicator rendered at the nav level so it's always flush to the top edge */}
          <div className="relative flex h-full items-center">
            {([
              { name: 'Home',          href: '/home',          icon: House },
              { name: 'Orders',        href: '/orders',        icon: ClipboardList },
              { name: 'Wallet',        href: '/wallet',        icon: CreditCard },
              { name: 'Notifications', href: '/notifications', icon: Bell },
              { name: 'Account',       href: '/account',       icon: CircleUser },
            ] as const).map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {/* Absolute wrapper prevents flex shifts during animation */}
                  <div className="absolute -top-px inset-x-0 flex justify-center">
                    {isActive && (
                      <motion.div
                        layoutId="bottom-pill"
                        transition={springSoft}
                        className="h-[3px] w-10 rounded-b-full bg-primary shadow-[0_0_8px_theme(colors.primary.DEFAULT)]"
                      />
                    )}
                  </div>
                  <motion.span
                    animate={{ scale: isActive ? 1.1 : 1, y: isActive ? -1 : 0 }}
                    transition={reduceMotion ? { duration: 0 } : springSoft}
                    className="flex h-6 w-6 items-center justify-center"
                  >
                    <item.icon className="h-6 w-6" />
                  </motion.span>
                  <span className="leading-none">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </TooltipProvider>
  );
}
