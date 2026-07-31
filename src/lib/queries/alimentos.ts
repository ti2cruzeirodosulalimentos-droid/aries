import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { qk } from "@/lib/query-keys";

// alimentos/refeicao_itens ainda não estão nos tipos gerados do Supabase.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface Alimento {
  id: string;
  created_by: string | null;
  nome: string;
  categoria: string;
  unidade: string;
  porcao_base: number;
  kcal: number;
  proteina_g: number;
  carboidrato_g: number;
  gordura_g: number;
  fibra_g: number | null;
  sodio_mg: number | null;
  is_publico: boolean;
}

export const CATEGORIAS_ALIMENTO = ["Frutas", "Carnes", "Legumes", "Industrializados", "Suplementos", "Bebidas", "Outro"] as const;

export function useAlimentos() {
  return useQuery({
    queryKey: qk.alimentos.list(),
    queryFn: async (): Promise<Alimento[]> => {
      const { data, error } = await db.from("alimentos").select("*").order("categoria").order("nome");
      if (error) throw error;
      return (data ?? []) as Alimento[];
    },
  });
}

export function useCreateAlimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Alimento> & { created_by: string }) => {
      const { error } = await db.from("alimentos").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.alimentos.all }),
  });
}

export function useDeleteAlimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("alimentos").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.alimentos.all }),
  });
}

// ─── Itens estruturados de uma refeição ──────────────────────────────────────

export interface RefeicaoItem {
  id: string;
  refeicao_id: string;
  alimento_id: string;
  quantidade: number;
  ordem: number;
  observacoes: string | null;
  alimento: Alimento | null;
}

export function useRefeicaoItens(refeicaoId: string | undefined) {
  return useQuery({
    queryKey: qk.alimentos.itens(refeicaoId),
    enabled: !!refeicaoId,
    queryFn: async (): Promise<RefeicaoItem[]> => {
      const { data, error } = await db
        .from("refeicao_itens")
        .select("id, refeicao_id, alimento_id, quantidade, ordem, observacoes, alimento:alimentos(*)")
        .eq("refeicao_id", refeicaoId!)
        .order("ordem");
      if (error) throw error;
      return (data ?? []) as RefeicaoItem[];
    },
  });
}

export function useAddRefeicaoItem(refeicaoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ alimentoId, quantidade }: { alimentoId: string; quantidade: number }) => {
      const atuais = qc.getQueryData<RefeicaoItem[]>(qk.alimentos.itens(refeicaoId)) ?? [];
      const { error } = await db.from("refeicao_itens").insert({
        refeicao_id: refeicaoId, alimento_id: alimentoId, quantidade, ordem: atuais.length,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.alimentos.itens(refeicaoId) }),
  });
}

export function useUpdateRefeicaoItem(refeicaoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, quantidade }: { id: string; quantidade: number }) => {
      const { error } = await db.from("refeicao_itens").update({ quantidade }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.alimentos.itens(refeicaoId) }),
  });
}

export function useRemoveRefeicaoItem(refeicaoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("refeicao_itens").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.alimentos.itens(refeicaoId) }),
  });
}

/** Soma kcal/macros de uma lista de itens (quantidade * valor por porção-base). */
export function somaItens(itens: RefeicaoItem[]) {
  return itens.reduce(
    (acc, it) => {
      const a = it.alimento;
      if (!a || !a.porcao_base) return acc;
      const fator = it.quantidade / a.porcao_base;
      acc.kcal += a.kcal * fator;
      acc.proteina_g += a.proteina_g * fator;
      acc.carboidrato_g += a.carboidrato_g * fator;
      acc.gordura_g += a.gordura_g * fator;
      return acc;
    },
    { kcal: 0, proteina_g: 0, carboidrato_g: 0, gordura_g: 0 },
  );
}
