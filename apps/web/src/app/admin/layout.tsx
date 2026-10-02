'use client';

import * as React from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { RequireRole } from '@/components/auth/require-role';
import { AdminShell } from '@/components/admin/admin-shell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole>
      <AdminShell>{children}</AdminShell>
    </RequireRole>
  );
}
