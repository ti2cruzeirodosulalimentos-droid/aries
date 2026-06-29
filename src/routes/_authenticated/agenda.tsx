import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Calendar as CalIcon, Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/lib/permissions";
import {
  useAgendaEventos,
  useUpsertEvento,
  useDeleteEvento,
  useAlunosMin,
  type Evento,
} from "@/lib/queries/agenda";
import { ErrorState } from "@/components/ui/error-state";
import { RowsSkeleton } from "@/components/ui/list-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({ meta: [{ title: "Agenda — ARIÉS" }] }),
  component: AgendaPage,
});

const TIPO_COLORS: Record<string, string> = {
  avaliacao: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  consultoria: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  renovacao: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  reuniao: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  outro: "bg-secondary text-muted-foreground border-border",
};

function AgendaPage() {
  const { user } = useAuth();
  const { isAluno } = usePermissions();
  const [view, setView] = useState<"dia" | "semana" | "mes">("semana");
  const [ref, setRef] = useState(() => new Date());
  const [editing, setEditing] = useState<Partial<Evento> | null>(null);

  const range = useMemo(() => {
    const d = new Date(ref);
    if (view === "dia") {
      const s = new Date(d); s.setHours(0,0,0,0);
      const e = new Date(d); e.setHours(23,59,59,999);
      return { start: s, end: e };
    }
    if (view === "semana") {
      const s = new Date(d); s.setDate(d.getDate() - d.getDay()); s.setHours(0,0,0,0);
      const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23,59,59,999);
      return { start: s, end: e };
    }
    const s = new Date(d.getFullYear(), d.getMonth(), 1);
    const e = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    return { start: s, end: e };
  }, [ref, view]);

  const { data: eventos = [], isLoading, isError, refetch } = useAgendaEventos(
    user?.id,
    range.start.toISOString(),
    range.end.toISOString(),
  );

  const del = useDeleteEvento();
  function handleDelete(id: string) {
    if (!confirm("Remover?")) return;
    del.mutate(id, { onSuccess: () => toast.success("Evento removido") });
  }

  function shift(delta: number) {
    const d = new Date(ref);
    if (view === "dia") d.setDate(d.getDate() + delta);
    else if (view === "semana") d.setDate(d.getDate() + 7 * delta);
    else d.setMonth(d.getMonth() + delta);
    setRef(d);
  }

  const label = view === "mes"
    ? ref.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : `${range.start.toLocaleDateString("pt-BR")} → ${range.end.toLocaleDateString("pt-BR")}`;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Agenda profissional</p>
          <h1 className="font-display text-3xl font-semibold">Calendário</h1>
        </div>
        {!isAluno && (
          <Button onClick={() => setEditing({ inicio: new Date().toISOString(), fim: new Date(Date.now()+3600000).toISOString(), tipo: "consultoria", status: "agendado", titulo: "" })} className="gap-2">
            <Plus className="size-4" /> Novo evento
          </Button>
        )}
      </header>

      <div className="luxury-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => shift(-1)}><ChevronLeft className="size-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => setRef(new Date())}>Hoje</Button>
          <Button size="sm" variant="ghost" onClick={() => shift(1)}><ChevronRight className="size-4" /></Button>
          <span className="ml-3 capitalize text-sm text-muted-foreground">{label}</span>
        </div>
        <div className="flex gap-1">
          {(["dia","semana","mes"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded-md px-3 py-1.5 text-xs uppercase tracking-wider ${view===v ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/70"}`}>{v}</button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <RowsSkeleton count={5} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : view === "mes" ? (
        <MonthGrid ref_={ref} eventos={eventos} onOpen={(e) => setEditing(e)} />
      ) : view === "semana" ? (
        <WeekList start={range.start} eventos={eventos} onOpen={(e) => setEditing(e)} onDelete={handleDelete} />
      ) : (
        <DayList eventos={eventos} onOpen={(e) => setEditing(e)} onDelete={handleDelete} />
      )}

      {editing && !isAluno && <EventoModal evento={editing} userId={user!.id} onClose={() => setEditing(null)} />}
    </div>
  );
}

