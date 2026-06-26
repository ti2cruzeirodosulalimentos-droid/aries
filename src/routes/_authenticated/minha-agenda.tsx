import { createFileRoute } from "@tanstack/react-router";
import { Calendar } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMinhaAgenda } from "@/lib/queries/portal";

export const Route = createFileRoute("/_authenticated/minha-agenda")({
  head: () => ({ meta: [{ title: "Minha Agenda — ARIÉS" }] }),
  component: MinhaAgenda,
});

function MinhaAgenda() {
  const { user } = useAuth();
  const { data = [] } = useMinhaAgenda(user?.id);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Seus compromissos</p>
        <h1 className="font-display text-3xl font-semibold flex items-center gap-2"><Calendar className="text-primary" /> Próximos eventos</h1>
      </header>
      {!data.length ? (
        <div className="luxury-card p-10 text-center text-muted-foreground">Nenhum compromisso agendado.</div>
      ) : (
        <ul className="space-y-2">
          {data.map((e) => (
            <li key={e.id} className="luxury-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{e.titulo}</div>
                  <div className="text-xs text-muted-foreground capitalize">{e.tipo} · {e.status}</div>
                </div>
                <div className="text-right">
                  <div className="font-display gold-text">{new Date(e.inicio).toLocaleDateString("pt-BR")}</div>
                  <div className="text-xs">{new Date(e.inicio).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div>
                </div>
              </div>
              {e.observacao && <p className="mt-2 text-sm text-muted-foreground">{e.observacao}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
