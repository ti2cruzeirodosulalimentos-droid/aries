import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus, Search, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useAlunosList } from "@/lib/queries/alunos";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { CardListSkeleton } from "@/components/ui/list-skeleton";

export const Route = createFileRoute("/_authenticated/alunos/")({
  head: () => ({ meta: [{ title: "Alunos — ARIÉS" }] }),
  component: AlunosList,
});

const PAGE_SIZE = 12;

const STATUS_STYLES: Record<string, string> = {
  ativo: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  inativo: "bg-muted text-muted-foreground border-border",
  vencendo: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

function AlunosList() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Busca no servidor com debounce (300ms); qualquer nova busca volta à página 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading, isPlaceholderData } = useAlunosList({ search, page, pageSize: PAGE_SIZE });
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Gestão</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Alunos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} aluno{total === 1 ? "" : "s"} cadastrado{total === 1 ? "" : "s"}
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
      ) : rows.length === 0 ? (
        <EmptyState
          icon={User}
          title={`Nenhum aluno ${search ? "encontrado" : "ainda"}`}
          description={search ? "Tente outro termo de busca." : "Comece cadastrando o seu primeiro aluno."}
          action={!search ? { label: "Cadastrar primeiro aluno", to: "/alunos/novo", icon: Plus } : undefined}
        />
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy={isPlaceholderData}>
            {rows.map((a) => (
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
                    <div className="truncate text-xs text-muted-foreground">{a.goal || a.phone || "—"}</div>
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

          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-4 pt-2" aria-label="Paginação">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex size-9 items-center justify-center rounded-lg gold-border transition hover:border-primary/50 disabled:opacity-40"
                aria-label="Página anterior"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-sm text-muted-foreground">
                Página <span className="font-semibold text-foreground">{page}</span> de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isPlaceholderData}
                className="inline-flex size-9 items-center justify-center rounded-lg gold-border transition hover:border-primary/50 disabled:opacity-40"
                aria-label="Próxima página"
              >
                <ChevronRight className="size-4" />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
