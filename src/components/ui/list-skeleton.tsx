import { Skeleton } from "@/components/ui/skeleton";

export function CardListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="luxury-card flex items-center gap-4 rounded-2xl p-4"
        >
          <Skeleton className="size-14 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

export function RowsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  );
}
