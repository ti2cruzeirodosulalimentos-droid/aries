import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Plus, Search, Dumbbell, Trash2, X, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LazyBody3D, type MuscleGroup } from "@/components/3d";

import { toast } from "sonner";

// Mapeia grupo_muscular textual → grupos do boneco 3D
function grupoTo3D(g: string | null | undefined): MuscleGroup[] {
  if (!g) return [];
  const t = g.toLowerCase();
  const map: Record<string, MuscleGroup[]> = {
    "peito": ["peito"], "costas": ["costas", "trapezio"], "pernas": ["quadriceps", "posterior"],
    "ombros": ["ombros"], "bíceps": ["biceps"], "biceps": ["biceps"],
    "tríceps": ["triceps"], "triceps": ["triceps"], "abdômen": ["abdomen"], "abdomen": ["abdomen"],
    "glúteos": ["gluteo"], "gluteos": ["gluteo"], "panturrilha": ["panturrilha"],
    "antebraço": ["antebraco"], "antebraco": ["antebraco"], "trapézio": ["trapezio"],
  };
  return map[t] ?? [];
}

export const Route = createFileRoute("/_authenticated/exercicios")({
  head: () => ({ meta: [{ title: "Biblioteca de Exercícios — ARIÉS" }] }),
  component: ExerciciosPage,
});

const GRUPOS = ["Peito","Costas","Pernas","Ombros","Bíceps","Tríceps","Abdômen","Glúteos","Panturrilha","Cardio","Outro"];

function ExerciciosPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [grupo, setGrupo] = useState("");
  const [open, setOpen] = useState(false);
  const [detalhe, setDetalhe] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["exercicios"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("exercicios").select("*").order("grupo_muscular").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const grupos = useMemo(() => Array.from(new Set((data ?? []).map((e: any) => e.grupo_muscular))) as string[], [data]);
  const filtered = (data ?? []).filter((e: any) => {
    if (grupo && e.grupo_muscular !== grupo) return false;
    if (q && !e.nome.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const excluir = useMutation({
    mutationFn: async (exId: string) => {
      const { error } = await (supabase as any).from("exercicios").delete().eq("id", exId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Exercício removido"); qc.invalidateQueries({ queryKey: ["exercicios"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Biblioteca</p>
            <h1 className="font-display text-3xl font-semibold">Exercícios</h1>
            <p className="text-xs text-muted-foreground mt-1">{(data ?? []).length} exercícios disponíveis</p>
          </div>
          <Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground hover:opacity-90">
            <Plus className="size-4" /> Novo exercício
          </Button>
        </div>

        <div className="luxury-card p-4 space-y-3">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar exercício..." className="pl-9 bg-secondary/40" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Chip active={!grupo} onClick={() => setGrupo("")}>Todos</Chip>
            {grupos.map((g) => <Chip key={g} active={grupo === g} onClick={() => setGrupo(g)}>{g}</Chip>)}
          </div>
        </div>

        {isLoading ? (
          <div className="grid h-40 place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((e: any) => (
              <button
                key={e.id}
                onClick={() => setDetalhe(e)}
                className="luxury-card p-0 overflow-hidden group text-left hover:border-primary transition"
              >
                <div className="aspect-video bg-secondary/40 relative overflow-hidden">
                  {e.gif_url || e.imagem_url ? (
                    <img
                      src={e.gif_url || e.imagem_url}
                      alt={e.nome}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(ev) => { (ev.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="grid place-items-center h-full">
                      <Dumbbell className="size-10 text-muted-foreground/40" />
                    </div>
                  )}
                  {e.nivel ? (
                    <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-black/60 text-primary border border-primary/40">
                      {e.nivel}
                    </span>
                  ) : null}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{e.nome}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {e.grupo_muscular}{e.equipamento ? ` · ${e.equipamento}` : ""}
                      </p>
                    </div>
                    {e.created_by === user?.id ? (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(ev) => { ev.stopPropagation(); if (confirm(`Remover "${e.nome}"?`)) excluir.mutate(e.id); }}
                        onKeyDown={(ev) => { if (ev.key === "Enter") { ev.stopPropagation(); excluir.mutate(e.id); } }}
                        className="text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        <Trash2 className="size-4" />
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 ? <p className="col-span-full text-center text-sm text-muted-foreground py-10">Nada encontrado.</p> : null}
          </div>
        )}

        {open ? <NovoExercicioModal onClose={() => setOpen(false)} onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["exercicios"] }); }} /> : null}
        {detalhe ? <DetalheModal exercicio={detalhe} onClose={() => setDetalhe(null)} /> : null}
    </div>
  );
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-3 py-1 rounded-full text-xs transition ${active ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground hover:text-foreground"}`}>
      {children}
    </button>
  );
}

function DetalheModal({ exercicio, onClose }: { exercicio: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="luxury-card w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="aspect-video bg-secondary/40 relative">
          {exercicio.gif_url || exercicio.imagem_url ? (
            <img src={exercicio.gif_url || exercicio.imagem_url} alt={exercicio.nome} className="w-full h-full object-cover" />
          ) : (
            <div className="grid place-items-center h-full"><Dumbbell className="size-16 text-muted-foreground/30" /></div>
          )}
          <button onClick={onClose} className="absolute top-3 right-3 size-9 grid place-items-center rounded-full bg-black/60 hover:bg-black text-white">
            <X className="size-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary">{exercicio.grupo_muscular}</p>
            <h3 className="font-display text-2xl font-semibold">{exercicio.nome}</h3>
            <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
              {exercicio.equipamento ? <Tag>{exercicio.equipamento}</Tag> : null}
              {exercicio.nivel ? <Tag>{exercicio.nivel}</Tag> : null}
              {exercicio.categoria ? <Tag>{exercicio.categoria}</Tag> : null}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-primary mb-2">Músculos trabalhados</p>
            <LazyBody3D highlight={[...grupoTo3D(exercicio.grupo_muscular), ...((exercicio.musculos_alvo ?? []) as MuscleGroup[])]} height={320} />
          </div>
          {exercicio.musculos_secundarios ? (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Músculos secundários</p>
              <p className="text-sm">{exercicio.musculos_secundarios}</p>
            </div>
          ) : null}
          {exercicio.instrucoes ? (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Execução</p>
              <p className="text-sm whitespace-pre-line leading-relaxed">{exercicio.instrucoes}</p>
            </div>
          ) : null}
          {exercicio.video_url ? (
            <a href={exercicio.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
              Vídeo demonstrativo <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="px-2 py-0.5 rounded-full bg-secondary/60 border border-border">{children}</span>;
}

function NovoExercicioModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ nome: "", grupo_muscular: "Peito", equipamento: "", instrucoes: "", video_url: "", gif_url: "" });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error("Informe o nome");
    setSaving(true);
    const { error } = await (supabase as any).from("exercicios").insert({
      ...form, created_by: user!.id, is_publico: false,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Exercício criado");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <form onSubmit={submit} className="luxury-card w-full max-w-lg space-y-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold">Novo Exercício</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-5" /></button>
        </div>
        <div className="grid gap-3">
          <div>
            <Label className="text-xs">Nome *</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="bg-secondary/40" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Grupo muscular *</Label>
              <select value={form.grupo_muscular} onChange={(e) => setForm({ ...form, grupo_muscular: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-secondary/40 px-3 text-sm">
                {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Equipamento</Label>
              <Input value={form.equipamento} onChange={(e) => setForm({ ...form, equipamento: e.target.value })} className="bg-secondary/40" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Instruções</Label>
            <Textarea rows={3} value={form.instrucoes} onChange={(e) => setForm({ ...form, instrucoes: e.target.value })} className="bg-secondary/40" />
          </div>
          <div>
            <Label className="text-xs">GIF/Imagem (URL)</Label>
            <Input value={form.gif_url} onChange={(e) => setForm({ ...form, gif_url: e.target.value })} placeholder="https://..." className="bg-secondary/40" />
          </div>
          <div>
            <Label className="text-xs">Vídeo (URL)</Label>
            <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} className="bg-secondary/40" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:opacity-90">{saving ? "Salvando..." : "Criar"}</Button>
        </div>
      </form>
    </div>
  );
}
