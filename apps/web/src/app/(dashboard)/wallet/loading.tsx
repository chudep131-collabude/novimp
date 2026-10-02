import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function WalletLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Balance card */}
          <Card className="rounded-2xl">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-12 w-48" />
              <div className="flex gap-3">
                <Skeleton className="h-10 w-32 rounded-xl" />
                <Skeleton className="h-10 w-32 rounded-xl" />
              </div>
            </CardContent>
          </Card>

          {/* Transaction list */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-xl bg-muted/40 px-4 py-3">
                  <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="space-y-1 text-right">
                    <Skeleton className="h-4 w-20 ml-auto" />
                    <Skeleton className="h-5 w-16 rounded-full ml-auto" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right: deposit methods */}
        <div className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border p-4">
                  <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
