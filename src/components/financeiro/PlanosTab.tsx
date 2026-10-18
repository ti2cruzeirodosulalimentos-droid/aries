import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAlunosMin, useAssinaturas, useCreateAssinatura, useProdutosAtivos, useUpdateAssinatura,
  type AssinaturaRow,
} from "@/lib/queries/financeiro";
import { BRL, fmtData, hojeYmd, parseBRL } from "@/lib/financeiro-calc";
import { Modal, SELECT_CLASS } from "./Modal";
import { Tag } from "./Tags";

function statusDoPlano(a: AssinaturaRow, hoje: string): { rotulo: string; tom: "verde" | "ambar" | "cinza"; encerrado: boolean } {
  if (a.fim && a.fim < hoje) return { rotulo: `Encerrado em ${fmtData(a.fim)}`, tom: "cinza", encerrado: true };
  if (a.inicio > hoje) return { rotulo: `Começa em ${fmtData(a.inicio)}`, tom: "ambar", encerrado: false };
  return { rotulo: a.fim ? `Ativo até ${fmtData(a.fim)}` : "Ativo", tom: "verde", encerrado: false };
}

const textoAvaliacao = (n?: number | null) =>
  n ? `Inclui 1 avaliação ${n === 1 ? "por mês" : `a cada ${n} meses`} (não gera cobrança dentro da cota)` : "Não inclui avaliação (avaliação é cobrada à parte)";

