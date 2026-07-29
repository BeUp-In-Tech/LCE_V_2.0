interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className = '' }: SkeletonProps) => (
  <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
);

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3">
    {}
    <div className="flex gap-4 px-6 py-3">
      <Skeleton className="h-4 w-10" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-24" />
    </div>
    {}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 px-6 py-4 border-t border-gray-100">
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    ))}
  </div>
);

export const CardSkeleton = () => (
  <div className="rounded-xl border border-gray-100 p-4 space-y-3">
    <div className="flex justify-between">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-10 w-10 rounded-md" />
    </div>
    <Skeleton className="h-5 w-48" />
    <div className="flex justify-between items-center">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-8 w-8 rounded-lg" />
    </div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="min-h-screen mt-5 px-4 sm:mt-0 sm:px-6 lg:px-8 max-w-7xl">
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-5 xl:gap-8">
      {}
      <div className="xl:col-span-2 space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
      {}
      <div className="xl:col-span-3 space-y-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    </div>
  </div>
);

export const PreferenceSkeleton = () => (
  <div className="min-h-screen max-w-6xl px-2 sm:px-4 lg:px-6">
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1 space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-16 w-full" />
      </div>
      <div className="lg:col-span-3 space-y-6">
        <Skeleton className="h-6 w-24" />
        <div className="flex gap-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="flex gap-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  </div>
);
