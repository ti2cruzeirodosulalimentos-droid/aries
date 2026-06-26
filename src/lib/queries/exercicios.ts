import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { qk } from "@/lib/query-keys";

export interface Exercicio {
  id: string;
  nome: string;
  grupo_muscular: string | null;
  equipamento: string | null;
  nivel: string | null;
  categoria: string | null;
  gif_url: string | null;
  imagem_url: string | null;
  video_url: string | null;
  instrucoes: string | null;
  musculos_alvo: string[] | null;
  musculos_secundarios: string | null;
  created_by: string | null;
  is_publico: boolean | null;
}

// A tabela `exercicios` ainda não está nos tipos gerados do Supabase.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useExercicios() {
  return useQuery({
    queryKey: qk.exercicios.list(),
    queryFn: async (): Promise<Exercicio[]> => {
      const { data, error } = await db.from("exercicios").select("*").order("grupo_muscular").order("nome");
      if (error) throw error;
      return (data ?? []) as Exercicio[];
    },
  });
}

export function useCreateExercicio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Exercicio> & { created_by: string }) => {
      const { error } = await db.from("exercicios").insert({ ...payload, is_publico: false });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.exercicios.all }),
  });
}

/** Exclui um exercício com remoção OTIMISTA da lista em cache. */
export function useDeleteExercicio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("exercicios").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.exercicios.all });
      const prev = qc.getQueriesData<Exercicio[]>({ queryKey: qk.exercicios.all });
      qc.setQueriesData<Exercicio[]>({ queryKey: qk.exercicios.all }, (old) =>
        old ? old.filter((e) => e.id !== id) : old,
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => ctx?.prev?.forEach(([key, value]) => qc.setQueryData(key, value)),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.exercicios.all }),
  });
}
