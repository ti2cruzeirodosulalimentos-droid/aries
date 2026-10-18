import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useCancelarVenda, useDeleteLancamento,
  type LancamentoRow, type VendaRow,
} from "@/lib/queries/financeiro";
import { BRL, fmtData, hojeYmd, itensPendentes, prazoDe, type ItemPendente, type OrigemPendente } from "@/lib/financeiro-calc";
import { MarcarPagoModal, type ItemParaPagar } from "./MarcarPagoModal";
import { Tag } from "./Tags";

type Filtro = "todas" | "vencidas" | "mes";

const ORIGEM: Record<OrigemPendente, { rotulo: string; tom: "ouro" | "cinza" }> = {
  mensalidade: { rotulo: "Mensalidade", tom: "ouro" },
  avaliacao: { rotulo: "Avaliação", tom: "cinza" },
  venda: { rotulo: "Venda", tom: "cinza" },
  avulso: { rotulo: "Avulso", tom: "cinza" },
};

/** Tudo que ainda não foi pago. Cobranças geradas pelo sistema (mensalidade, avaliação) nascem aqui; você marca como pago. */
export function PendentesTab({ vendas, lancamentos }: { vendas: VendaRow[]; lancamentos: LancamentoRow[] }) {
  const hoje = hojeYmd();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [pagando, setPagando] = useState<ItemParaPagar | null>(null);
  const cancelarVenda = useCancelarVenda();
  const excluirLancamento = useDeleteLancamento();

  const todos = useMemo(() => itensPendentes(vendas, lancamentos), [vendas, lancamentos]);
  const totais = useMemo(() => {
    let aReceber = 0, aPagar = 0, vencidasQtd = 0, vencidasValor = 0;
    for (const i of todos) {
      if (i.saida) aPagar += i.valor_centavos;
      else {
        aReceber += i.valor_centavos;
        if (i.data < hoje) { vencidasQtd++; vencidasValor += i.valor_centavos; }
      }
    }
    return { aReceber, aPagar, vencidasQtd, vencidasValor };
  }, [todos, hoje]);

  const itens = todos.filter((i) =>
    filtro === "todas" ? true : filtro === "vencidas" ? i.data < hoje : i.data.startsWith(hoje.slice(0, 7)),
  );

  function remover(i: ItemPendente) {
    if (i.tabela === "vendas") {
      if (!confirm("Cancelar esta cobrança? Ela deixa de contar como a receber.")) return;
      cancelarVenda.mutate(i.id, {
        onSuccess: () => toast.success("Cobrança cancelada"),
        onError: (e: Error) => toast.error(e.message),
      });
    } else {
      if (!confirm("Excluir este lançamento?")) return;
      excluirLancamento.mutate(i.id, {
        onSuccess: () => toast.success("Lançamento excluído"),
        onError: (e: Error) => toast.error(e.message),
      });
    }
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-4 sm:grid-cols-3">
        <Resumo rotulo="A receber" valor={BRL(totais.aReceber)} />
        <Resumo rotulo="Vencidas" valor={BRL(totais.vencidasValor)} dica={`${totais.vencidasQtd} ${totais.vencidasQtd === 1 ? "cobrança" : "cobranças"}`} alerta={totais.vencidasQtd > 0} />
        <Resumo rotulo="A pagar (saídas)" valor={BRL(totais.aPagar)} />
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {([["todas", "Todas"], ["vencidas", "Vencidas"], ["mes", "Deste mês"]] as const).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFiltro(v)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${filtro === v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {l}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{itens.length} {itens.length === 1 ? "item" : "itens"}</span>
      </div>

      <div className="luxury-card divide-y divide-border/40 p-2">
        {itens.map((i) => {
          const prazo = prazoDe(i.data, hoje);
          return (
            <div key={`${i.tabela}-${i.id}`} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{i.titulo}</p>
                  <Tag tom={ORIGEM[i.origem].tom}>{ORIGEM[i.origem].rotulo}</Tag>
                  {i.saida ? <Tag tom="vermelho">Saída</Tag> : null}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {i.subtitulo} · vence {fmtData(i.data)} ·{" "}
                  <span className={prazo.vencida ? "text-destructive" : ""}>{prazo.texto}</span>
                </p>
              </div>
              <span className={`font-display text-lg ${i.saida ? "text-destructive" : "gold-text"}`}>
                {i.saida ? "− " : ""}{BRL(i.valor_centavos)}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() => setPagando({ tabela: i.tabela, id: i.id, titulo: i.titulo, valor_centavos: i.valor_centavos })}
                >
                  <CheckCircle2 className="size-4" /> Marcar como pago
                </Button>
                <button
                  onClick={() => remover(i)}
                  title={i.tabela === "vendas" ? "Cancelar cobrança" : "Excluir lançamento"}
                  className="p-2 text-muted-foreground hover:text-destructive"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          );
        })}
        {!itens.length && (
          <EmptyState
            icon={Wallet}
            title={todos.length ? "Nada neste filtro" : "Tudo em dia"}
            description={todos.length ? "Troque o filtro para ver as outras cobranças." : "Quando uma mensalidade ou avaliação for gerada, ela aparece aqui até você marcar como paga."}
          />
        )}
      </div>

      {pagando && <MarcarPagoModal item={pagando} onClose={() => setPagando(null)} />}
    </div>
  );
}

function Resumo({ rotulo, valor, dica, alerta }: { rotulo: string; valor: string; dica?: string; alerta?: boolean }) {
  return (
    <div className="luxury-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{rotulo}</p>
      <p className={`mt-2 font-display text-2xl ${alerta ? "text-destructive" : "gold-text"}`}>{valor}</p>
      {dica ? <p className="mt-0.5 text-xs text-muted-foreground">{dica}</p> : null}
    </div>
  );
}
