import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { qk } from "@/lib/query-keys";

/** Lista de avaliações físicas de um aluno (mais recente primeiro). */
export function useAvaliacoesByAluno(alunoId: string) {
  return useQuery({
    queryKey: qk.avaliacoes.byAluno(alunoId),
    enabled: !!alunoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avaliacoes_fisicas")
        .select("id, data_avaliacao, peso, percentual_gordura, massa_magra, imc, protocolo")
        .eq("aluno_id", alunoId)
        .order("data_avaliacao", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
