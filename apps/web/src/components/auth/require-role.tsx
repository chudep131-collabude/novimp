'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ADMIN_ROLES, STAFF_ROLES, type UserRole } from '@/lib/types';

interface RequireRoleProps {
  children: React.ReactNode;
  /** Roles permitted to view the wrapped content. Defaults to all staff roles. */
  allow?: UserRole[];
}

/**
 * Role gate for back-office routes. Renders children only when the signed-in
 * user holds one of `allow`. Unauthenticated users are bounced to the login
 * page; authenticated-but-unauthorised users get an explicit refusal card
 * rather than a silent redirect, so scoped staff understand why.
 */
export function RequireRole({ children, allow = STAFF_ROLES }: RequireRoleProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const role = user?.role as UserRole | undefined;
  const permitted = !!role && allow.includes(role);

  // Check whether all items in `allow` are admin-only roles for the error msg.
  const isAdminOnlyArea = allow.every((r) => ADMIN_ROLES.includes(r));

  if (!permitted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Card className="max-w-md border-destructive/30">
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Access restricted</h2>
              <p className="text-sm text-muted-foreground">
                Your role ({role || 'unknown'}) does not have access to this area
                {isAdminOnlyArea ? '  administrator privileges are required.' : '.'}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/home">Return to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
