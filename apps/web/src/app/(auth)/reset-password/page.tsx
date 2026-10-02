'use client';

import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import ResetPasswordForm from './reset-password-form';

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-fade-in space-y-4">
          <Skeleton className="mx-auto h-10 w-40 rounded-xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
