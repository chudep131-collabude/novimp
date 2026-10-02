import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function NumbersLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      </div>

      {/* Tabs */}
      <Skeleton className="h-10 w-full max-w-sm rounded-lg" />

      {/* Split panel */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: country list */}
        <Card className="w-full lg:w-80 shrink-0 rounded-2xl">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-36" />
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Search */}
            <Skeleton className="h-9 w-full rounded-lg mb-3" />
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-4 py-3">
                <Skeleton className="h-5 w-7 rounded shrink-0" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Right: number list */}
        <div className="flex-1 min-w-0">
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-44" />
                  <Skeleton className="h-3 w-36" />
                </div>
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border px-4 py-4">
                  <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-4 rounded" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
