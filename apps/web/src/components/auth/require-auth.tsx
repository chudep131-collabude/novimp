'use client';

import * as React from 'react';
import { useAuth } from '@/components/auth/auth-provider';

/**
 * Gates dashboard content behind authentication so pages never fire API calls
 * (and flash errors) before a session is confirmed.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background">
        {/* Logo pulses as the loading indicator */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/novilogo.png"
          alt="NoviMP"
          width={72}
          height={72}
          className="rounded-2xl animate-logo-pulse"
        />
        <p className="text-sm font-medium text-muted-foreground tracking-wide animate-pulse">
          Loading…
        </p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
