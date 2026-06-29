import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Check, Dumbbell, Timer } from "lucide-react";
import { useTreino, useTreinoExec } from "@/lib/queries/treinos";
import { ErrorState } from "@/components/ui/error-state";
import { DetailSkeleton } from "@/components/ui/list-skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/alunos/$id/treinos/$treinoId/executar")({
  component: ExecutarTreino,
});

function ExecutarTreino() {
  const { id, treinoId } = Route.useParams();
  const navigate = useNavigate();

  const { data: treino } = useTreino(treinoId);
  const { data: itens, isLoading, isError, refetch } = useTreinoExec(treinoId);

  const [idx, setIdx] = useState(0);
  const [serie, setSerie] = useState(1);
  const [done, setDone] = useState<Record<string, boolean>>({});

  // Timer de descanso
  const [restLeft, setRestLeft] = useState(0);
  const [restRunning, setRestRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!restRunning) return;
    intervalRef.current = setInterval(() => {
      setRestLeft((v) => {
        if (v <= 1) {
          setRestRunning(false);
          try { new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=").play().catch(() => {}); } catch { /* noop */ }
          toast.success("Descanso finalizado — próxima série!");
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [restRunning]);

  const atual = itens?.[idx];
  const total = itens?.length ?? 0;
  const progresso = useMemo(() => {
    if (!itens) return 0;
    const totSeries = itens.reduce((s, i) => s + (i.series ?? 0), 0);
    const feitas = Object.values(done).filter(Boolean).length;
    return totSeries > 0 ? Math.round((feitas / totSeries) * 100) : 0;
  }, [itens, done]);

  function startRest() {
    const seg = atual?.descanso_seg ?? 60;
    setRestLeft(seg);
    setRestRunning(true);
  }

  function concluirSerie() {
    if (!atual) return;
    setDone((d) => ({ ...d, [`${atual.id}-${serie}`]: true }));
    if (serie < (atual.series ?? 1)) {
      setSerie(serie + 1);
      startRest();
    } else {
      // próxima exercício
      if (idx < total - 1) {
        setIdx(idx + 1);
        setSerie(1);
        startRest();
      } else {
        toast.success("Treino concluído! Bom trabalho 💪");
      }
    }
  }

  function prox() {
    if (idx < total - 1) {
      setIdx(idx + 1);
      setSerie(1);
      setRestRunning(false);
      setRestLeft(0);
    }
  }
  function ant() {
    if (idx > 0) {
      setIdx(idx - 1);
      setSerie(1);
      setRestRunning(false);
      setRestLeft(0);
    }
  }

  if (isLoading) return <DetailSkeleton blocks={2} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!itens || itens.length === 0) {
    return (
      <div className="luxury-card p-10 text-center space-y-3">
        <Dumbbell className="size-10 mx-auto text-muted-foreground/40" />
        <p className="text-muted-foreground">Este treino ainda não tem exercícios cadastrados.</p>
        <Button onClick={() => navigate({ to: "/alunos/$id/treinos/$treinoId", params: { id, treinoId } })} className="bg-primary text-primary-foreground">
          Editar treino
        </Button>
      </div>
    );
  }

  const ex = atual?.exercicio;
  const media = ex?.gif_url || ex?.imagem_url;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-1">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Link to="/alunos/$id/treinos/$treinoId" params={{ id, treinoId }} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" /> Voltar ao editor
        </Link>
        <div className="text-xs text-muted-foreground">
          <span className="text-primary font-semibold">Treino {treino?.letra}</span> — {treino?.nome}
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Exercício {idx + 1} de {total}</span>
          <span className="text-primary font-semibold">{progresso}% concluído</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progresso}%` }} />
        </div>
      </div>

      {/* Card principal do exercício */}
      <div className="luxury-card overflow-hidden">
        <div className="aspect-video bg-black grid place-items-center relative">
          {media ? (
            <img src={media} alt={ex?.nome} className="w-full h-full object-contain" />
          ) : (
            <div className="text-muted-foreground text-sm">Sem demonstração visual</div>
          )}
          <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">
            #{atual?.ordem}
          </div>
          {ex?.nivel ? (
            <div className="absolute top-2 right-2 bg-black/70 text-primary text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-primary/40">
              {ex.nivel}
            </div>
          ) : null}
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary">{ex?.grupo_muscular}{ex?.equipamento ? ` · ${ex.equipamento}` : ""}</p>
            <h1 className="font-display text-2xl font-bold mt-1">{ex?.nome}</h1>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-4 gap-2">
            <Metric label="Série" value={`${serie}/${atual?.series ?? "—"}`} highlight />
            <Metric label="Reps" value={atual?.repeticoes ?? "—"} />
            <Metric label="Carga" value={atual?.carga ?? "—"} />
            <Metric label="Descanso" value={atual?.descanso_seg ? `${atual.descanso_seg}s` : "—"} />
          </div>

          {atual?.metodo ? (
            <div className="text-xs rounded-md bg-primary/10 border border-primary/30 px-3 py-2 text-primary">
              <strong>Método:</strong> {atual.metodo}
            </div>
          ) : null}

          {/* Instruções */}
          {ex?.instrucoes ? (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Como executar</p>
              <p className="text-sm leading-relaxed whitespace-pre-line">{ex.instrucoes}</p>
            </div>
          ) : null}

          {atual?.observacoes ? (
            <p className="text-xs text-muted-foreground italic">{atual.observacoes}</p>
          ) : null}
        </div>
      </div>

      {/* Timer de descanso */}
      {restLeft > 0 || restRunning ? (
        <div className="luxury-card p-5 border-primary/40 text-center space-y-3">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary flex items-center justify-center gap-2">
            <Timer className="size-4" /> Descanso
          </p>
          <p className="font-display text-5xl font-bold tabular-nums">{Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2, "0")}</p>
          <div className="flex justify-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setRestRunning((r) => !r)} className="gold-border">
              {restRunning ? <><Pause className="size-3" /> Pausar</> : <><Play className="size-3" /> Continuar</>}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setRestLeft(0); setRestRunning(false); }}>
              <RotateCcw className="size-3" /> Pular
            </Button>
          </div>
        </div>
      ) : null}

      {/* Ações */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={ant} disabled={idx === 0} className="flex-1">
          <ChevronLeft className="size-4" /> Anterior
        </Button>
        <Button onClick={concluirSerie} className="flex-[2] bg-primary text-primary-foreground hover:opacity-90 gold-glow">
          <Check className="size-4" /> Concluir série {serie}
        </Button>
        <Button variant="outline" onClick={prox} disabled={idx === total - 1} className="flex-1">
          Próximo <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Lista lateral de exercícios */}
      <div className="luxury-card p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-2">Sequência</p>
        <div className="space-y-1">
          {itens.map((it, i) => (
            <button
              key={it.id}
              onClick={() => { setIdx(i); setSerie(1); setRestRunning(false); setRestLeft(0); }}
              className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition ${i === idx ? "bg-primary/15 border border-primary/40" : "hover:bg-secondary/40"}`}
            >
              <div className="size-10 rounded overflow-hidden bg-secondary/40 shrink-0">
                {(it.exercicio?.gif_url || it.exercicio?.imagem_url) ? (
                  <img src={it.exercicio?.gif_url || it.exercicio?.imagem_url!} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{i + 1}. {it.exercicio?.nome}</p>
                <p className="text-[11px] text-muted-foreground">{it.series}x{it.repeticoes} · {it.descanso_seg}s</p>
              </div>
              {i < idx ? <Check className="size-4 text-primary" /> : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-2 text-center ${highlight ? "bg-primary/15 border border-primary/40" : "bg-secondary/40 border border-border"}`}>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-display text-lg font-bold ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
