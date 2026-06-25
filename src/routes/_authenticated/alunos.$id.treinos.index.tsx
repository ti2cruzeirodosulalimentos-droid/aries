import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef } from "react";
import { Plus, Dumbbell, Trash2, Sparkles, X, Check, PlayCircle, Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { TEMPLATES, ajustarItem, type Template, type AjusteNivel } from "@/lib/treinos/templates";
import { extractTreinoFromImage } from "@/lib/admin.functions";
import { RowsSkeleton } from "@/components/ui/list-skeleton";

export const Route = createFileRoute("/_authenticated/alunos/$id/treinos/")({
  component: TreinosList,
});

const LETRAS = ["A", "B", "C", "D", "E"] as const;

function TreinosList() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tplOpen, setTplOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const extractFn = useServerFn(extractTreinoFromImage);
  const [ocrLoading, setOcrLoading] = useState(false);

  const { data: treinos, isLoading } = useQuery({
    queryKey: ["treinos", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("treinos")
        .select("id, letra, nome, objetivo, ordem, treino_exercicios(count)")
        .eq("aluno_id", id)
        .order("letra");
      if (error) throw error;
      return data ?? [];
    },
  });

  const usadas = new Set((treinos ?? []).map((t: any) => t.letra));
  const disponiveis = LETRAS.filter((l) => !usadas.has(l));

  const criar = useMutation({
    mutationFn: async (letra: string) => {
      const { data, error } = await (supabase as any)
        .from("treinos")
        .insert({ aluno_id: id, personal_id: user!.id, letra, nome: `Treino ${letra}`, ordem: LETRAS.indexOf(letra as any) })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (treinoId) => {
      qc.invalidateQueries({ queryKey: ["treinos", id] });
      navigate({ to: "/alunos/$id/treinos/$treinoId", params: { id, treinoId } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (treinoId: string) => {
      const { error } = await (supabase as any).from("treinos").delete().eq("id", treinoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Treino removido");
      qc.invalidateQueries({ queryKey: ["treinos", id] });
    },
  });

  const aplicarTemplate = useMutation({
    mutationFn: async ({ tpl, nivel }: { tpl: Template; nivel: AjusteNivel }) => {
      // 1. busca todos os exercícios necessários por nome
      const nomes = Array.from(new Set(tpl.treinos.flatMap((t) => t.itens.map((i) => i.nome))));
      const { data: exs, error: exErr } = await (supabase as any)
        .from("exercicios")
        .select("id, nome")
        .in("nome", nomes);
      if (exErr) throw exErr;
      const mapa = new Map<string, string>();
      (exs ?? []).forEach((e: any) => mapa.set(e.nome, e.id));

      const faltando = nomes.filter((n) => !mapa.has(n));
      if (faltando.length) {
        toast.warning(`${faltando.length} exercício(s) não encontrado(s) na biblioteca e foram ignorados.`);
      }

      // 2. cria treinos e seus exercícios (com ajuste por nível)
      for (const t of tpl.treinos) {
        if (usadas.has(t.letra)) {
          toast.info(`Treino ${t.letra} já existe — pulado.`);
          continue;
        }
        const { data: novoTreino, error: tErr } = await (supabase as any)
          .from("treinos")
          .insert({
            aluno_id: id, personal_id: user!.id, letra: t.letra,
            nome: t.nome, objetivo: t.objetivo,
            ordem: LETRAS.indexOf(t.letra as any),
          })
          .select("id")
          .single();
        if (tErr) throw tErr;

        const itens = t.itens
          .map((it, idx) => {
            const exId = mapa.get(it.nome);
            if (!exId) return null;
            const ajustado = ajustarItem(it, nivel);
            return {
              treino_id: novoTreino.id,
              exercicio_id: exId,
              ordem: idx + 1,
              series: ajustado.series,
              repeticoes: ajustado.repeticoes,
              descanso_seg: ajustado.descanso_seg,
              metodo: ajustado.metodo ?? null,
              carga: ajustado.carga_sugerida ?? null,
            };
          })
          .filter(Boolean);

        if (itens.length) {
          const { error: iErr } = await (supabase as any).from("treino_exercicios").insert(itens);
          if (iErr) throw iErr;
        }
      }
    },
    onSuccess: () => {
      toast.success("Template aplicado e ajustado ao nível!");
      setTplOpen(false);
      qc.invalidateQueries({ queryKey: ["treinos", id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao aplicar template"),
  });

  async function handleFile(file: File) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("Imagem muito grande (máx 8MB)"); return; }
    setOcrLoading(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const res = await extractFn({ data: { imageDataUrl: dataUrl } });
      const novos = res.treinos.filter((t) => !usadas.has(t.letra));
      if (!novos.length) { toast.error("Nenhum treino novo encontrado (letras já usadas)"); return; }

      // garante exercícios na biblioteca (cria os que faltam)
      const nomes = Array.from(new Set(novos.flatMap((t) => t.exercicios.map((e) => e.nome))));
      const { data: existentes } = await (supabase as any).from("exercicios").select("id, nome").in("nome", nomes);
      const mapa = new Map<string, string>();
      (existentes ?? []).forEach((e: any) => mapa.set(e.nome, e.id));
      const faltam = nomes.filter((n) => !mapa.has(n));
      if (faltam.length) {
        const { data: criados } = await (supabase as any)
          .from("exercicios")
          .insert(faltam.map((n) => ({ nome: n, grupo_muscular: "Outro", created_by: user!.id, is_publico: false })))
          .select("id, nome");
        (criados ?? []).forEach((e: any) => mapa.set(e.nome, e.id));
      }

      for (const t of novos) {
        const { data: novoTreino, error: tErr } = await (supabase as any)
          .from("treinos")
          .insert({ aluno_id: id, personal_id: user!.id, letra: t.letra, nome: t.nome || `Treino ${t.letra}`, objetivo: t.objetivo, ordem: LETRAS.indexOf(t.letra as any) })
          .select("id").single();
        if (tErr) throw tErr;
        const itens = t.exercicios.map((it, idx) => ({
          treino_id: novoTreino.id,
          exercicio_id: mapa.get(it.nome)!,
          ordem: idx + 1,
          series: it.series, repeticoes: it.repeticoes, descanso_seg: it.descanso_seg,
          carga: it.carga || null, observacao: it.observacao || null,
        })).filter((i) => i.exercicio_id);
        if (itens.length) await (supabase as any).from("treino_exercicios").insert(itens);
      }
      toast.success(`${novos.length} treino(s) importado(s) da foto!`);
      qc.invalidateQueries({ queryKey: ["treinos", id] });
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao processar a foto");
    } finally {
      setOcrLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Programação</p>
          <h2 className="font-display text-2xl font-semibold">Fichas de Treino</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={ocrLoading} className="gold-border">
            {ocrLoading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />} Importar de foto
          </Button>
          <Button variant="outline" onClick={() => setTplOpen(true)} className="gold-border">
            <Sparkles className="size-4" /> Usar template
          </Button>
        </div>
      </div>

      {isLoading ? (
        <RowsSkeleton count={4} />
      ) : (treinos?.length ?? 0) === 0 ? (
        <div className="luxury-card p-12 text-center space-y-4">
          <Dumbbell className="size-12 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground">Nenhum treino criado. Comece do zero ou aplique um template profissional.</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={() => criar.mutate("A")} disabled={criar.isPending} className="bg-primary text-primary-foreground hover:opacity-90">
              <Plus className="size-4" /> Criar Treino A
            </Button>
            <Button variant="outline" onClick={() => setTplOpen(true)} className="gold-border">
              <Sparkles className="size-4" /> Usar template
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {treinos!.map((t: any) => (
            <div key={t.id} className="luxury-card group p-5 hover:border-primary transition h-full">
              <div className="flex items-start gap-4">
                <Link to="/alunos/$id/treinos/$treinoId" params={{ id, treinoId: t.id }} className="size-14 rounded-xl bg-primary/10 border border-primary/40 grid place-items-center shrink-0">
                  <span className="font-display text-2xl font-bold gold-text">{t.letra}</span>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to="/alunos/$id/treinos/$treinoId" params={{ id, treinoId: t.id }}>
                    <p className="font-semibold truncate hover:text-primary transition">{t.nome}</p>
                    {t.objetivo ? <p className="text-xs text-muted-foreground truncate">{t.objetivo}</p> : null}
                    <p className="text-[11px] text-primary mt-2">{t.treino_exercicios?.[0]?.count ?? 0} exercícios</p>
                  </Link>
                  <div className="mt-3 flex gap-2">
                    <Link to="/alunos/$id/treinos/$treinoId/executar" params={{ id, treinoId: t.id }} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25 transition">
                      <PlayCircle className="size-3" /> Executar
                    </Link>
                  </div>
                </div>
                <button
                  onClick={() => { if (confirm(`Excluir Treino ${t.letra}?`)) excluir.mutate(t.id); }}
                  className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive p-1"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {disponiveis.length > 0 && (treinos?.length ?? 0) > 0 ? (
        <div className="luxury-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Adicionar nova ficha</p>
          <div className="flex flex-wrap gap-2">
            {disponiveis.map((l) => (
              <Button key={l} variant="outline" size="sm" onClick={() => criar.mutate(l)} disabled={criar.isPending} className="gold-border">
                <Plus className="size-3" /> Treino {l}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {tplOpen ? (
        <TemplatesModal
          loading={aplicarTemplate.isPending}
          onClose={() => setTplOpen(false)}
          onApply={(tpl, nivel) => aplicarTemplate.mutate({ tpl, nivel })}
        />
      ) : null}
    </div>
  );
}

function TemplatesModal({ onClose, onApply, loading }: { onClose: () => void; onApply: (tpl: Template, nivel: AjusteNivel) => void; loading: boolean }) {
  const [selected, setSelected] = useState<Template | null>(null);
  const [nivel, setNivel] = useState<AjusteNivel>("intermediario");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="luxury-card w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Templates</p>
            <h3 className="font-display text-xl font-semibold">Treinos prontos de academia</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-5" /></button>
        </div>

        <div className="p-4 border-b border-border bg-secondary/10">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nível do aluno (ajusta volume e descanso automaticamente)</Label>
          <Select value={nivel} onValueChange={(v) => setNivel(v as AjusteNivel)}>
            <SelectTrigger className="mt-1 bg-secondary/40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="iniciante">Iniciante — menos séries, mais descanso, reps 10–15</SelectItem>
              <SelectItem value="intermediario">Intermediário — padrão do template</SelectItem>
              <SelectItem value="avancado">Avançado — +1 série, descanso reduzido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid gap-3 md:grid-cols-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className={`luxury-card text-left p-4 transition ${selected?.id === t.id ? "border-primary" : "hover:border-primary/50"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{t.nome}</p>
                  <p className="text-[11px] text-primary">{t.divisao} · {t.nivel}</p>
                </div>
                {selected?.id === t.id ? <Check className="size-4 text-primary" /> : null}
              </div>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{t.descricao}</p>
              <p className="text-[11px] text-muted-foreground mt-2">
                {t.treinos.length} fichas · {t.treinos.reduce((s, tr) => s + tr.itens.length, 0)} exercícios
              </p>
            </button>
          ))}
        </div>

        {selected ? (
          <div className="border-t border-border p-4 max-h-[35vh] overflow-y-auto bg-secondary/20">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Pré-visualização (ajustado para <span className="text-primary">{nivel}</span>)
            </p>
            <div className="space-y-3">
              {selected.treinos.map((t) => (
                <div key={t.letra} className="text-xs">
                  <p className="font-semibold text-foreground">Treino {t.letra} — {t.nome}</p>
                  <ul className="text-muted-foreground mt-1 space-y-0.5 pl-3">
                    {t.itens.map((it, i) => {
                      const aj = ajustarItem(it, nivel);
                      return <li key={i}>• {it.nome} — {aj.series}x{aj.repeticoes} ({aj.descanso_seg}s)</li>;
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!selected || loading}
            onClick={() => selected && onApply(selected, nivel)}
            className="bg-primary text-primary-foreground hover:opacity-90"
          >
            {loading ? "Aplicando..." : "Aplicar template"}
          </Button>
        </div>
      </div>
    </div>
  );
}
