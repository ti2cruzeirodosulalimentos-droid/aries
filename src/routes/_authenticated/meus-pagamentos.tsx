import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/meus-pagamentos")({
  head: () => ({ meta: [{ title: "Meus Pagamentos — ARIÉS" }] }),
  component: MeusPagamentos,
});

const BRL = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function MeusPagamentos() {
  const { user } = useAuth();
  const { data = [] } = useQuery({
    queryKey: ["meus-pagamentos", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("vendas")
        .select("id, valor_centavos, data_venda, fim_vigencia, status, forma_pagamento, produtos(nome, tipo)")
        .order("data_venda", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Seus pagamentos</p>
        <h1 className="font-display text-3xl font-semibold flex items-center gap-2"><Receipt className="text-primary" /> Histórico</h1>
      </header>
      {!data.length ? (
        <div className="luxury-card p-10 text-center text-muted-foreground">Nenhum pagamento registrado.</div>
      ) : (
        <ul className="space-y-2">
          {data.map((v) => (
            <li key={v.id} className="luxury-card p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{(v.produtos as { nome?: string } | null)?.nome ?? "—"}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(v.data_venda).toLocaleDateString("pt-BR")}
                  {v.fim_vigencia && ` → ${new Date(v.fim_vigencia).toLocaleDateString("pt-BR")}`}
                  · {v.forma_pagamento ?? "—"} · {v.status}
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
