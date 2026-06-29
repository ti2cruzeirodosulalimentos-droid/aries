import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DollarSign, Plus, Package, Target, TrendingUp, Users, Trash2, Pencil } from "lucide-react";
import {
  useVendas, useMetaFinanceira, useDeleteVenda, useCreateVenda, useUpsertMetaFinanceira,
  useAlunosMin, useProdutosAtivos, useProdutosAdmin, useUpsertProduto, useDeleteProduto,
} from "@/lib/queries/financeiro";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsSkeleton } from "@/components/ui/list-skeleton";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — ARIÉS" }] }),
  component: FinanceiroPage,
});

const BRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function FinanceiroPage() {
  const { user } = useAuth();
  const { isAdmin, isAluno } = usePermissions();
  const [showNew, setShowNew] = useState(false);
  const [showProdutos, setShowProdutos] = useState(false);

  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  const ano = hoje.getFullYear();

  const { data: vendas = [], isLoading, isError, refetch } = useVendas(user?.id, !!user && !isAluno);
  const { data: meta } = useMetaFinanceira(user?.id, mes, ano);

  const stats = useMemo(() => {
    const inicioMes = new Date(ano, mes - 1, 1);
    const inicioAno = new Date(ano, 0, 1);
    let receitaMes = 0, receitaAno = 0, qtdAval = 0, qtdPlanos = 0;
    const porAluno = new Map<string, { nome: string; total: number }>();
    for (const v of vendas) {
      if (v.status === "cancelado") continue;
      const d = new Date(v.data_venda);
      if (d >= inicioAno) receitaAno += v.valor_centavos;
      if (d >= inicioMes) receitaMes += v.valor_centavos;
      const tipo = (v.produtos as { tipo?: string } | null)?.tipo;
      if (tipo === "avaliacao") qtdAval++; else if (tipo === "plano") qtdPlanos++;
      const nome = (v.alunos as { full_name?: string } | null)?.full_name ?? "—";
      const cur = porAluno.get(v.aluno_id) ?? { nome, total: 0 };
      cur.total += v.valor_centavos;
      porAluno.set(v.aluno_id, cur);
    }
    const ticket = vendas.length ? Math.round(vendas.reduce((s, v) => s + v.valor_centavos, 0) / vendas.length) : 0;
    const top = Array.from(porAluno.values()).sort((a, b) => b.total - a.total).slice(0, 5);
    return { receitaMes, receitaAno, ticket, qtdAval, qtdPlanos, top };
  }, [vendas, mes, ano]);

  const pctMeta = meta?.valor_centavos ? Math.min(100, Math.round((stats.receitaMes / meta.valor_centavos) * 100)) : 0;

  const del = useDeleteVenda();
  function removerVenda(id: string) {
    if (!confirm("Remover esta venda?")) return;
    del.mutate(id, {
      onSuccess: () => toast.success("Venda removida"),
      onError: (e: Error) => toast.error(e.message),
    });
  }

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
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={DollarSign} label="Receita do mês" value={BRL(stats.receitaMes)} />
        <Card icon={TrendingUp} label="Receita do ano" value={BRL(stats.receitaAno)} />
        <Card icon={Users} label="Ticket médio" value={BRL(stats.ticket)} />
        <Card icon={Target} label="Avaliações / Planos" value={`${stats.qtdAval} / ${stats.qtdPlanos}`} />
      </section>

      <section className="luxury-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">Meta mensal</h2>
          <span className="text-sm text-muted-foreground">{BRL(stats.receitaMes)} / {BRL(meta?.valor_centavos ?? 0)}</span>
        </div>
        <div className="mt-3 h-3 w-full rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${pctMeta}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{pctMeta}% atingido</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="luxury-card p-5 lg:col-span-2">
          <h2 className="font-display text-lg mb-3">Últimas vendas</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="text-left py-2">Data</th><th className="text-left">Aluno</th><th className="text-left">Produto</th><th className="text-right">Valor</th><th></th></tr>
              </thead>
              <tbody>
                {vendas.slice(0, 20).map((v) => (
                  <tr key={v.id} className="border-t border-border/40">
                    <td className="py-2">{new Date(v.data_venda).toLocaleDateString("pt-BR")}</td>
                    <td>{(v.alunos as { full_name?: string } | null)?.full_name ?? "—"}</td>
                    <td>{(v.produtos as { nome?: string } | null)?.nome ?? "—"}</td>
                    <td className="text-right font-medium">{BRL(v.valor_centavos)}</td>
                    <td className="text-right">
                      <button onClick={() => removerVenda(v.id)} className="text-destructive/70 hover:text-destructive">
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!vendas.length && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Nenhuma venda registrada</td></tr>}
              </tbody>
            </table>
          </div>
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

      {showNew && <NovaVendaModal onClose={() => setShowNew(false)} userId={user!.id} />}
      {showProdutos && <ProdutosModal onClose={() => setShowProdutos(false)} />}
    </div>
  );
}

function Card({ icon: Icon, label, value }: { icon: typeof DollarSign; label: string; value: string }) {
  return (
    <div className="luxury-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className="grid size-9 place-items-center rounded-lg bg-primary/10 gold-border"><Icon className="size-4 text-primary" /></div>
      </div>
      <div className="mt-3 font-display text-2xl gold-text">{value}</div>
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
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="luxury-card w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg">Meta de {String(mes).padStart(2,"0")}/{ano}</h3>
            <Label>Valor (R$)</Label>
            <Input value={val} onChange={(e) => setVal(e.target.value)} />
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></div>
          </div>
        </div>
      )}
    </>
  );
}

