import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  upsertCustomField, deleteCustomField,
  upsertCategoria, deleteCategoria,
  upsertProtocolo, deleteProtocolo,
} from "@/lib/customizacao.functions";
import { qk } from "@/lib/query-keys";

export type Contexto = "anamnese" | "avaliacao";

// ─── Campos personalizados ───────────────────────────────────────────────────
export function useCustomFields(contexto: Contexto) {
  return useQuery({
    queryKey: qk.customizacao.fields(contexto),
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase
        .from("custom_fields")
        .select("*")
        .eq("contexto", contexto)
        .order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertCustomField(contexto: Contexto) {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertCustomField);
  return useMutation({
    mutationFn: async (payload: any) => upsert({ data: { ...payload, contexto } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.customizacao.fields(contexto) }),
  });
}

export function useDeleteCustomField(contexto: Contexto) {
  const qc = useQueryClient();
  const remove = useServerFn(deleteCustomField);
  return useMutation({
    mutationFn: async (id: string) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.customizacao.fields(contexto) }),
  });
}

// ─── Categorias de exercícios ────────────────────────────────────────────────
export function useCategorias() {
  return useQuery({
    queryKey: qk.customizacao.categorias,
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase.from("exercicio_categorias").select("*").order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertCategoria() {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertCategoria);
  return useMutation({
    mutationFn: async (payload: any) => upsert({ data: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.customizacao.categorias }),
  });
}

export function useDeleteCategoria() {
  const qc = useQueryClient();
  const remove = useServerFn(deleteCategoria);
  return useMutation({
    mutationFn: async (id: string) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.customizacao.categorias }),
  });
}

// ─── Protocolos de avaliação ─────────────────────────────────────────────────
export function useProtocolos() {
  return useQuery({
    queryKey: qk.customizacao.protocolos,
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase.from("protocolos_avaliacao").select("*").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertProtocolo() {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertProtocolo);
  return useMutation({
    mutationFn: async (payload: any) => upsert({ data: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.customizacao.protocolos }),
  });
}

export function useDeleteProtocolo() {
  const qc = useQueryClient();
  const remove = useServerFn(deleteProtocolo);
  return useMutation({
    mutationFn: async (id: string) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.customizacao.protocolos }),
  });
}
