import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function HomeLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        {/* Left column */}
        <div className="space-y-5">
          {/* Balance card */}
          <Card className="rounded-2xl">
            <CardContent className="p-5 space-y-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-40" />
              <div className="flex gap-3">
                <Skeleton className="h-9 flex-1 rounded-xl" />
                <Skeleton className="h-9 flex-1 rounded-xl" />
              </div>
            </CardContent>
          </Card>

          {/* Services list */}
          <Card className="rounded-2xl">
            <CardContent className="p-5 space-y-3">
              <Skeleton className="h-4 w-20 mb-2" />
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-1">
                  <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Featured service */}
          <Card className="rounded-2xl">
            <CardContent className="p-5 space-y-3">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-28 rounded-xl" />
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Stat cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="rounded-2xl">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                  <Skeleton className="h-9 w-16" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <Card key={i} className="rounded-2xl">
                <CardHeader className="pb-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-48 w-full rounded-xl" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent orders */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-xl bg-muted/40 p-4">
                  <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