function NovaVendaModal({ onClose, userId }: { onClose: () => void; userId: string }) {
  const { data: alunos = [] } = useAlunosMin();
  const { data: produtos = [] } = useProdutosAtivos();
  const create = useCreateVenda();
  const [alunoId, setAlunoId] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [valor, setValor] = useState("0,00");
  const [forma, setForma] = useState("pix");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));

  function onProduto(id: string) {
    setProdutoId(id);
    const p = produtos.find((x) => x.id === id);
    if (p) setValor((p.preco_centavos / 100).toFixed(2).replace(".", ","));
  }

  function salvar() {
    if (!alunoId || !produtoId) { toast.error("Selecione aluno e produto"); return; }
    const aluno = alunos.find((a) => a.id === alunoId);
    const valor_centavos = Math.round(parseFloat(valor.replace(",", ".")) * 100);
    create.mutate(
      {
        aluno_id: alunoId,
        personal_id: aluno?.personal_id ?? userId,
        produto_id: produtoId,
        valor_centavos,
        data_venda: data,
        inicio_vigencia: data,
        forma_pagamento: forma,
      },
      {
        onSuccess: () => { toast.success("Venda registrada"); onClose(); },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="luxury-card w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-xl">Nova venda</h3>
        <div className="space-y-3">
          <div><Label>Aluno</Label>
            <select value={alunoId} onChange={(e) => setAlunoId(e.target.value)} className="h-11 w-full rounded-md bg-input/60 px-3 text-sm">
              <option value="">—</option>
              {alunos.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
            </select>
          </div>
          <div><Label>Produto</Label>
            <select value={produtoId} onChange={(e) => onProduto(e.target.value)} className="h-11 w-full rounded-md bg-input/60 px-3 text-sm">
              <option value="">—</option>
              {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Valor (R$)</Label><Input value={valor} onChange={(e) => setValor(e.target.value)} /></div>
            <div><Label>Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          </div>
          <div><Label>Forma de pagamento</Label>
            <select value={forma} onChange={(e) => setForma(e.target.value)} className="h-11 w-full rounded-md bg-input/60 px-3 text-sm">
              <option value="pix">Pix</option><option value="cartao">Cartão</option><option value="dinheiro">Dinheiro</option><option value="transferencia">Transferência</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={salvar}>Registrar</Button></div>
      </div>
    </div>
  );
}

function ProdutosModal({ onClose }: { onClose: () => void }) {
  const { data: produtos = [] } = useProdutosAdmin();
  const upsert = useUpsertProduto();
  const del = useDeleteProduto();
  const [editing, setEditing] = useState<any>(null);
  const blank: any = { nome: "", tipo: "plano", preco_centavos: 0, duracao_meses: 1, descricao: "", ativo: true };
  const [form, setForm] = useState<any>(blank);
  const [valor, setValor] = useState("0,00");

  function startEdit(p: any) { setEditing(p); setForm(p); setValor((p.preco_centavos / 100).toFixed(2).replace(".", ",")); }
  function startNew() { setEditing({}); setForm(blank); setValor("0,00"); }

  function salvar() {
    if (!form.nome?.trim()) { toast.error("Nome obrigatório"); return; }
    const preco_centavos = Math.round(parseFloat(valor.replace(",", ".") || "0") * 100);
    upsert.mutate(
      { ...form, preco_centavos },
      {
        onSuccess: () => { toast.success(form.id ? "Atualizado" : "Criado"); setEditing(null); },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }
  function excluir(id: string) {
    if (!confirm("Excluir este produto?")) return;
    del.mutate(id, { onError: (e: Error) => toast.error(e.message) });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="luxury-card w-full max-w-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl">Produtos & Planos</h3>
          <Button size="sm" onClick={startNew}><Plus className="size-4" /> Novo</Button>
        </div>
        {editing ? (
          <div className="space-y-3 border border-border rounded-lg p-4 bg-secondary/20">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div><Label>Tipo</Label>
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="h-9 w-full rounded-md bg-input/60 px-3 text-sm border border-input">
                  <option value="plano">Plano</option><option value="avaliacao">Avaliação</option><option value="consultoria">Consultoria</option><option value="outro">Outro</option>
                </select>
              </div>
              <div><Label>Duração (meses)</Label><Input type="number" min={0} value={form.duracao_meses ?? 0} onChange={(e) => setForm({ ...form, duracao_meses: parseInt(e.target.value) || 0 })} /></div>
              <div><Label>Preço (R$)</Label><Input value={valor} onChange={(e) => setValor(e.target.value)} /></div>
              <label className="flex items-end gap-2 text-sm"><input type="checkbox" checked={!!form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /> Ativo</label>
              <div className="col-span-2"><Label>Descrição</Label><Input value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={salvar}>{form.id ? "Salvar" : "Criar"}</Button>
            </div>
          </div>
        ) : null}
        <div className="divide-y divide-border/40">
          {produtos.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{p.nome} {!p.ativo && <span className="ml-2 text-[10px] uppercase text-muted-foreground">(inativo)</span>}</p>
                <p className="text-xs text-muted-foreground">{p.tipo} · {p.duracao_meses ?? 0}m · {BRL(p.preco_centavos)}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(p)} className="p-2 text-muted-foreground hover:text-primary"><Pencil className="size-4" /></button>
                <button onClick={() => excluir(p.id)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
              </div>
            </div>
          ))}
          {!produtos.length && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum produto cadastrado</p>}
        </div>
        <div className="flex justify-end"><Button variant="ghost" onClick={onClose}>Fechar</Button></div>
      </div>
    </div>
  );
}
