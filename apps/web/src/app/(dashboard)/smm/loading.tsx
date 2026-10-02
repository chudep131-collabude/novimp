import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function SMMLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Search + filter row */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-full sm:w-72 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Platform filter chips */}
      <div className="flex gap-2 flex-wrap">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      {/* Result count */}
      <Skeleton className="h-4 w-32" />

      {/* Service card grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="rounded-2xl">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <div className="flex items-end justify-between pt-1">
                <div className="space-y-1">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-16 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
