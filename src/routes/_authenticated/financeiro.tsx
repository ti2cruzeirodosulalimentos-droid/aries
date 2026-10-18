import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DollarSign, Plus, Package, Target, TrendingUp, Users, Trash2, Pencil, ClipboardCheck, Clock, CheckCircle2 } from "lucide-react";
import {
  useVendas, useMetaFinanceira, useDeleteVenda, useCancelarVenda, useUpsertMetaFinanceira,
  useValorAvaliacao, useSalvarValorAvaliacao, useLancamentos, useGerarMensalidades, useReabrirPagamento,
  type VendaRow,
} from "@/lib/queries/financeiro";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsSkeleton } from "@/components/ui/list-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  BRL, ehAutomaticoAvaliacao, fmtData, formaLabel, hojeYmd, itensPendentes, pagamentoDe, parseBRL, resumoFinanceiro,
} from "@/lib/financeiro-calc";
import { AvulsosTab } from "@/components/financeiro/AvulsosTab";
import { MarcarPagoModal, type ItemParaPagar } from "@/components/financeiro/MarcarPagoModal";
import { PendentesTab } from "@/components/financeiro/PendentesTab";
import { PlanosTab } from "@/components/financeiro/PlanosTab";
import { Modal } from "@/components/financeiro/Modal";
import { NovaVendaModal } from "@/components/financeiro/NovaVendaModal";
import { ProdutosModal } from "@/components/financeiro/ProdutosModal";
import { StatusPagamento, Tag } from "@/components/financeiro/Tags";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — ARIÉS" }] }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const { user } = useAuth();
  const { isAdmin, isAluno } = usePermissions();
  const [showNew, setShowNew] = useState(false);
  const [showProdutos, setShowProdutos] = useState(false);
  const [pagando, setPagando] = useState<ItemParaPagar | null>(null);

  const hoje = hojeYmd();
  const mes = Number(hoje.slice(5, 7));
  const ano = Number(hoje.slice(0, 4));
  const podeVer = !!user && !isAluno;

  // cria as cobranças do mês que ainda não existem (mensalidades dos planos dos alunos)
  useGerarMensalidades(podeVer);

  const { data: vendas = [], isLoading, isError, refetch } = useVendas(user?.id, podeVer);
  const { data: lancamentos = [], isLoading: carregandoLanc } = useLancamentos(user?.id, podeVer);
  const { data: meta } = useMetaFinanceira(user?.id, mes, ano);

  const stats = useMemo(() => resumoFinanceiro(vendas, lancamentos, hoje), [vendas, lancamentos, hoje]);
  const qtdPendentes = useMemo(() => itensPendentes(vendas, lancamentos).length, [vendas, lancamentos]);

  const pctMeta = meta?.valor_centavos ? Math.min(100, Math.round((stats.recebidoMes / meta.valor_centavos) * 100)) : 0;

  if (isAluno) {
    return <div className="p-6 text-muted-foreground">Acesse "Meus Pagamentos" no menu.</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">{isAdmin ? "Visão global" : "Meu negócio"}</p>
          <h1 className="font-display text-3xl font-semibold">Financeiro</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowProdutos(true)} className="gap-2"><Package className="size-4" /> Produtos</Button>
          <MetaButton meta={meta?.valor_centavos ?? 0} mes={mes} ano={ano} userId={user!.id} />
          <Button onClick={() => setShowNew(true)} className="gap-2"><Plus className="size-4" /> Nova venda</Button>
        </div>
      </header>

      <PrecoAvaliacaoCard isAdmin={isAdmin} />

      <Tabs defaultValue="resumo" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="pendentes">
            Pendentes
            {qtdPendentes > 0 ? (
              <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 text-[10px] text-amber-300">{qtdPendentes}</span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="planos">Planos dos alunos</TabsTrigger>
          <TabsTrigger value="avulsos">Avulsos</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="space-y-6">
          {isLoading ? (
            <>
              <StatsSkeleton count={4} />
              <Skeleton className="h-24 w-full rounded-2xl" />
              <div className="grid gap-4 lg:grid-cols-3">
                <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
                <Skeleton className="h-64 rounded-2xl" />
              </div>
            </>
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : (
            <>
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <Card icon={DollarSign} label="Recebido no mês" value={BRL(stats.recebidoMes)} />
                <Card
                  icon={Clock}
                  label="A receber"
                  value={BRL(stats.aReceber)}
                  hint={stats.vencidasQtd ? `${stats.vencidasQtd} ${stats.vencidasQtd === 1 ? "vencida" : "vencidas"} · ${BRL(stats.vencidasValor)}` : stats.aReceberQtd ? `${stats.aReceberQtd} em aberto` : undefined}
                  alerta={stats.vencidasQtd > 0}
                />
                <Card icon={TrendingUp} label="Recebido no ano" value={BRL(stats.recebidoAno)} />
                <Card icon={Users} label="Ticket médio" value={BRL(stats.ticket)} />
                <Card icon={Target} label="Avaliações / Planos" value={`${stats.qtdAval} / ${stats.qtdPlanos}`} />
                {stats.saidasMes > 0 || stats.aPagar > 0 ? (
                  <>
                    <Card icon={DollarSign} label="Saídas do mês" value={BRL(stats.saidasMes)} hint={stats.aPagar ? `${BRL(stats.aPagar)} a pagar` : undefined} />
                    <Card
                      icon={TrendingUp}
                      label="Resultado do mês"
                      value={`${stats.recebidoMes - stats.saidasMes < 0 ? "− " : ""}${BRL(Math.abs(stats.recebidoMes - stats.saidasMes))}`}
                      alerta={stats.recebidoMes - stats.saidasMes < 0}
                    />
                  </>
                ) : null}
              </section>

              <section className="luxury-card p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg">Meta mensal</h2>
                  <span className="text-sm text-muted-foreground">{BRL(stats.recebidoMes)} / {BRL(meta?.valor_centavos ?? 0)}</span>
                </div>
                <div className="mt-3 h-3 w-full rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${pctMeta}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{pctMeta}% atingido (só conta o que já foi pago)</p>
              </section>

              <section className="grid gap-4 lg:grid-cols-3">
                <div className="luxury-card p-5 lg:col-span-2">
                  <h2 className="font-display text-lg mb-3">Últimas vendas</h2>
                  <ListaVendas vendas={vendas.slice(0, 20)} onPagar={setPagando} />
                </div>
                <div className="luxury-card p-5">
                  <h2 className="font-display text-lg mb-3">Top alunos</h2>
                  <ul className="space-y-2 text-sm">
                    {stats.top.map((t, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{t.nome}</span>
                        <span className="font-medium gold-text">{BRL(t.total)}</span>
                      </li>
                    ))}
                    {!stats.top.length && <li className="text-muted-foreground text-xs">Sem dados</li>}
                  </ul>
                </div>
              </section>
            </>
          )}
        </TabsContent>

        <TabsContent value="pendentes">
          {isLoading ? <Skeleton className="h-64 w-full rounded-2xl" /> : <PendentesTab vendas={vendas} lancamentos={lancamentos} />}
        </TabsContent>

        <TabsContent value="planos">
          <PlanosTab userId={user!.id} />
        </TabsContent>

        <TabsContent value="avulsos">
          <AvulsosTab lancamentos={lancamentos} userId={user!.id} carregando={carregandoLanc} />
        </TabsContent>
      </Tabs>

      {showNew && <NovaVendaModal onClose={() => setShowNew(false)} userId={user!.id} />}
      {showProdutos && <ProdutosModal onClose={() => setShowProdutos(false)} />}
      {pagando && <MarcarPagoModal item={pagando} onClose={() => setPagando(null)} />}
    </div>
  );
}

/** Últimas vendas: cartões no celular, tabela no computador. */
function ListaVendas({ vendas, onPagar }: { vendas: VendaRow[]; onPagar: (i: ItemParaPagar) => void }) {
  const apagar = useDeleteVenda();
  const cancelar = useCancelarVenda();
  const reabrir = useReabrirPagamento();

  const nomeAluno = (v: VendaRow) => v.alunos?.full_name ?? "—";
  const pagar = (v: VendaRow) => onPagar({ tabela: "vendas", id: v.id, titulo: `${nomeAluno(v)} · ${v.produtos?.nome ?? "venda"}`, valor_centavos: v.valor_centavos });
  const desfazer = (v: VendaRow) => {
    if (!confirm("Voltar esta venda para pendente?")) return;
    reabrir.mutate({ tabela: "vendas", id: v.id }, { onSuccess: () => toast.success("Voltou para pendente"), onError: (e: Error) => toast.error(e.message) });
  };
  // cobrança gerada pelo plano só se cancela (apagar faria o sistema gerar de novo); o resto pode ser removido
  const remover = (v: VendaRow) => {
    if (v.assinatura_id) {
      if (!confirm("Cancelar esta cobrança do plano?")) return;
      cancelar.mutate(v.id, { onSuccess: () => toast.success("Cobrança cancelada"), onError: (e: Error) => toast.error(e.message) });
    } else {
      if (!confirm("Remover esta venda?")) return;
      apagar.mutate(v.id, { onSuccess: () => toast.success("Venda removida"), onError: (e: Error) => toast.error(e.message) });
    }
  };

  const Acoes = ({ v }: { v: VendaRow }) => (
    <div className="flex items-center justify-end gap-1">
      {v.status !== "cancelado" && pagamentoDe(v) === "pendente" ? (
        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => pagar(v)}>
          <CheckCircle2 className="size-3.5" /> Marcar pago
        </Button>
      ) : null}
      {v.status !== "cancelado" && pagamentoDe(v) === "pago" ? (
        <button onClick={() => desfazer(v)} className="px-1 text-[11px] text-muted-foreground underline hover:text-foreground">Desfazer</button>
      ) : null}
      {v.status !== "cancelado" ? (
        <button onClick={() => remover(v)} title={v.assinatura_id ? "Cancelar cobrança" : "Remover venda"} className="p-1.5 text-destructive/70 hover:text-destructive">
          <Trash2 className="size-3.5" />
        </button>
      ) : null}
    </div>
  );

  return (
    <>
      {/* Celular: cards */}
      <div className="space-y-2 sm:hidden">
        {vendas.map((v) => (
          <div key={v.id} className={`rounded-lg border border-border/40 p-3 ${v.status === "cancelado" ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{nomeAluno(v)}</p>
                <p className="text-xs text-muted-foreground">{v.produtos?.nome ?? "—"}<VendaTags v={v} /></p>
              </div>
              <span className={`font-semibold gold-text ${v.status === "cancelado" ? "line-through" : ""}`}>{BRL(v.valor_centavos)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{fmtData(v.data_venda)}</span>
              <Acoes v={v} />
            </div>
          </div>
        ))}
        {!vendas.length && <p className="py-6 text-center text-muted-foreground">Nenhuma venda registrada</p>}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="text-left py-2">Data</th><th className="text-left">Aluno</th><th className="text-left">Produto</th><th className="text-right">Valor</th><th></th></tr>
          </thead>
          <tbody>
            {vendas.map((v) => (
              <tr key={v.id} className={`border-t border-border/40 ${v.status === "cancelado" ? "opacity-60" : ""}`}>
                <td className="py-2 whitespace-nowrap">{fmtData(v.data_venda)}</td>
                <td>{nomeAluno(v)}</td>
                <td>{v.produtos?.nome ?? "—"}<VendaTags v={v} /></td>
                <td className={`text-right font-medium ${v.status === "cancelado" ? "line-through" : ""}`}>{BRL(v.valor_centavos)}</td>
                <td className="pl-2"><Acoes v={v} /></td>
              </tr>
            ))}
            {!vendas.length && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Nenhuma venda registrada</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function VendaTags({ v }: { v: VendaRow }) {
  // A observação é escrita pelo gatilho do banco (avaliacao_gera_venda) — por ela, e não pelo
  // vínculo avaliacao_id (que zera quando a avaliação é excluída), a tag sobrevive ao cancelamento.
  const automatico = ehAutomaticoAvaliacao(v);
  const cancelada = v.status === "cancelado";
  const pago = pagamentoDe(v) === "pago";
  return (
    <span className="ml-2 inline-flex flex-wrap items-center gap-1 align-middle">
      {v.assinatura_id ? <Tag tom="ouro">Mensalidade</Tag> : null}
      {automatico ? <Tag tom="ouro">Automático</Tag> : null}
      {cancelada ? <Tag tom="vermelho">Cancelada</Tag> : <StatusPagamento status={pagamentoDe(v)} />}
      {!cancelada && pago && v.pago_em ? (
        <span className="text-[10px] text-muted-foreground normal-case">
          {fmtData(v.pago_em)}{v.forma_pagamento ? ` · ${formaLabel(v.forma_pagamento)}` : ""}
        </span>
      ) : null}
    </span>
  );
}

/** Valor da avaliação: cada avaliação salva grava este valor nela e lança uma cobrança pendente automaticamente. */
function PrecoAvaliacaoCard({ isAdmin }: { isAdmin: boolean }) {
  const { data: valor, isLoading } = useValorAvaliacao();
  const salvar = useSalvarValorAvaliacao();
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  const definido = (valor ?? 0) > 0;

  function abrir() {
    setVal(definido ? ((valor ?? 0) / 100).toFixed(2).replace(".", ",") : "");
    setOpen(true);
  }
  function confirmar() {
    salvar.mutate(parseBRL(val), {
      onSuccess: () => { toast.success("Valor da avaliação atualizado"); setOpen(false); },
      onError: (e: Error) => toast.error(e.message),
    });
  }

  return (
    <section className="luxury-card flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="flex items-center gap-4">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 gold-border"><ClipboardCheck className="size-5 text-primary" /></div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Valor da avaliação</p>
          {isLoading ? (
            <Skeleton className="mt-1 h-7 w-28" />
          ) : definido ? (
            <p className="font-display text-2xl gold-text">{BRL(valor ?? 0)}</p>
          ) : (
            <p className="mt-1 text-sm text-destructive">Não definido — as avaliações não geram cobrança</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="max-w-sm text-xs text-muted-foreground">
          {definido || isLoading
            ? "Cada avaliação cobrada entra em Pendentes. Alunos com plano que inclui avaliação não geram cobrança dentro da cota. Mudar o valor vale só pras próximas."
            : isAdmin ? "Defina o valor pra cada avaliação passar a gerar a cobrança sozinha." : "Peça ao administrador pra definir o valor da avaliação."}
        </p>
        {isAdmin ? (
          <Button variant="outline" onClick={abrir} className="gap-2 gold-border">
            <Pencil className="size-4" /> {definido ? "Alterar valor" : "Definir valor"}
          </Button>
        ) : null}
      </div>
      {open && (
        <Modal title="Valor da avaliação" onClose={() => setOpen(false)} maxWidth="max-w-sm">
          <div>
            <Label>Valor por avaliação (R$)</Label>
            <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder="150,00" inputMode="decimal" />
            <p className="mt-1 text-xs text-muted-foreground">Avaliações já lançadas mantêm o valor que tinham.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={confirmar} disabled={salvar.isPending}>Salvar</Button>
          </div>
        </Modal>
      )}
    </section>
  );
}

function Card({ icon: Icon, label, value, hint, alerta }: { icon: typeof DollarSign; label: string; value: string; hint?: string; alerta?: boolean }) {
  return (
    <div className="luxury-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className="grid size-9 place-items-center rounded-lg bg-primary/10 gold-border"><Icon className="size-4 text-primary" /></div>
      </div>
      <div className={`mt-3 font-display text-2xl ${alerta ? "text-destructive" : "gold-text"}`}>{value}</div>
      {hint ? <p className={`mt-0.5 text-xs ${alerta ? "text-destructive/80" : "text-muted-foreground"}`}>{hint}</p> : null}
    </div>
  );
}

function MetaButton({ meta, mes, ano, userId }: { meta: number; mes: number; ano: number; userId: string }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(((meta || 0) / 100).toFixed(2));
  const upsert = useUpsertMetaFinanceira();
  function save() {
    const valor_centavos = Math.round(parseFloat(val.replace(",", ".") || "0") * 100);
    upsert.mutate(
      { personal_id: userId, mes, ano, valor_centavos },
      {
        onSuccess: () => { toast.success("Meta salva"); setOpen(false); },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2"><Target className="size-4" /> Meta do mês</Button>
      {open && (
        <Modal title={`Meta de ${String(mes).padStart(2, "0")}/${ano}`} onClose={() => setOpen(false)} maxWidth="max-w-sm">
          <Label>Valor (R$)</Label>
          <Input value={val} onChange={(e) => setVal(e.target.value)} />
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></div>
        </Modal>
      )}
    </>
  );
}
