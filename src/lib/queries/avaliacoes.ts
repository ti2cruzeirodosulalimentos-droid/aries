import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
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

/** Dados mínimos do aluno para montar uma nova avaliação (gênero/idade). */
export function useAlunoParaAvaliacao(alunoId: string) {
  return useQuery({
    queryKey: qk.avaliacoes.alunoCtx(alunoId),
    enabled: !!alunoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alunos")
        .select("full_name, gender, birth_date")
        .eq("id", alunoId)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

/** Avaliação + aluno + anamnese mais recente, usados no detalhe e no PDF. */
export function useAvaliacaoDetail(alunoId: string, avalId: string) {
  return useQuery({
    queryKey: qk.avaliacoes.detail(avalId),
    enabled: !!avalId && !!alunoId,
    queryFn: async () => {
      const [aval, aluno, anam] = await Promise.all([
        supabase.from("avaliacoes_fisicas").select("*").eq("id", avalId).single(),
        supabase.from("alunos").select("*").eq("id", alunoId).single(),
        supabase
          .from("anamneses")
          .select("*")
          .eq("aluno_id", alunoId)
          .order("data_anamnese", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (aval.error) throw aval.error;
      if (aluno.error) throw aluno.error;
      return { aval: aval.data, aluno: aluno.data, anam: anam.data };
    },
  });
}

/** Insere uma avaliação física já montada pela tela; devolve o id criado. */
export function useCreateAvaliacao(alunoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TablesInsert<"avaliacoes_fisicas">) => {
      const { data, error } = await supabase
        .from("avaliacoes_fisicas")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.avaliacoes.all });
      qc.invalidateQueries({ queryKey: qk.evolucao.byAluno(alunoId) });
    },
  });
}

/** Exclui uma avaliação e atualiza listas + evolução do aluno. */
export function useDeleteAvaliacao(alunoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (avalId: string) => {
      const { error } = await supabase.from("avaliacoes_fisicas").delete().eq("id", avalId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.avaliacoes.all });
      qc.invalidateQueries({ queryKey: qk.evolucao.byAluno(alunoId) });
    },
  });
}
