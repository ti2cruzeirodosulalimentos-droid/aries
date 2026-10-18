import { createFileRoute } from "@tanstack/react-router";
import { Receipt } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMeusPagamentos } from "@/lib/queries/portal";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { RowsSkeleton } from "@/components/ui/list-skeleton";
import { fmtData, formaLabel } from "@/lib/financeiro-calc";

export const Route = createFileRoute("/_authenticated/meus-pagamentos")({
  head: () => ({ meta: [{ title: "Meus Pagamentos — ARIÉS" }] }),
  component: MeusPagamentos,
});

const BRL = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function MeusPagamentos() {
  const { user } = useAuth();
  const { data = [], isLoading, isError, refetch } = useMeusPagamentos(user?.id);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Seus pagamentos</p>
        <h1 className="font-display text-3xl font-semibold flex items-center gap-2"><Receipt className="text-primary" /> Histórico</h1>
      </header>
      {isLoading ? (
        <RowsSkeleton count={4} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data.length ? (
        <EmptyState icon={Receipt} title="Nenhum pagamento registrado" description="Seu histórico de pagamentos e planos aparecerá aqui." />
      ) : (
        <ul className="space-y-2">
          {data.map((v) => (
            <li key={v.id} className="luxury-card p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{(v.produtos as { nome?: string } | null)?.nome ?? "—"}</div>
                <div className="text-xs text-muted-foreground">
                  {fmtData(v.data_venda)}
                  {v.fim_vigencia && ` → ${fmtData(v.fim_vigencia)}`}
                  {v.pagamento_status === "pago" && v.forma_pagamento ? ` · ${formaLabel(v.forma_pagamento)}` : ""}
                  {" · "}
                  {v.status === "cancelado" ? (
                    <span>Cancelado</span>
                  ) : v.pagamento_status === "pendente" ? (
                    <span className="text-amber-300">Pendente · vence {fmtData(v.data_venda)}</span>
                  ) : (
                    <span className="text-emerald-400">Pago{v.pago_em ? ` em ${fmtData(v.pago_em)}` : ""}</span>
                  )}
                </div>
              </div>
              <div className="font-display text-lg gold-text">{BRL(v.valor_centavos)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
