import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { qk } from "@/lib/query-keys";

/** Treinos do próprio aluno (portal). */
export function useMeusTreinos(alunoId?: string | null) {
  const id = alunoId ?? undefined;
  return useQuery({
    queryKey: qk.portal.treinos(id),
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("treinos")
        .select("id, nome, letra, objetivo, created_at, aluno_id")
        .eq("aluno_id", id!)
        .order("letra");
      return data ?? [];
    },
  });
}

/** Próximos compromissos do aluno. */
export function useMinhaAgenda(uid?: string | null) {
  const id = uid ?? undefined;
  return useQuery({
    queryKey: qk.portal.agenda(id),
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("agenda_eventos")
        .select("id, titulo, tipo, inicio, fim, status, observacao")
        .gte("inicio", new Date().toISOString())
        .order("inicio");
      return data ?? [];
    },
  });
}

/** Histórico de pagamentos do aluno. */
export function useMeusPagamentos(uid?: string | null) {
  const id = uid ?? undefined;
  return useQuery({
    queryKey: qk.portal.pagamentos(id),
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("vendas")
        .select("id, valor_centavos, data_venda, fim_vigencia, status, forma_pagamento, produtos(nome, tipo)")
        .order("data_venda", { ascending: false });
      return data ?? [];
    },
  });
}
