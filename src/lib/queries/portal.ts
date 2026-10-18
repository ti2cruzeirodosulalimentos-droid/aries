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
        .select("id, valor_centavos, data_venda, fim_vigencia, status, forma_pagamento, pagamento_status, pago_em, produtos(nome, tipo)")
        // Lançamentos gerados sozinhos pelas avaliações são controle interno do personal — o aluno só vê o que
        // foi registrado à mão (planos, vendas avulsas). Dois filtros: avaliacao_id preenchido, e a marca no texto,
        // porque ao EXCLUIR a avaliação o banco cancela o lançamento e zera o vínculo (a marca continua).
        .is("avaliacao_id", null)
        .or('observacao.is.null,observacao.not.like."Gerado automaticamente*"')
        .order("data_venda", { ascending: false });
      return data ?? [];
    },
  });
}
