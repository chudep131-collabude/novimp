import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function SupportLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Ticket list */}
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-4 w-4 rounded shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* New ticket form */}
        <Card className="rounded-2xl h-fit">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
