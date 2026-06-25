import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { qk } from "@/lib/query-keys";

export interface AlunoListItem {
  id: string;
  full_name: string;
  photo_url: string | null;
  status: string;
  goal: string | null;
  phone: string | null;
  created_at: string;
}

export interface AlunosListParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AlunosPage {
  rows: AlunoListItem[];
  total: number;
}

/**
 * Lista de alunos paginada com busca NO SERVIDOR (ilike) — escala para milhares
 * sem trazer tudo pro cliente. `keepPreviousData` deixa a paginação/busca suave.
 */
export function useAlunosList({ search = "", page = 1, pageSize = 12 }: AlunosListParams) {
  return useQuery({
    queryKey: qk.alunos.list({ search, page, pageSize }),
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<AlunosPage> => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      let query = supabase
        .from("alunos")
        .select("id, full_name, photo_url, status, goal, phone, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      const term = search.trim();
      if (term) query = query.ilike("full_name", `%${term}%`);
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: (data ?? []) as AlunoListItem[], total: count ?? 0 };
    },
  });
}

/** Detalhe de um aluno. */
export function useAluno(id: string) {
  return useQuery({
    queryKey: qk.alunos.detail(id),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("alunos").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
}
