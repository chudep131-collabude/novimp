'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ChevronLeft,
  LogOut,
  PanelLeft,
  ShieldCheck,
  X,
  ArrowLeft,
} from 'lucide-react';
import Image from 'next/image';
import { ThemeLogo } from '@/components/theme-logo';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  adminNavigation,
  navForRole,
  titleForPath,
} from '@/components/dashboard/nav-items';
import { useAuth } from '@/components/auth/auth-provider';
import { EASE_OUT, springSoft } from '@/lib/motion';

const COLLAPSE_KEY = 'adminSidebarCollapsed';

function initials(email?: string, first?: string, last?: string) {
  if (first || last) return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || 'U';
  return email?.slice(0, 2).toUpperCase() ?? 'U';
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === 'true');
  }, []);

  const toggleCollapsed = () =>
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, String(next));
      return next;
    });

  React.useEffect(() => { setMobileOpen(false); }, [pathname]);

  const visibleNav = navForRole(adminNavigation, user?.role);

  function NavLink({ item }: { item: (typeof adminNavigation)[number] }) {
    const isActive =
      pathname === item.href ||
      (item.href !== '/admin' && pathname.startsWith(`${item.href}/`));

    const inner = (
      <Link
        href={item.href}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
          isActive
            ? 'text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5',
          collapsed && 'lg:justify-center lg:px-0 lg:py-3',
        )}
      >
        {isActive && (
          <motion.span
            layoutId="admin-nav-pill"
            transition={springSoft}
            className="absolute inset-0 rounded-xl bg-primary shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
          />
        )}
        <item.icon className="relative z-10 h-5 w-5 shrink-0" />
        {!collapsed && <span className="relative z-10 truncate">{item.name}</span>}
        {collapsed && <span className="sr-only">{item.name}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{inner}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">{item.name}</TooltipContent>
        </Tooltip>
      );
    }
    return inner;
  }

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {/* Brand */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center gap-3 border-b border-border/40 px-4',
          !mobile && collapsed && 'lg:justify-center lg:px-0',
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
          <ThemeLogo width={36} height={36} className="rounded-xl" />
        </div>
        {(!collapsed || mobile) && (
          <div className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold tracking-tight">NoviMP</span>
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-primary/70">
              Admin
            </span>
          </div>
        )}
        {mobile && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-xl p-1.5 text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-0.5">
        {(!collapsed || mobile) && (
          <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Administration
          </p>
        )}
        {collapsed && !mobile && <div className="mx-auto mb-2 h-px w-8 bg-border/60" />}

        {visibleNav.map((item) =>
          mobile ? (
            // Plain links inside mobile drawer (no Tooltip)
            (() => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/admin' && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/0.4)]'
                      : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.name}
                </Link>
              );
            })()
          ) : (
            <NavLink key={item.href} item={item} />
          ),
        )}

        {/* Back to user dashboard */}
        <div className={cn('pt-4', collapsed && !mobile && 'pt-4')}>
          {(!collapsed || mobile) && (
            <div className="mx-3 mb-1 h-px bg-border/40" />
          )}
          {collapsed && !mobile && <div className="mx-auto mb-1 h-px w-8 bg-border/60" />}
          {mobile ? (
            <Link
              href="/home"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5 shrink-0" />
              User Dashboard
            </Link>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/home"
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground',
                    collapsed && 'lg:justify-center lg:px-0 lg:py-3',
                  )}
                >
                  <ArrowLeft className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>User Dashboard</span>}
                </Link>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">User Dashboard</TooltipContent>}
            </Tooltip>
          )}
        </div>
      </nav>

      {/* Collapse toggle (desktop only) */}
      {!mobile && (
        <div className="hidden border-t border-border/40 p-2 lg:block">
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground',
              collapsed && 'justify-center',
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft
              className={cn('h-4 w-4 shrink-0 transition-transform duration-300', collapsed && 'rotate-180')}
            />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      )}

      {/* User footer */}
      <div className="border-t border-border/40 p-3 space-y-1">
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2',
            !mobile && collapsed && 'lg:justify-center lg:px-0',
          )}
        >
          <Avatar className="h-8 w-8 shrink-0 ring-2 ring-primary/30">
            <AvatarImage src="/avatar-icon.png" alt="Profile" />
            <AvatarFallback className="bg-primary/20 text-xs font-bold text-primary">
              {initials(user?.email, user?.firstName, user?.lastName)}
            </AvatarFallback>
          </Avatar>
          {(!collapsed || mobile) && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-none">
                {user?.firstName
                  ? `${user.firstName} ${user.lastName ?? ''}`.trim()
                  : (user?.email ?? 'Admin')}
              </p>
              <p className="truncate text-[11px] text-muted-foreground capitalize mt-0.5">
                {user?.role?.toLowerCase().replace('_', ' ') ?? 'Admin'}
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={logout}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive',
            !mobile && collapsed && 'lg:justify-center lg:px-0',
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {(!collapsed || mobile) && <span>Sign out</span>}
        </button>

        {(!collapsed || mobile) && (
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center gap-2 px-3 py-1 text-[11px] text-muted-foreground/40 transition-colors hover:text-muted-foreground/70"
          >
            <ShieldCheck className="h-3 w-3 shrink-0" />
            Terms &amp; Conditions
          </Link>
        )}
      </div>
    </>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background">

        {/* Mobile overlay */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
          )}
        </AnimatePresence>

        {/* Desktop sidebar */}
        <aside
          className={cn(
            'fixed left-0 top-0 z-50 hidden h-full flex-col border-r border-border/40 bg-card',
            'transition-[width] duration-300 ease-in-out lg:flex',
            collapsed ? 'lg:w-[72px]' : 'lg:w-60',
          )}
        >
          <SidebarContent />
        </aside>

        {/* Mobile sidebar drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.aside
              key="mobile-sidebar"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-border/40 bg-card lg:hidden"
            >
              <SidebarContent mobile />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main column */}
        <div
          className={cn(
            'transition-[margin] duration-300 ease-in-out',
            collapsed ? 'lg:ml-[72px]' : 'lg:ml-60',
          )}
        >
          {/* Top bar */}
          <header className="sticky top-0 z-30 h-16 shrink-0 border-b border-border/40 bg-background/80 backdrop-blur-xl">
            <div className="flex h-full items-center gap-3 px-4 lg:px-6">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground lg:hidden"
                aria-label="Open menu"
                onClick={() => setMobileOpen(true)}
              >
                <PanelLeft className="h-5 w-5" />
              </button>

              <h1 className="text-base font-semibold text-foreground">
                {titleForPath(pathname)}
              </h1>

              <div className="ml-auto flex items-center gap-2">
                <span className="hidden rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary sm:block">
                  Admin Panel
                </span>
                <ThemeToggle />
                <Avatar className="h-8 w-8 ring-2 ring-primary/30">
                  <AvatarImage src="/avatar-icon.png" alt="Profile" />
                  <AvatarFallback className="bg-primary/20 text-xs font-bold text-primary">
                    {initials(user?.email, user?.firstName, user?.lastName)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait" initial={false}>
            <motion.main
              key={pathname}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
              transition={{ duration: reduceMotion ? 0 : 0.18, ease: EASE_OUT }}
              className="mx-auto max-w-7xl p-4 lg:p-6"
            >
              {children}
            </motion.main>
          </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  );
}
