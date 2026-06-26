import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export interface AlunoUpsert {
  id?: string;
  personal_id: string;
  full_name: string;
  photo_url?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  cpf?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  profession?: string | null;
  goal?: string | null;
  notes?: string | null;
  status?: string;
  plan_expires_at?: string | null;
}

/** Cria ou atualiza um aluno; invalida as listas e popula o cache do detalhe. */
export function useUpsertAluno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: AlunoUpsert) => {
      if (id) {
        const { data, error } = await supabase.from("alunos").update(rest).eq("id", id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from("alunos").insert(rest).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.alunos.all });
      if (data?.id) qc.setQueryData(qk.alunos.detail(data.id), data);
    },
  });
}

/** Exclui um aluno com remoção OTIMISTA das listas em cache (rollback no erro). */
export function useDeleteAluno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alunos").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.alunos.lists });
      const prev = qc.getQueriesData<AlunosPage>({ queryKey: qk.alunos.lists });
      qc.setQueriesData<AlunosPage>({ queryKey: qk.alunos.lists }, (old) =>
        old ? { rows: old.rows.filter((r) => r.id !== id), total: Math.max(0, old.total - 1) } : old,
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      ctx?.prev?.forEach(([key, value]) => qc.setQueryData(key, value));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.alunos.all });
    },
  });
}
