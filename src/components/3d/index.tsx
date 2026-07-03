import { Component, lazy, Suspense, type ReactNode } from "react";
const Body3D = lazy(() => import("./Body3D"));
export type { MuscleGroup, PosturalRegion } from "./Body3D";

/** Boundary que evita a tela travar/quebrar se o modelo 3D (GLB) não carregar
 *  (ex.: o asset do Lovable não existe neste deploy). Mostra um aviso limpo. */
class Body3DBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function LazyBody3D(props: React.ComponentProps<typeof Body3D>) {
  const height = props.height ?? 380;
  return (
    <Body3DBoundary
      fallback={
        <div
          style={{ height }}
          className="w-full rounded-xl border border-border bg-muted/40 flex items-center justify-center px-4 text-center text-xs text-muted-foreground"
        >
          Visualização 3D indisponível neste ambiente.
        </div>
      }
    >
      <Suspense
        fallback={
          <div
            style={{ height }}
            className="w-full rounded-xl bg-muted animate-pulse flex items-center justify-center text-xs text-muted-foreground"
          >
            Carregando 3D…
          </div>
        }
      >
        <Body3D {...props} />
      </Suspense>
    </Body3DBoundary>
  );
}
