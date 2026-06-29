import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Activity, TrendingUp, Clock, Plus, DollarSign, Calendar, Target, Dumbbell, Receipt } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/lib/permissions";
import { useDashboardAluno, useDashboardPro } from "@/lib/queries/dashboard";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsSkeleton } from "@/components/ui/list-skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ARIÉS" }] }),
  component: Dashboard,
});

const BRL = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Dashboard() {
  const { user } = useAuth();
  const { isAluno, role } = usePermissions();
  return isAluno ? <DashboardAluno userId={user?.id} /> : <DashboardPro userId={user?.id} role={role} />;
}

function DashboardPro({ userId, role }: { userId?: string; role: string }) {
  const { data: stats, isLoading, isError, refetch } = useDashboardPro(userId);

  const pctMeta = stats?.meta ? Math.min(100, Math.round((stats.receitaMes / stats.meta) * 100)) : 0;

  const cards = [
    { label: "Total de Alunos", value: stats?.total ?? "—", icon: Users },
    { label: "Alunos Ativos", value: stats?.ativos ?? "—", icon: Activity },
    { label: "Novos do mês", value: stats?.novos ?? "—", icon: Plus },
    { label: "Planos Ativos", value: stats?.planosAtivos ?? "—", icon: Target },
    { label: "Avaliações (mês)", value: stats?.avaliacoesMes ?? "—", icon: TrendingUp },
    { label: "Vencendo", value: stats?.vencendo ?? "—", icon: Clock },
    { label: "Receita mês", value: BRL(stats?.receitaMes ?? 0), icon: DollarSign },
    { label: "Receita ano", value: BRL(stats?.receitaAno ?? 0), icon: TrendingUp },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">{role === "admin" ? "Visão global" : "Visão do personal"}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold md:text-4xl">Bom te ver de volta<span className="gold-text">.</span></h1>
        </div>
        <Link to="/alunos/novo" className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 gold-glow">
          <Plus className="size-4" /> Novo Aluno
        </Link>
      </header>

      {isLoading ? (
        <>
          <StatsSkeleton count={8} />
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-40 rounded-2xl lg:col-span-2" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="luxury-card rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</span>
                <div className="grid size-9 place-items-center rounded-lg bg-primary/10 gold-border"><Icon className="size-4 text-primary" /></div>
              </div>
              <div className="mt-3 font-display text-2xl font-semibold gold-text">{String(c.value)}</div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="luxury-card p-5 lg:col-span-2">
          <h2 className="font-display text-lg">Meta financeira</h2>
          <p className="mt-1 text-sm text-muted-foreground">{BRL(stats?.receitaMes ?? 0)} / {BRL(stats?.meta ?? 0)} · {pctMeta}%</p>
          <div className="mt-3 h-3 w-full rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pctMeta}%` }} />
          </div>
          <Link to="/financeiro" className="mt-4 inline-block text-xs text-primary hover:underline">Abrir Financeiro →</Link>
        </div>
        <div className="luxury-card p-5">
          <h2 className="font-display text-lg flex items-center gap-2"><Calendar className="size-4 text-primary" /> Próximos compromissos</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(stats?.proximos ?? []).map((e) => (
              <li key={e.id} className="flex justify-between gap-2 border-b border-border/40 pb-1">
                <span className="truncate">{e.titulo}</span>
                <span className="text-xs text-muted-foreground shrink-0">{new Date(e.inicio).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})} {new Date(e.inicio).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span>
              </li>
            ))}
            {!stats?.proximos?.length && <li className="text-xs text-muted-foreground">Sem compromissos</li>}
          </ul>
          <Link to="/agenda" className="mt-3 inline-block text-xs text-primary hover:underline">Abrir Agenda →</Link>
        </div>
      </section>
        </>
      )}
    </div>
  );
}

function DashboardAluno({ userId }: { userId?: string }) {
  const { data } = useDashboardAluno(userId);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Bem-vindo</p>
        <h1 className="font-display text-3xl font-semibold">{data?.aluno?.full_name ?? "Olá"} <span className="gold-text">.</span></h1>
        {data?.aluno?.goal && <p className="mt-1 text-sm text-muted-foreground">Objetivo: {data.aluno.goal}</p>}
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Link to="/meus-treinos" className="luxury-card p-5 hover:border-primary/50">
          <Dumbbell className="size-6 text-primary" />
          <h3 className="mt-3 font-display text-lg">Meus treinos</h3>
          <p className="text-xs text-muted-foreground">{data?.treinos.length ?? 0} fichas disponíveis</p>
        </Link>
        <Link to="/minha-agenda" className="luxury-card p-5 hover:border-primary/50">
          <Calendar className="size-6 text-primary" />
          <h3 className="mt-3 font-display text-lg">Próximos compromissos</h3>
          <p className="text-xs text-muted-foreground">{data?.prox.length ?? 0} agendados</p>
        </Link>
        <Link to="/meus-pagamentos" className="luxury-card p-5 hover:border-primary/50">
          <Receipt className="size-6 text-primary" />
          <h3 className="mt-3 font-display text-lg">Plano atual</h3>
          <p className="text-xs text-muted-foreground">
            {data?.pgto ? `${(data.pgto.produtos as { nome?: string } | null)?.nome ?? "Plano"} até ${data.pgto.fim_vigencia ? new Date(data.pgto.fim_vigencia).toLocaleDateString("pt-BR") : "—"}` : "Sem plano ativo"}
          </p>
        </Link>
      </section>

      <section className="luxury-card p-5">
        <h2 className="font-display text-lg">Próximos compromissos</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {data?.prox.map((e, i) => (
            <li key={i} className="flex justify-between border-b border-border/40 pb-1">
              <span>{e.titulo}</span>
              <span className="text-xs text-muted-foreground">{new Date(e.inicio).toLocaleString("pt-BR")}</span>
            </li>
          ))}
          {!data?.prox.length && <li className="text-xs text-muted-foreground">Nenhum compromisso agendado.</li>}
        </ul>
      </section>
    </div>
  );
}
