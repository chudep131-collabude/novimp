import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function OrdersLoading() {
  return (
    <div className="space-y-6">
      {/* Header + search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-full sm:w-72 rounded-lg" />
      </div>

      {/* Count line */}
      <Skeleton className="h-4 w-24" />

      {/* Order rows */}
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="rounded-xl">
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="flex flex-1 items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-52" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 md:justify-end">
                  <div className="space-y-1 text-right">
                    <Skeleton className="h-5 w-20 ml-auto" />
                    <Skeleton className="h-3 w-10 ml-auto" />
                  </div>
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-3 pt-4">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
    </div>
  );
}
