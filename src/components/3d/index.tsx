import { lazy, Suspense } from "react";
const Body3D = lazy(() => import("./Body3D"));
export type { MuscleGroup, PosturalRegion } from "./Body3D";

export function LazyBody3D(props: React.ComponentProps<typeof Body3D>) {
  return (
    <Suspense fallback={<div className="h-[380px] w-full rounded-xl bg-muted animate-pulse flex items-center justify-center text-xs text-muted-foreground">Carregando 3D…</div>}>
      <Body3D {...props} />
    </Suspense>
  );
}
