import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef } from "react";
import { Plus, Dumbbell, Trash2, Sparkles, X, Check, PlayCircle, Camera, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  useTreinosList,
  useCriarTreino,
  useExcluirTreino,
  useAplicarTemplate,
  useImportTreinosFromFoto,
  type FotoTreino,
} from "@/lib/queries/treinos";
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
  const navigate = useNavigate();
  const [tplOpen, setTplOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const extractFn = useServerFn(extractTreinoFromImage);
  const [ocrLoading, setOcrLoading] = useState(false);

  const { data: treinos, isLoading } = useTreinosList(id);

  const criar = useCriarTreino(id, user?.id);
  const excluir = useExcluirTreino(id);
  const aplicarTemplate = useAplicarTemplate(id, user?.id);
  const importFoto = useImportTreinosFromFoto(id, user?.id);

  const usadas = new Set((treinos ?? []).map((t) => t.letra));
  const disponiveis = LETRAS.filter((l) => !usadas.has(l));

  function criarTreino(letra: string) {
    criar.mutate(letra, {
      onSuccess: (treinoId) => navigate({ to: "/alunos/$id/treinos/$treinoId", params: { id, treinoId } }),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao criar treino"),
    });
  }

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
      const novos = res.treinos.filter((t) => !usadas.has(t.letra)) as FotoTreino[];
      if (!novos.length) { toast.error("Nenhum treino novo encontrado (letras já usadas)"); return; }
      const n = await importFoto.mutateAsync(novos);
      toast.success(`${n} treino(s) importado(s) da foto!`);
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
            <Button onClick={() => criarTreino("A")} disabled={criar.isPending} className="bg-primary text-primary-foreground hover:opacity-90">
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
                  onClick={() => { if (confirm(`Excluir Treino ${t.letra}?`)) excluir.mutate(t.id, { onSuccess: () => toast.success("Treino removido") }); }}
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
              <Button key={l} variant="outline" size="sm" onClick={() => criarTreino(l)} disabled={criar.isPending} className="gold-border">
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
          onApply={(tpl, nivel) =>
            aplicarTemplate.mutate(
              { tpl, nivel },
              {
                onSuccess: () => { toast.success("Template aplicado e ajustado ao nível!"); setTplOpen(false); },
                onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao aplicar template"),
              },
            )
          }
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
