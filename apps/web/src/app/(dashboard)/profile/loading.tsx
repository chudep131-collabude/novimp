import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function ProfileLoading() {
  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Identity card */}
      <Card className="overflow-hidden rounded-2xl">
        {/* Colour strip */}
        <Skeleton className="h-20 w-full rounded-none" />
        <CardContent className="relative px-6 pb-6">
          {/* Avatar over strip */}
          <Skeleton className="absolute -top-8 left-6 h-16 w-16 rounded-2xl" />
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-52" />
              <div className="flex gap-2 mt-1">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-28 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-9 w-28 rounded-lg shrink-0" />
          </div>
        </CardContent>
      </Card>

      {/* Account status */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-5 w-36" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-36" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-5 w-24" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-9 w-40 rounded-lg" />
        </CardContent>
      </Card>
    </div>
  );
}
