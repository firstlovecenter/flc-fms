"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  /** Show a header row of skeletons */
  showHeader?: boolean;
  className?: string;
}

/**
 * Drop-in skeleton for any data table while content loads.
 * Matches the .data-table styling used across the app.
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn("w-full overflow-hidden rounded-xl border border-[var(--border)] bg-white dark:bg-[rgba(15,26,43,0.6)]", className)}>
      <table className="w-full text-sm">
        {showHeader && (
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--cream)] dark:bg-[rgba(10,22,40,0.3)]">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3 text-left">
                  <Skeleton className="h-3 w-20 rounded" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr
              key={rowIdx}
              className="border-b border-[var(--border)] last:border-0"
              style={{ animationDelay: `${rowIdx * 60}ms` }}
            >
              {Array.from({ length: columns }).map((_, colIdx) => (
                <td key={colIdx} className="px-4 py-3">
                  <Skeleton
                    className={cn(
                      "h-4 rounded",
                      colIdx === 0 ? "w-32" : colIdx === columns - 1 ? "w-16" : "w-24"
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Card-grid skeleton for facility/item card layouts */
export function CardGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-[var(--border)] bg-white dark:bg-[rgba(15,26,43,0.6)] overflow-hidden"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="p-5 space-y-3">
            <Skeleton className="h-5 w-3/4 rounded" />
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-5/6 rounded" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-9 flex-1 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Stat card row skeleton */
export function StatCardsSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-[var(--border)] bg-white dark:bg-[rgba(15,26,43,0.6)] p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-16 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}
