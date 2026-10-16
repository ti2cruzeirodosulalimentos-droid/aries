import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
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

/** Última avaliação registrada do aluno — usada como "gabarito" (valores de referência) ao criar uma nova. */
export function useUltimaAvaliacao(alunoId: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.avaliacoes.ultima(alunoId),
    enabled: enabled && !!alunoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avaliacoes_fisicas")
        .select("*")
        .eq("aluno_id", alunoId)
        .order("data_avaliacao", { ascending: false })
        .limit(1)
        .maybeSingle();
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

/**
 * Insere uma avaliação física já montada pela tela. O valor da avaliação (valor_centavos) e o
 * lançamento financeiro são gerados pelo próprio banco (gatilhos avaliacao_define_valor e
 * avaliacao_gera_venda) — a tela não envia valor; aqui só confirmamos o valor lançado
 * pra mostrar ao usuário (vendaCentavos = null quando nada foi lançado).
 */
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
      const id = data.id as string;
      // A confirmação é só informativa: se falhar, a avaliação (já salva) não pode falhar junto.
      const { data: venda } = await (supabase as any)
        .from("vendas")
        .select("valor_centavos")
        .eq("avaliacao_id", id)
        .maybeSingle();
      return { id, vendaCentavos: (venda?.valor_centavos ?? null) as number | null };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.avaliacoes.all });
      qc.invalidateQueries({ queryKey: qk.evolucao.byAluno(alunoId) });
      qc.invalidateQueries({ queryKey: qk.vendas.all });
      qc.invalidateQueries({ queryKey: qk.dashboard.all });
    },
  });
}

/** Atualiza uma avaliação física existente (edição pós-criação). */
export function useUpdateAvaliacao(alunoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & TablesUpdate<"avaliacoes_fisicas">) => {
      const { error } = await supabase.from("avaliacoes_fisicas").update(payload).eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: qk.avaliacoes.all });
      qc.invalidateQueries({ queryKey: qk.avaliacoes.detail(id) });
      qc.invalidateQueries({ queryKey: qk.evolucao.byAluno(alunoId) });
      // editar a data da avaliação move também a data do lançamento financeiro
      qc.invalidateQueries({ queryKey: qk.vendas.all });
      qc.invalidateQueries({ queryKey: qk.dashboard.all });
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
      // o banco cancela o lançamento financeiro da avaliação removida
      qc.invalidateQueries({ queryKey: qk.vendas.all });
      qc.invalidateQueries({ queryKey: qk.dashboard.all });
    },
  });
}