function DayList({ eventos, onOpen, onDelete }: { eventos: Evento[]; onOpen: (e: Evento) => void; onDelete: (id: string) => void }) {
  if (!eventos.length) return <div className="luxury-card p-10 text-center text-muted-foreground">Sem compromissos</div>;
  return (
    <ul className="space-y-2">
      {eventos.map((e) => (
        <li key={e.id} className="luxury-card p-4 flex items-center gap-3">
          <div className="text-center w-16">
            <div className="font-display text-xl gold-text">{new Date(e.inicio).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{new Date(e.fim).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`rounded border px-2 py-0.5 text-[10px] uppercase ${TIPO_COLORS[e.tipo]}`}>{e.tipo}</span>
              <span className="font-medium truncate">{e.titulo}</span>
            </div>
            <div className="text-xs text-muted-foreground truncate">{e.alunos?.full_name ?? "—"} · {e.status}</div>
          </div>
          <button onClick={() => onOpen(e)} className="text-xs text-primary hover:underline">Editar</button>
          <button onClick={() => onDelete(e.id)} className="text-destructive/70 hover:text-destructive"><Trash2 className="size-4" /></button>
        </li>
      ))}
    </ul>
  );
}

function WeekList({ start, eventos, onOpen, onDelete }: { start: Date; eventos: Evento[]; onOpen: (e: Evento) => void; onDelete: (id: string) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  return (
    <div className="grid gap-2 md:grid-cols-7">
      {days.map((d) => {
        const items = eventos.filter((e) => new Date(e.inicio).toDateString() === d.toDateString());
        const isToday = d.toDateString() === new Date().toDateString();
        return (
          <div key={d.toISOString()} className={`luxury-card p-3 min-h-[140px] ${isToday ? "border-primary/60" : ""}`}>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.toLocaleDateString("pt-BR",{weekday:"short"})}</div>
            <div className="font-display text-lg">{d.getDate()}</div>
            <ul className="mt-2 space-y-1">
              {items.map((e) => (
                <li key={e.id} className={`text-[11px] rounded border px-1.5 py-1 cursor-pointer ${TIPO_COLORS[e.tipo]}`} onClick={() => onOpen(e)}>
                  <div className="font-medium truncate">{new Date(e.inicio).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})} {e.titulo}</div>
                  <div className="opacity-70 truncate">{e.alunos?.full_name}</div>
                </li>
              ))}
              {!items.length && <li className="text-[10px] text-muted-foreground/60">—</li>}
            </ul>
            {items.length > 0 && (
              <button onClick={() => onDelete(items[0].id)} className="hidden" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function MonthGrid({ ref_, eventos, onOpen }: { ref_: Date; eventos: Evento[]; onOpen: (e: Evento) => void }) {
  const first = new Date(ref_.getFullYear(), ref_.getMonth(), 1);
  const start = new Date(first); start.setDate(first.getDate() - first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  return (
    <div className="luxury-card p-3">
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const items = eventos.filter((e) => new Date(e.inicio).toDateString() === d.toDateString());
          const out = d.getMonth() !== ref_.getMonth();
          return (
            <div key={d.toISOString()} className={`min-h-[80px] rounded border border-border/40 p-1 ${out ? "opacity-40" : ""}`}>
              <div className="text-xs">{d.getDate()}</div>
              {items.slice(0,2).map((e) => (
                <div key={e.id} onClick={() => onOpen(e)} className={`mt-0.5 truncate cursor-pointer rounded px-1 text-[10px] ${TIPO_COLORS[e.tipo]}`}>{e.titulo}</div>
              ))}
              {items.length > 2 && <div className="text-[9px] text-muted-foreground">+{items.length-2}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventoModal({ evento, userId, onClose }: { evento: Partial<Evento>; userId: string; onClose: () => void }) {
  const upsert = useUpsertEvento();
  const [titulo, setTitulo] = useState(evento.titulo ?? "");
  const [tipo, setTipo] = useState(evento.tipo ?? "consultoria");
  const [inicio, setInicio] = useState((evento.inicio ?? new Date().toISOString()).slice(0,16));
  const [fim, setFim] = useState((evento.fim ?? new Date(Date.now()+3600000).toISOString()).slice(0,16));
  const [status, setStatus] = useState(evento.status ?? "agendado");
  const [alunoId, setAlunoId] = useState(evento.aluno_id ?? "");
  const [obs, setObs] = useState(evento.observacao ?? "");

  const { data: alunos = [] } = useAlunosMin();

  function save() {
    if (!titulo) { toast.error("Informe o título"); return; }
    upsert.mutate(
      {
        id: evento.id, personal_id: userId, titulo, tipo, status,
        inicio: new Date(inicio).toISOString(), fim: new Date(fim).toISOString(),
        aluno_id: alunoId || null, observacao: obs || null,
      },
      {
        onSuccess: () => { toast.success("Salvo"); onClose(); },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
      },
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="luxury-card w-full max-w-md p-5 space-y-3 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-xl flex items-center gap-2"><CalIcon className="size-5 text-primary" /> {evento.id ? "Editar" : "Novo"} evento</h3>
        <div><Label>Título</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Tipo</Label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="h-11 w-full rounded-md bg-input/60 px-3 text-sm">
              <option value="avaliacao">Avaliação</option><option value="consultoria">Consultoria</option>
              <option value="renovacao">Renovação</option><option value="reuniao">Reunião</option><option value="outro">Outro</option>
            </select>
          </div>
          <div><Label>Status</Label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 w-full rounded-md bg-input/60 px-3 text-sm">
              <option value="agendado">Agendado</option><option value="confirmado">Confirmado</option>
              <option value="concluido">Concluído</option><option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div><Label>Início</Label><Input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
          <div><Label>Fim</Label><Input type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
        </div>
        <div><Label>Aluno</Label>
          <select value={alunoId} onChange={(e) => setAlunoId(e.target.value)} className="h-11 w-full rounded-md bg-input/60 px-3 text-sm">
            <option value="">—</option>
            {alunos.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
          </select>
        </div>
        <div><Label>Observação</Label><Textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} /></div>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={save} disabled={upsert.isPending}>{upsert.isPending ? "Salvando…" : "Salvar"}</Button></div>
      </div>
    </div>
  );
}