/** O plano de cada aluno: gera a cobrança sozinha todo período (cai em Pendentes) e decide se a avaliação é incluída. */
export function PlanosTab({ userId }: { userId: string }) {
  const hoje = hojeYmd();
  const { data: assinaturas = [], isLoading, isError, refetch } = useAssinaturas(userId, true);
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<AssinaturaRow | null>(null);

  const lista = useMemo(
    () => [...assinaturas].sort((a, b) => {
      const ea = statusDoPlano(a, hoje).encerrado ? 1 : 0, eb = statusDoPlano(b, hoje).encerrado ? 1 : 0;
      return ea - eb || (a.alunos?.full_name ?? "").localeCompare(b.alunos?.full_name ?? "");
    }),
    [assinaturas, hoje],
  );
  const ativos = lista.filter((a) => !statusDoPlano(a, hoje).encerrado);
  // previsão mensal: plano que cobra a cada N meses entra com 1/N do valor
  const previstoMes = Math.round(
    ativos.reduce((s, a) => s + (a.inicio <= hoje ? a.valor_centavos / Math.max(a.produtos?.duracao_meses ?? 1, 1) : 0), 0),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">Planos dos alunos</h2>
          <p className="max-w-2xl text-xs text-muted-foreground">
            Cadastre o plano de cada aluno uma vez: a cobrança é gerada sozinha todo período e cai em <strong className="text-foreground">Pendentes</strong> até você marcar como paga.
            Se o plano inclui avaliação, as avaliações dentro da cota não geram cobrança.
          </p>
        </div>
        <Button onClick={() => setCriando(true)} className="gap-2"><Plus className="size-4" /> Novo plano de aluno</Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          {ativos.length ? (
            <p className="text-xs text-muted-foreground">
              {ativos.length} {ativos.length === 1 ? "plano ativo" : "planos ativos"} · previsão de {BRL(previstoMes)} por mês
            </p>
          ) : null}
          <div className="luxury-card divide-y divide-border/40 p-2">
            {lista.map((a) => {
              const st = statusDoPlano(a, hoje);
              const periodo = a.produtos?.duracao_meses && a.produtos.duracao_meses > 1 ? `a cada ${a.produtos.duracao_meses} meses` : "todo mês";
              return (
                <div key={a.id} className={`flex flex-wrap items-center gap-3 p-3 ${st.encerrado ? "opacity-60" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{a.alunos?.full_name ?? "—"}</p>
                      <Tag tom={st.tom}>{st.rotulo}</Tag>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {a.produtos?.nome ?? "—"} · {BRL(a.valor_centavos)} {periodo} · vence dia {a.dia_vencimento} · desde {fmtData(a.inicio)}
                    </p>
                    <p className="text-xs text-muted-foreground">{textoAvaliacao(a.produtos?.avaliacao_a_cada_meses)}</p>
                  </div>
                  {!st.encerrado ? (
                    <button onClick={() => setEditando(a)} className="p-2 text-muted-foreground hover:text-primary" title="Editar plano">
                      <Pencil className="size-4" />
                    </button>
                  ) : null}
                </div>
              );
            })}
            {!lista.length && (
              <EmptyState
                icon={CalendarClock}
                title="Nenhum plano de aluno cadastrado"
                description="Clique em “Novo plano de aluno”, escolha o aluno e o plano: a primeira cobrança já aparece em Pendentes."
              />
            )}
          </div>
        </>
      )}

      {criando && <NovoPlanoModal userId={userId} existentes={assinaturas} onClose={() => setCriando(false)} />}
      {editando && <EditarPlanoModal plano={editando} onClose={() => setEditando(null)} />}
    </div>
  );
}

function NovoPlanoModal({ userId, existentes, onClose }: { userId: string; existentes: AssinaturaRow[]; onClose: () => void }) {
  const hoje = hojeYmd();
  const { data: alunos = [] } = useAlunosMin();
  const { data: produtos = [] } = useProdutosAtivos();
  const planos = produtos.filter((p: any) => p.tipo === "plano");
  const criar = useCreateAssinatura();
  const [alunoId, setAlunoId] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [valor, setValor] = useState("");
  const [inicio, setInicio] = useState(hoje);
  const [dia, setDia] = useState(String(Number(hoje.slice(8, 10))));
  const [diaManual, setDiaManual] = useState(false);

  const produto = planos.find((p: any) => p.id === produtoId);
  const jaTemPlano = existentes.find((a) => a.aluno_id === alunoId && !(a.fim && a.fim < hoje));
  const noPassado = inicio && inicio.slice(0, 7) < hoje.slice(0, 7);

  function onProduto(id: string) {
    setProdutoId(id);
    const p = planos.find((x: any) => x.id === id);
    if (p) setValor((p.preco_centavos / 100).toFixed(2).replace(".", ","));
  }
  function onInicio(v: string) {
    setInicio(v);
    if (!diaManual && /^\d{4}-\d{2}-\d{2}$/.test(v)) setDia(String(Number(v.slice(8, 10))));
  }

  function salvar() {
    if (!alunoId || !produtoId) { toast.error("Selecione o aluno e o plano"); return; }
    const aluno = alunos.find((a) => a.id === alunoId);
    criar.mutate(
      {
        aluno_id: alunoId,
        personal_id: aluno?.personal_id ?? userId,
        produto_id: produtoId,
        valor_centavos: parseBRL(valor),
        inicio,
        dia_vencimento: Number(dia),
      },
      {
        onSuccess: (n) => {
          toast.success(n > 0 ? `Plano criado · ${n} ${n === 1 ? "cobrança gerada" : "cobranças geradas"} em Pendentes` : "Plano criado");
          onClose();
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }

  return (
    <Modal title="Novo plano de aluno" onClose={onClose}>
      <div>
        <Label>Aluno *</Label>
        <select value={alunoId} onChange={(e) => setAlunoId(e.target.value)} className={SELECT_CLASS}>
          <option value="">—</option>
          {alunos.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
        </select>
        {jaTemPlano ? (
          <p className="mt-1 text-xs text-amber-300">
            Este aluno já tem plano ativo ({jaTemPlano.produtos?.nome ?? "—"}). Criar outro gera uma segunda cobrança — se for troca de plano, encerre o anterior.
          </p>
        ) : null}
      </div>
      <div>
        <Label>Plano *</Label>
        <select value={produtoId} onChange={(e) => onProduto(e.target.value)} className={SELECT_CLASS}>
          <option value="">—</option>
          {planos.map((p: any) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        {!planos.length ? <p className="mt-1 text-xs text-muted-foreground">Nenhum plano cadastrado. Crie em “Produtos”, no topo da página.</p> : null}
        {produto ? <p className="mt-1 text-xs text-muted-foreground">{textoAvaliacao(produto.avaliacao_a_cada_meses)}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Valor (R$) *</Label><Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" /></div>
        <div>
          <Label>Dia do vencimento *</Label>
          <Input type="number" min={1} max={31} value={dia} onChange={(e) => { setDia(e.target.value); setDiaManual(true); }} />
        </div>
      </div>
      <div>
        <Label>Início do plano</Label>
        <Input type="date" value={inicio} onChange={(e) => onInicio(e.target.value)} />
        {noPassado ? (
          <p className="mt-1 text-xs text-amber-300">
            Início em mês anterior: serão geradas como pendentes as cobranças desde {inicio.slice(5, 7)}/{inicio.slice(0, 4)} (no máximo 12 meses atrás).
          </p>
        ) : null}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={criar.isPending}>Criar plano</Button>
      </div>
    </Modal>
  );
}

function EditarPlanoModal({ plano, onClose }: { plano: AssinaturaRow; onClose: () => void }) {
  const hoje = hojeYmd();
  const atualizar = useUpdateAssinatura();
  const [valor, setValor] = useState((plano.valor_centavos / 100).toFixed(2).replace(".", ","));
  const [dia, setDia] = useState(String(plano.dia_vencimento));

  function salvar() {
    atualizar.mutate(
      { id: plano.id, valor_centavos: parseBRL(valor), dia_vencimento: Number(dia) },
      {
        onSuccess: () => { toast.success("Plano atualizado"); onClose(); },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }
  function encerrar() {
    if (!confirm(`Encerrar o plano de ${plano.alunos?.full_name ?? "este aluno"}? As cobranças já geradas continuam; novas não serão criadas.`)) return;
    atualizar.mutate(
      { id: plano.id, fim: plano.inicio > hoje ? plano.inicio : hoje },
      {
        onSuccess: () => { toast.success("Plano encerrado"); onClose(); },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }

  return (
    <Modal title={`Plano de ${plano.alunos?.full_name ?? "aluno"}`} onClose={onClose}>
      <p className="text-sm text-muted-foreground">{plano.produtos?.nome ?? "—"} · desde {fmtData(plano.inicio)}</p>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Valor (R$)</Label><Input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" /></div>
        <div><Label>Dia do vencimento</Label><Input type="number" min={1} max={31} value={dia} onChange={(e) => setDia(e.target.value)} /></div>
      </div>
      <p className="text-xs text-muted-foreground">Mudanças valem para as próximas cobranças; as já geradas não mudam.</p>
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="outline" onClick={encerrar} disabled={atualizar.isPending} className="text-destructive">Encerrar plano</Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={atualizar.isPending}>Salvar</Button>
        </div>
      </div>
    </Modal>
  );
}
