import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { qk } from "@/lib/query-keys";

// `produtos` recebe payload dinâmico do form admin → cast pontual nas operações.
const db = supabase as any;

const VENDAS_SELECT =
  "id, aluno_id, personal_id, produto_id, valor_centavos, data_venda, fim_vigencia, status, forma_pagamento, alunos(full_name), produtos(nome, tipo)";

/** Vendas com nome do aluno e produto embutidos (mais recente primeiro). */
export function useVendas(userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: qk.vendas.list(userId),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select(VENDAS_SELECT)
        .order("data_venda", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Meta financeira do mês/ano corrente do personal. */
export function useMetaFinanceira(userId: string | undefined, mes: number, ano: number) {
  return useQuery({
    queryKey: qk.metasFin.byMes(userId, mes, ano),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metas_financeiras")
        .select("id, valor_centavos")
        .eq("mes", mes)
        .eq("ano", ano)
        .eq("personal_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useDeleteVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.vendas.all }),
  });
}

export function useCreateVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TablesInsert<"vendas">) => {
      const { error } = await supabase.from("vendas").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.vendas.all }),
  });
}

export interface MetaFinanceiraInput {
  personal_id: string;
  mes: number;
  ano: number;
  valor_centavos: number;
}

export function useUpsertMetaFinanceira() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MetaFinanceiraInput) => {
      const { error } = await supabase
        .from("metas_financeiras")
        .upsert(input, { onConflict: "personal_id,mes,ano" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.metasFin.all }),
  });
}

/** id + nome + personal_id dos alunos, para selects (nova venda). */
export function useAlunosMin() {
  return useQuery({
    queryKey: qk.alunos.min,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alunos")
        .select("id, full_name, personal_id")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Catálogo de produtos ativos (para registrar venda). */
export function useProdutosAtivos() {
  return useQuery({
    queryKey: qk.produtos.ativos,
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await db.from("produtos").select("*").eq("ativo", true).order("preco_centavos");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Todos os produtos (gestão admin). */
export function useProdutosAdmin() {
  return useQuery({
    queryKey: qk.produtos.admin,
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await db.from("produtos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Cria (sem id) ou atualiza (com id) um produto; limpa timestamps do payload. */
export function useUpsertProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (form: Record<string, any>) => {
      const payload: Record<string, any> = { ...form };
      delete payload.created_at;
      delete payload.updated_at;
      if (payload.id) {
        const { error } = await db.from("produtos").update(payload).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("produtos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.produtos.all }),
  });
}

export function useDeleteProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("produtos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.produtos.all }),
  });
}
