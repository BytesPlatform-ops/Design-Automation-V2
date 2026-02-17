'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function IdeasSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border p-5 space-y-4"
          >
            <div className="flex gap-4">
              <Skeleton className="h-5 w-5 rounded" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-18" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
