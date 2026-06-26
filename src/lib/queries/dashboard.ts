import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { qk } from "@/lib/query-keys";

/** Métricas do dashboard do personal/admin. */
export function useDashboardPro(userId?: string) {
  return useQuery({
    queryKey: qk.dashboard.pro(userId),
    enabled: !!userId,
    queryFn: async () => {
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
      const inicioAno = new Date(hoje.getFullYear(), 0, 1).toISOString();
      const [
        { count: total }, { count: ativos }, { count: vencendo }, { count: novos },
        { count: avaliacoesMes }, { data: vendasYr }, { data: meta }, { data: planosAtivos },
        { data: proximos },
      ] = await Promise.all([
        supabase.from("alunos").select("*", { count: "exact", head: true }),
        supabase.from("alunos").select("*", { count: "exact", head: true }).eq("status", "ativo"),
        supabase.from("alunos").select("*", { count: "exact", head: true }).eq("status", "vencendo"),
        supabase.from("alunos").select("*", { count: "exact", head: true }).gte("created_at", inicioMes),
        supabase.from("avaliacoes_fisicas").select("*", { count: "exact", head: true }).gte("created_at", inicioMes),
        supabase.from("vendas").select("valor_centavos, data_venda, status").gte("data_venda", inicioAno.slice(0, 10)),
        supabase.from("metas_financeiras").select("valor_centavos").eq("mes", hoje.getMonth() + 1).eq("ano", hoje.getFullYear()).maybeSingle(),
        supabase.from("vendas").select("*", { count: "exact", head: true }).gte("fim_vigencia", hoje.toISOString().slice(0, 10)).eq("status", "ativo"),
        supabase.from("agenda_eventos").select("id, titulo, inicio, tipo, alunos(full_name)").gte("inicio", hoje.toISOString()).order("inicio").limit(5),
      ]);

      const vendas = (vendasYr ?? []).filter((v) => v.status !== "cancelado");
      const receitaAno = vendas.reduce((s, v) => s + v.valor_centavos, 0);
      const receitaMes = vendas.filter((v) => v.data_venda >= inicioMes.slice(0, 10)).reduce((s, v) => s + v.valor_centavos, 0);
      return {
        total: total ?? 0, ativos: ativos ?? 0, vencendo: vencendo ?? 0, novos: novos ?? 0,
        avaliacoesMes: avaliacoesMes ?? 0, planosAtivos: planosAtivos ?? 0,
        receitaMes, receitaAno, meta: meta?.valor_centavos ?? 0,
        proximos: proximos ?? [],
      };
    },
  });
}

/** Resumo do dashboard do aluno. */
export function useDashboardAluno(userId?: string) {
  return useQuery({
    queryKey: qk.dashboard.aluno(userId),
    enabled: !!userId,
    queryFn: async () => {
      const [{ data: aluno }, { data: prox }, { data: pgto }, { data: treinos }] = await Promise.all([
        supabase.from("alunos").select("full_name, goal, plan_expires_at").eq("user_id", userId!).maybeSingle(),
        supabase.from("agenda_eventos").select("titulo, inicio, tipo").gte("inicio", new Date().toISOString()).order("inicio").limit(3),
        supabase.from("vendas").select("produtos(nome), fim_vigencia, status").eq("status", "ativo").order("data_venda", { ascending: false }).limit(1),
        supabase.from("treinos").select("id, nome").order("created_at", { ascending: false }).limit(5),
      ]);
      return { aluno, prox: prox ?? [], pgto: pgto?.[0] ?? null, treinos: treinos ?? [] };
    },
  });
}
