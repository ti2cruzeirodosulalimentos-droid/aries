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

/** Grade de cards de conteúdo (metas, treinos e outras telas em grade). */
export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-2" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-40 rounded-2xl" />
      ))}
    </div>
  );
}

/** Grade de cards de métrica (dashboard, financeiro, resumos). */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="luxury-card space-y-3 rounded-2xl p-5">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-7 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** Esqueleto genérico de página de detalhe/formulário (cabeçalho + blocos). */
export function DetailSkeleton({ blocks = 3 }: { blocks?: number }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      {Array.from({ length: blocks }).map((_, i) => (
        <div key={i} className="luxury-card space-y-3 rounded-2xl p-5">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      ))}
    </div>
  );
}
