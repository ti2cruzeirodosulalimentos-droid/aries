import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, FileText, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RowsSkeleton } from "@/components/ui/list-skeleton";

export const Route = createFileRoute("/_authenticated/alunos/$id/avaliacoes/")({
  component: AvaliacoesList,
});

function AvaliacoesList() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["avaliacoes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avaliacoes_fisicas")
        .select("id, data_avaliacao, peso, percentual_gordura, massa_magra, imc, protocolo")
        .eq("aluno_id", id)
        .order("data_avaliacao", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Histórico</p>
          <h2 className="font-display text-2xl font-semibold">Avaliações Físicas</h2>
        </div>
        <Link to="/alunos/$id/avaliacoes/nova" params={{ id }}>
          <Button className="bg-primary text-primary-foreground hover:opacity-90"><Plus className="size-4" /> Nova avaliação</Button>
        </Link>
      </div>

      {isLoading ? (
        <RowsSkeleton count={4} />
      ) : data && data.length > 0 ? (
        <div className="grid gap-3">
          {data.map((a, idx) => {
            const next = data[idx + 1];
            const deltaPG = next?.percentual_gordura && a.percentual_gordura ? Number(a.percentual_gordura) - Number(next.percentual_gordura) : null;
            const deltaPeso = next?.peso && a.peso ? Number(a.peso) - Number(next.peso) : null;
            return (
              <Link key={a.id} to="/alunos/$id/avaliacoes/$avalId" params={{ id, avalId: a.id }}>
                <div className="luxury-card p-5 hover:border-primary transition cursor-pointer">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="size-5 text-primary" />
                      <div>
                        <p className="font-semibold">{formatDate(a.data_avaliacao)}</p>
                        <p className="text-xs text-muted-foreground">{protocoloLabel(a.protocolo)}</p>
                      </div>
                    </div>
                    <div className="flex gap-6 text-sm">
                      <Stat label="Peso" value={fmt(a.peso, " kg")} delta={deltaPeso} invert />
                      <Stat label="% Gordura" value={fmt(a.percentual_gordura, "%")} delta={deltaPG} invert />
                      <Stat label="Massa Magra" value={fmt(a.massa_magra, " kg")} delta={null} />
                      <Stat label="IMC" value={fmt(a.imc)} delta={null} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="Nenhuma avaliação ainda"
          description="Registre a primeira avaliação física para acompanhar a evolução."
          action={{ label: "Realizar primeira avaliação", to: "/alunos/$id/avaliacoes/nova", params: { id }, icon: Plus }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, delta, invert }: { label: string; value: string; delta: number | null; invert?: boolean }) {
  const positive = delta !== null && delta > 0;
  // se invert, queda é boa (perder peso/gordura)
  const isGood = delta === null ? null : invert ? delta < 0 : delta > 0;
  return (
    <div className="text-right">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
      {delta !== null && delta !== 0 ? (
        <p className={`text-[10px] flex items-center justify-end gap-0.5 ${isGood ? "text-emerald-400" : "text-destructive"}`}>
          {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
          {Math.abs(delta).toFixed(1)}
        </p>
      ) : null}
    </div>
  );
}

function fmt(v: any, suffix = "") {
  if (v === null || v === undefined) return "—";
  return Number(v).toFixed(1) + suffix;
}
function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function protocoloLabel(p: string | null) {
  if (p === "jp3") return "Jackson & Pollock 3 dobras";
  if (p === "jp7") return "Jackson & Pollock 7 dobras";
  if (p === "obesos") return "Protocolo Obesos";
  return "—";
}
