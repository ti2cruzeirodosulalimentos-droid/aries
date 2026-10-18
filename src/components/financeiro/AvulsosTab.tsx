import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Trash2, CheckCircle2, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useAlunosMin, useCreateLancamento, useDeleteLancamento, useReabrirPagamento,
  type LancamentoRow,
} from "@/lib/queries/financeiro";
import {
  BRL, FORMAS_PAGAMENTO, addMes, fmtData, formaLabel, hojeYmd, mesAnoLabel, parseBRL, resumoAvulsosDoMes,
} from "@/lib/financeiro-calc";
import { Modal, SELECT_CLASS } from "./Modal";
import { MarcarPagoModal, type ItemParaPagar } from "./MarcarPagoModal";
import { StatusPagamento, Tag } from "./Tags";

/** Lançamentos avulsos: entradas e saídas do mês que não vêm de plano nem de avaliação. */
export function AvulsosTab({ lancamentos, userId, carregando }: { lancamentos: LancamentoRow[]; userId: string; carregando: boolean }) {
  const hoje = hojeYmd();
  const [ym, setYm] = useState(hoje.slice(0, 7));
  const [novo, setNovo] = useState(false);
  const [pagando, setPagando] = useState<ItemParaPagar | null>(null);
  const excluir = useDeleteLancamento();
  const reabrir = useReabrirPagamento();

  const { itens, resumo } = useMemo(() => resumoAvulsosDoMes(lancamentos, ym), [lancamentos, ym]);

  function apagar(l: LancamentoRow) {
    if (!confirm(`Excluir "${l.descricao}"?`)) return;
    excluir.mutate(l.id, {
      onSuccess: () => toast.success("Lançamento excluído"),
      onError: (e: Error) => toast.error(e.message),
    });
  }
  function desfazerPagamento(l: LancamentoRow) {
    if (!confirm("Voltar este lançamento para pendente?")) return;
    reabrir.mutate({ tabela: "lancamentos", id: l.id }, {
      onSuccess: () => toast.success("Voltou para pendente"),
      onError: (e: Error) => toast.error(e.message),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => setYm(addMes(ym, -1))} className="rounded-md p-2 text-muted-foreground hover:text-primary" aria-label="Mês anterior">
            <ChevronLeft className="size-5" />
          </button>
          <h2 className="min-w-40 text-center font-display text-xl">{mesAnoLabel(ym)}</h2>
          <button onClick={() => setYm(addMes(ym, 1))} className="rounded-md p-2 text-muted-foreground hover:text-primary" aria-label="Próximo mês">
            <ChevronRight className="size-5" />
          </button>
          {ym !== hoje.slice(0, 7) ? (
            <button onClick={() => setYm(hoje.slice(0, 7))} className="ml-2 text-xs text-primary underline">Mês atual</button>
          ) : null}
        </div>
        <Button onClick={() => setNovo(true)} className="gap-2"><Plus className="size-4" /> Novo lançamento</Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Totais rotulo="Entradas (pagas)" valor={BRL(resumo.entradas)} dica={resumo.pendenteEntradas ? `+ ${BRL(resumo.pendenteEntradas)} pendente` : undefined} />
        <Totais rotulo="Saídas (pagas)" valor={BRL(resumo.saidas)} dica={resumo.pendenteSaidas ? `+ ${BRL(resumo.pendenteSaidas)} a pagar` : undefined} />
        <Totais rotulo="Saldo do mês" valor={`${resumo.saldo < 0 ? "− " : ""}${BRL(Math.abs(resumo.saldo))}`} alerta={resumo.saldo < 0} />
      </section>

      <div className="luxury-card divide-y divide-border/40 p-2">
        {itens.map((l) => {
          const entrada = l.tipo === "entrada";
          return (
            <div key={l.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{l.descricao}</p>
                  <Tag tom={entrada ? "verde" : "vermelho"}>{entrada ? "Entrada" : "Saída"}</Tag>
                  <StatusPagamento status={l.pagamento_status} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {fmtData(l.data_lancamento)}
                  {l.alunos?.full_name ? ` · ${l.alunos.full_name}` : ""}
                  {l.pagamento_status === "pago" ? ` · pago em ${fmtData(l.pago_em)}${l.forma_pagamento ? ` (${formaLabel(l.forma_pagamento)})` : ""}` : ""}
                </p>
              </div>
              <span className={`font-display text-lg ${entrada ? "gold-text" : "text-destructive"}`}>
                {entrada ? "" : "− "}{BRL(l.valor_centavos)}
              </span>
              <div className="flex items-center gap-1">
                {l.pagamento_status === "pendente" ? (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setPagando({ tabela: "lancamentos", id: l.id, titulo: l.descricao ?? "Lançamento", valor_centavos: l.valor_centavos })}>
                    <CheckCircle2 className="size-4" /> Marcar como pago
                  </Button>
                ) : (
                  <button onClick={() => desfazerPagamento(l)} className="px-2 text-xs text-muted-foreground underline hover:text-foreground">Desfazer</button>
                )}
                <button onClick={() => apagar(l)} title="Excluir" className="p-2 text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          );
        })}
        {!itens.length && (
          <EmptyState
            icon={ReceiptText}
            title={carregando ? "Carregando…" : "Nenhum lançamento neste mês"}
            description="Use “Novo lançamento” para registrar uma aula avulsa, venda de produto, despesa ou qualquer valor fora dos planos."
          />
        )}
      </div>

      {novo && <NovoLancamentoModal userId={userId} mesInicial={ym} onClose={() => setNovo(false)} />}
      {pagando && <MarcarPagoModal item={pagando} onClose={() => setPagando(null)} />}
    </div>
  );
}

function Totais({ rotulo, valor, dica, alerta }: { rotulo: string; valor: string; dica?: string; alerta?: boolean }) {
  return (
    <div className="luxury-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{rotulo}</p>
      <p className={`mt-2 font-display text-2xl ${alerta ? "text-destructive" : "gold-text"}`}>{valor}</p>
      {dica ? <p className="mt-0.5 text-xs text-muted-foreground">{dica}</p> : null}
    </div>
  );
}

function NovoLancamentoModal({ userId, mesInicial, onClose }: { userId: string; mesInicial: string; onClose: () => void }) {
  const hoje = hojeYmd();
  const { data: alunos = [] } = useAlunosMin();
  const criar = useCreateLancamento();
  const [tipo, setTipo] = useState<"entrada" | "saida">("entrada");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  // abre no dia de hoje se o mês mostrado é o atual; senão, no dia 1º do mês que a pessoa está olhando
  const [data, setData] = useState(mesInicial === hoje.slice(0, 7) ? hoje : `${mesInicial}-01`);
  const [alunoId, setAlunoId] = useState("");
  const [jaPago, setJaPago] = useState(true);
  const [forma, setForma] = useState<string>("dinheiro");

  function salvar() {
    const centavos = parseBRL(valor);
    if (!Number.isFinite(centavos) || centavos <= 0) { toast.error("Informe um valor maior que zero"); return; }
    criar.mutate(
      {
        personal_id: userId,
        tipo,
        descricao,
        valor_centavos: centavos,
        data_lancamento: data,
        aluno_id: alunoId || null,
        pagamento_status: jaPago ? "pago" : "pendente",
        pago_em: jaPago ? (data > hoje ? hoje : data) : null,
        forma_pagamento: jaPago ? forma : null,
      },
      {
        onSuccess: () => { toast.success(tipo === "entrada" ? "Entrada lançada" : "Saída lançada"); onClose(); },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }

  return (
    <Modal title="Novo lançamento" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        {(["entrada", "saida"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={`h-10 rounded-md border text-sm transition-colors ${tipo === t ? (t === "entrada" ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300" : "border-destructive/60 bg-destructive/10 text-destructive") : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {t === "entrada" ? "Entrada (recebi)" : "Saída (paguei)"}
          </button>
        ))}
      </div>
      <div>
        <Label>Descrição *</Label>
        <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder={tipo === "entrada" ? "Ex.: Aula avulsa, venda de whey" : "Ex.: Aluguel do espaço, equipamento"} maxLength={200} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Valor (R$) *</Label><Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" /></div>
        <div><Label>Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
      </div>
      <div>
        <Label>Aluno (opcional)</Label>
        <select value={alunoId} onChange={(e) => setAlunoId(e.target.value)} className={SELECT_CLASS}>
          <option value="">Sem aluno</option>
          {alunos.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={jaPago} onChange={(e) => setJaPago(e.target.checked)} />
        {tipo === "entrada" ? "Já recebi" : "Já paguei"}
      </label>
      {jaPago ? (
        <div>
          <Label>Forma de pagamento</Label>
          <select value={forma} onChange={(e) => setForma(e.target.value)} className={SELECT_CLASS}>
            {FORMAS_PAGAMENTO.map((f) => <option key={f.v} value={f.v}>{f.l}</option>)}
          </select>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Fica em Pendentes até você marcar como pago.</p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={criar.isPending}>Lançar</Button>
      </div>
    </Modal>
  );
}
