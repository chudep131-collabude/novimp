'use client';

import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/api';

interface ErrorStateProps {
  error?: unknown;
  title?: string;
  onRetry?: () => void;
}

export function ErrorState({ error, title = 'Could not load data', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden />
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{getErrorMessage(error)}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2 border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
          <RotateCw className="h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  );
}
