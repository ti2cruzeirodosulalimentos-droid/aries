import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, User } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { CardListSkeleton } from "@/components/ui/list-skeleton";

export const Route = createFileRoute("/_authenticated/alunos/")({
  head: () => ({ meta: [{ title: "Alunos — ARIÉS" }] }),
  component: AlunosList,
});

const STATUS_STYLES: Record<string, string> = {
  ativo: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  inativo: "bg-muted text-muted-foreground border-border",
  vencendo: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

function AlunosList() {
  const { user } = useAuth();
  const [q, setQ] = useState("");

  const { data: alunos, isLoading } = useQuery({
    queryKey: ["alunos", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alunos")
        .select("id, full_name, photo_url, status, goal, phone, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = (alunos ?? []).filter((a) =>
    a.full_name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Gestão</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Alunos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {alunos?.length ?? 0} aluno{(alunos?.length ?? 0) === 1 ? "" : "s"} cadastrado{(alunos?.length ?? 0) === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          to="/alunos/novo"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 gold-glow"
        >
          <Plus className="size-4" /> Novo Aluno
        </Link>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar aluno..."
          className="h-11 bg-input/60 pl-10"
        />
      </div>

      {isLoading ? (
        <CardListSkeleton count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={User}
          title={`Nenhum aluno ${q ? "encontrado" : "ainda"}`}
          description={q ? "Tente outro termo de busca." : "Comece cadastrando o seu primeiro aluno."}
          action={!q ? { label: "Cadastrar primeiro aluno", to: "/alunos/novo", icon: Plus } : undefined}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <li key={a.id}>
              <Link
                to="/alunos/$id"
                params={{ id: a.id }}
                className="luxury-card group flex items-center gap-4 rounded-2xl p-4 transition hover:border-primary/40"
              >
                <div className="size-14 shrink-0 overflow-hidden rounded-full gold-border bg-muted">
                  {a.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.photo_url} alt={a.full_name} className="size-full object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center font-display text-lg gold-text">
                      {a.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{a.full_name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {a.goal || a.phone || "—"}
                  </div>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                    STATUS_STYLES[a.status] ?? STATUS_STYLES.inativo
                  }`}
                >
                  {a.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
