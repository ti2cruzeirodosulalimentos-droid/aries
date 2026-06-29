import { createFileRoute, Link } from "@tanstack/react-router";
import { Dumbbell, Play } from "lucide-react";
import { usePermissions } from "@/lib/permissions";
import { useMeusTreinos } from "@/lib/queries/portal";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { CardGridSkeleton } from "@/components/ui/list-skeleton";

export const Route = createFileRoute("/_authenticated/meus-treinos")({
  head: () => ({ meta: [{ title: "Meus Treinos — ARIÉS" }] }),
  component: MeusTreinos,
});

function MeusTreinos() {
  const { alunoId } = usePermissions();
  const { data = [], isLoading, isError, refetch } = useMeusTreinos(alunoId);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Sua rotina</p>
        <h1 className="font-display text-3xl font-semibold flex items-center gap-2"><Dumbbell className="text-primary" /> Meus treinos</h1>
      </header>
      {isLoading ? (
        <CardGridSkeleton count={4} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data.length ? (
        <EmptyState icon={Dumbbell} title="Nenhum treino ainda" description="Quando seu personal montar suas fichas de treino, elas aparecerão aqui." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.map((t) => (
            <li key={t.id} className="luxury-card p-5">
              <h3 className="font-display text-lg">{t.nome ?? `Treino ${t.letra}`}</h3>
              {t.objetivo && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.objetivo}</p>}
              <Link
                to="/alunos/$id/treinos/$treinoId/executar"
                params={{ id: t.aluno_id, treinoId: t.id }}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                <Play className="size-3.5" /> Executar tutorial
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
