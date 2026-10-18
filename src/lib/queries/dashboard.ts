import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { qk } from "@/lib/query-keys";
import { hojeYmd, resumoFinanceiro, type LancamentoFin, type VendaFin } from "@/lib/financeiro-calc";

/** Métricas do dashboard do personal/admin. */
export function useDashboardPro(userId?: string) {
  return useQuery({
    queryKey: qk.dashboard.pro(userId),
    enabled: !!userId,
    queryFn: async () => {
      const hoje = new Date();
      const hojeStr = hojeYmd();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
      const inicioAno = `${hojeStr.slice(0, 4)}-01-01`;
      // Receita = o que foi PAGO (por data de pagamento); o pendente entra em "a receber".
      // Buscamos: tudo que está pendente + o que foi pago neste ano.
      const filtroFin = `pagamento_status.eq.pendente,pago_em.gte.${inicioAno}`;
      const [
        { count: total }, { count: ativos }, { count: vencendo }, { count: novos },
        { count: avaliacoesMes }, { data: vendasFin }, { data: lancamentosFin }, { data: meta }, { data: planosAtivos },
        { data: proximos },
      ] = await Promise.all([
        supabase.from("alunos").select("*", { count: "exact", head: true }),
        supabase.from("alunos").select("*", { count: "exact", head: true }).eq("status", "ativo"),
        supabase.from("alunos").select("*", { count: "exact", head: true }).eq("status", "vencendo"),
        supabase.from("alunos").select("*", { count: "exact", head: true }).gte("created_at", inicioMes),
        supabase.from("avaliacoes_fisicas").select("*", { count: "exact", head: true }).gte("created_at", inicioMes),
        supabase.from("vendas").select("id, aluno_id, valor_centavos, data_venda, status, pagamento_status, pago_em").or(filtroFin),
        // tabela nova (lançamentos avulsos): se ainda não existir, o painel segue sem ela
        (supabase as any).from("lancamentos").select("id, tipo, valor_centavos, data_lancamento, pagamento_status, pago_em").or(filtroFin),
        supabase.from("metas_financeiras").select("valor_centavos").eq("mes", hoje.getMonth() + 1).eq("ano", hoje.getFullYear()).maybeSingle(),
        // alunos com plano em vigor (vários períodos seguidos do mesmo aluno contam uma vez)
        supabase.from("vendas").select("aluno_id, produtos!inner(tipo)").eq("produtos.tipo", "plano").gte("fim_vigencia", hojeStr).eq("status", "ativo"),
        supabase.from("agenda_eventos").select("id, titulo, inicio, tipo, alunos(full_name)").gte("inicio", hoje.toISOString()).order("inicio").limit(5),
      ]);

      const fin = resumoFinanceiro((vendasFin ?? []) as VendaFin[], (lancamentosFin ?? []) as LancamentoFin[], hojeStr);
      return {
        total: total ?? 0, ativos: ativos ?? 0, vencendo: vencendo ?? 0, novos: novos ?? 0,
        avaliacoesMes: avaliacoesMes ?? 0, planosAtivos: new Set((planosAtivos ?? []).map((p) => p.aluno_id)).size,
        receitaMes: fin.recebidoMes, receitaAno: fin.recebidoAno, meta: meta?.valor_centavos ?? 0,
        aReceber: fin.aReceber, vencidasQtd: fin.vencidasQtd, vencidasValor: fin.vencidasValor,
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
        // "Plano atual" = venda ativa mais recente de PLANO: avaliações (lançadas automaticamente) não podem ocupar o lugar dele.
        supabase.from("vendas").select("fim_vigencia, status, produtos!inner(nome, tipo)").eq("status", "ativo").eq("produtos.tipo", "plano").order("data_venda", { ascending: false }).limit(1),
        supabase.from("treinos").select("id, nome").order("created_at", { ascending: false }).limit(5),
      ]);
      return { aluno, prox: prox ?? [], pgto: pgto?.[0] ?? null, treinos: treinos ?? [] };
    },
  });
}
