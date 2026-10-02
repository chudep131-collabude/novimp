'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { RequireAuth } from '@/components/auth/require-auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Referenced here so the shell re-renders on auth changes (e.g. logout).
  useAuth();

  return (
    <RequireAuth>
      <DashboardShell>{children}</DashboardShell>
    </RequireAuth>
  );
}
