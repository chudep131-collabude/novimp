import { Skeleton } from '@/components/ui/skeleton';

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 border-b border-border/40 last:border-0">
      <Skeleton className="h-[18px] w-[18px] rounded shrink-0" />
      <Skeleton className="h-4 flex-1 max-w-[160px]" />
      <Skeleton className="h-4 w-4 rounded shrink-0" />
    </div>
  );
}

function SkeletonSection({ rows }: { rows: number }) {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-3 w-20 mx-1" />
      <div className="overflow-hidden rounded-2xl bg-card">
        {[...Array(rows)].map((_, i) => <SkeletonRow key={i} />)}
      </div>
    </div>
  );
}

export default function AccountLoading() {
  return (
    <div className="mx-auto max-w-lg space-y-6 pb-4">
      {/* Avatar row */}
      <div className="flex items-center gap-4 rounded-2xl bg-card px-4 py-4">
        <Skeleton className="h-14 w-14 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-44" />
        </div>
        <Skeleton className="h-9 w-9 rounded-full shrink-0" />
      </div>

      <SkeletonSection rows={4} />
      <SkeletonSection rows={4} />
      <SkeletonSection rows={2} />

      {/* Sign out */}
      <div className="overflow-hidden rounded-2xl bg-card">
        <div className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="h-[18px] w-[18px] rounded shrink-0" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}
