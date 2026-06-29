import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ArrowLeft, Plus, Trash2, GripVertical, Save, Search, X, PlayCircle, Dumbbell } from "lucide-react";
import {
  useTreino,
  useTreinoExercicios,
  useSalvarTreino,
  useAdicionarExercicio,
  useAtualizarItem,
  useRemoverItem,
  useMoverItem,
  useExerciciosPicker,
  type TreinoExercicioRow as TE,
} from "@/lib/queries/treinos";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { RowsSkeleton } from "@/components/ui/list-skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { LazyBody3D, type MuscleGroup } from "@/components/3d";

function mapGrupo(g?: string | null): MuscleGroup | null {
  if (!g) return null;
  const s = g.toLowerCase();
  if (s.includes("peito")) return "peito";
  if (s.includes("costa") || s.includes("dorsal")) return "costas";
  if (s.includes("ombro") || s.includes("deltoid")) return "ombros";
  if (s.includes("bíceps") || s.includes("biceps")) return "biceps";
  if (s.includes("tríceps") || s.includes("triceps")) return "triceps";
  if (s.includes("antebra")) return "antebraco";
  if (s.includes("abdom") || s.includes("core")) return "abdomen";
  if (s.includes("lombar")) return "lombar";
  if (s.includes("glúteo") || s.includes("gluteo")) return "gluteo";
  if (s.includes("quadr")) return "quadriceps";
  if (s.includes("posterior") || s.includes("isquio")) return "posterior";
  if (s.includes("pantur")) return "panturrilha";
  if (s.includes("trap")) return "trapezio";
  return null;
}

export const Route = createFileRoute("/_authenticated/alunos/$id/treinos/$treinoId")({
  component: TreinoEditor,
});

function TreinoEditor() {
  const { id, treinoId } = Route.useParams();
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: treino } = useTreino(treinoId);
  const { data: itens, isLoading, isError, refetch } = useTreinoExercicios(treinoId);

  const salvarTreino = useSalvarTreino(treinoId, id);
  const adicionarEx = useAdicionarExercicio(treinoId);
  const atualizarItem = useAtualizarItem(treinoId);
  const removerItem = useRemoverItem(treinoId);
  const moverItem = useMoverItem(treinoId);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-1">
      <Link to="/alunos/$id/treinos" params={{ id }} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> Voltar para fichas
      </Link>

      {treino ? (
        <TreinoHeader
          treino={treino}
          onSave={(p) =>
            salvarTreino.mutate(p, {
              onSuccess: () => toast.success("Treino atualizado"),
              onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
            })
          }
          saving={salvarTreino.isPending}
        />
      ) : null}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Exercícios</p>
          <h2 className="font-display text-xl font-semibold">{itens?.length ?? 0} no total</h2>
        </div>
        <div className="flex gap-2">
          {(itens?.length ?? 0) > 0 ? (
            <Link to="/alunos/$id/treinos/$treinoId/executar" params={{ id, treinoId }}>
              <Button variant="outline" className="gold-border">
                <PlayCircle className="size-4" /> Executar tutorial
              </Button>
            </Link>
          ) : null}
          <Button onClick={() => setPickerOpen(true)} className="bg-primary text-primary-foreground hover:opacity-90">
            <Plus className="size-4" /> Adicionar
          </Button>
        </div>
      </div>

      {itens && itens.length > 0 ? (
        <div className="luxury-card p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">Músculos trabalhados neste treino</p>
          <LazyBody3D
            highlight={Array.from(new Set(itens.map((i) => mapGrupo(i.exercicio?.grupo_muscular)).filter(Boolean))) as MuscleGroup[]}
            height={320}
          />
        </div>
      ) : null}

      {isLoading ? (
        <RowsSkeleton count={4} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : itens && itens.length > 0 ? (
        <div className="space-y-3">
          {itens.map((it, idx) => (
            <ItemRow
              key={it.id}
              item={it}
              first={idx === 0}
              last={idx === itens.length - 1}
              onPatch={(patch) => atualizarItem.mutate({ itemId: it.id, patch }, { onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar") })}
              onRemove={() => { if (confirm("Remover exercício?")) removerItem.mutate(it.id); }}
              onMove={(direction) => moverItem.mutate({ itemId: it.id, direction })}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Dumbbell}
          title="Nenhum exercício ainda"
          description="Monte a ficha adicionando exercícios da biblioteca."
          action={{ label: "Adicionar exercício", onClick: () => setPickerOpen(true), icon: Plus }}
        />
      )}

      {pickerOpen ? <ExercicioPicker onClose={() => setPickerOpen(false)} onPick={(exId) => { adicionarEx.mutate(exId, { onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao adicionar") }); setPickerOpen(false); }} /> : null}
    </div>
  );
}

function TreinoHeader({ treino, onSave, saving }: { treino: any; onSave: (p: any) => void; saving: boolean }) {
  const [nome, setNome] = useState(treino.nome ?? "");
  const [objetivo, setObjetivo] = useState(treino.objetivo ?? "");
  const [observacoes, setObservacoes] = useState(treino.observacoes ?? "");
  return (
    <div className="luxury-card p-5 space-y-4">
      <div className="flex items-center gap-4">
        <div className="size-14 rounded-xl bg-primary/10 border border-primary/40 grid place-items-center">
          <span className="font-display text-2xl font-bold gold-text">{treino.letra}</span>
        </div>
        <div className="flex-1 grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs">Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} className="bg-secondary/40" />
          </div>
          <div>
            <Label className="text-xs">Objetivo</Label>
            <Input value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="ex.: Hipertrofia de peito e tríceps" className="bg-secondary/40" />
          </div>
        </div>
      </div>
      <div>
        <Label className="text-xs">Observações</Label>
        <Textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="bg-secondary/40" />
      </div>
      <Button onClick={() => onSave({ nome, objetivo, observacoes })} disabled={saving} className="bg-primary text-primary-foreground hover:opacity-90">
        <Save className="size-4" /> Salvar dados da ficha
      </Button>
    </div>
  );
}

function ItemRow({ item, first, last, onPatch, onRemove, onMove }: {
  item: TE; first: boolean; last: boolean;
  onPatch: (p: any) => void; onRemove: () => void; onMove: (d: -1 | 1) => void;
}) {
  const [local, setLocal] = useState({
    series: item.series ?? 3,
    repeticoes: item.repeticoes ?? "",
    carga: item.carga ?? "",
    descanso_seg: item.descanso_seg ?? 60,
    metodo: item.metodo ?? "",
    observacoes: item.observacoes ?? "",
  });
  function commit(patch: Partial<typeof local>) {
    const next = { ...local, ...patch };
    setLocal(next);
    onPatch(patch);
  }
  return (
    <div className="luxury-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center text-muted-foreground">
          <button disabled={first} onClick={() => onMove(-1)} className="disabled:opacity-20 hover:text-primary"><GripVertical className="size-4 rotate-180" /></button>
          <span className="text-xs font-bold gold-text">{item.ordem}</span>
          <button disabled={last} onClick={() => onMove(1)} className="disabled:opacity-20 hover:text-primary"><GripVertical className="size-4" /></button>
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold truncate">{item.exercicio?.nome ?? "—"}</p>
              <p className="text-[11px] text-muted-foreground">
                {item.exercicio?.grupo_muscular}{item.exercicio?.equipamento ? ` · ${item.exercicio.equipamento}` : ""}
              </p>
            </div>
            <button onClick={onRemove} className="text-muted-foreground hover:text-destructive p-1">
              <Trash2 className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Field label="Séries">
              <Input type="number" min={1} value={local.series} onChange={(e) => commit({ series: Number(e.target.value) })} className="bg-secondary/40 h-9" />
            </Field>
            <Field label="Reps">
              <Input value={local.repeticoes} onChange={(e) => commit({ repeticoes: e.target.value })} placeholder="10-12" className="bg-secondary/40 h-9" />
            </Field>
            <Field label="Carga">
              <Input value={local.carga} onChange={(e) => commit({ carga: e.target.value })} placeholder="20 kg" className="bg-secondary/40 h-9" />
            </Field>
            <Field label="Descanso (s)">
              <Input type="number" min={0} value={local.descanso_seg} onChange={(e) => commit({ descanso_seg: Number(e.target.value) })} className="bg-secondary/40 h-9" />
            </Field>
            <Field label="Método">
              <Input value={local.metodo} onChange={(e) => commit({ metodo: e.target.value })} placeholder="Drop-set, Bi-set..." className="bg-secondary/40 h-9" />
            </Field>
          </div>
          {local.observacoes || true ? (
            <Input value={local.observacoes} onChange={(e) => commit({ observacoes: e.target.value })} placeholder="Observações do exercício..." className="bg-secondary/40 h-9" />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ExercicioPicker({ onClose, onPick }: { onClose: () => void; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [grupo, setGrupo] = useState<string>("");

  const { data } = useExerciciosPicker();

  const grupos = useMemo(() => Array.from(new Set((data ?? []).map((e: any) => e.grupo_muscular))) as string[], [data]);
  const filtered = (data ?? []).filter((e: any) => {
    if (grupo && e.grupo_muscular !== grupo) return false;
    if (q && !e.nome.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="luxury-card w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Biblioteca</p>
            <h3 className="font-display text-xl font-semibold">Selecionar Exercício</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-5" /></button>
        </div>
        <div className="p-4 space-y-3 border-b border-border">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar exercício..." className="pl-9 bg-secondary/40" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Chip active={!grupo} onClick={() => setGrupo("")}>Todos</Chip>
            {grupos.map((g) => <Chip key={g} active={grupo === g} onClick={() => setGrupo(g)}>{g}</Chip>)}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.map((e: any) => (
            <button key={e.id} onClick={() => onPick(e.id)} className="w-full text-left p-2 rounded-md hover:bg-secondary/60 transition flex items-center gap-3">
              <div className="size-14 rounded-md overflow-hidden bg-secondary/40 shrink-0">
                {e.gif_url || e.imagem_url ? (
                  <img src={e.gif_url || e.imagem_url} alt={e.nome} loading="lazy" className="w-full h-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate text-sm">{e.nome}</p>
                <p className="text-[11px] text-muted-foreground">{e.grupo_muscular}{e.equipamento ? ` · ${e.equipamento}` : ""}{e.nivel ? ` · ${e.nivel}` : ""}</p>
              </div>
              <Plus className="size-4 text-primary shrink-0" />
            </button>
          ))}
          {filtered.length === 0 ? <p className="text-center text-sm text-muted-foreground py-8">Nada encontrado.</p> : null}
        </div>
      </div>
    </div>
  );
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs transition ${active ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}
