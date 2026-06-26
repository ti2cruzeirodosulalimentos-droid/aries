import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { adminDisableAccount, adminEnableAccount } from "@/lib/admin.functions";
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
      qc.invalidateQueries({ queryKey: qk.dashboard.all });
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
      qc.invalidateQueries({ queryKey: qk.dashboard.all });
    },
  });
}

export interface ToggleStatusInput {
  status: string | null;
  user_id: string | null;
}

export interface ToggleStatusResult {
  novoStatus: "ativo" | "inativo";
  /** Mensagem quando o status mudou mas o bloqueio/desbloqueio de login falhou. */
  loginWarning: string | null;
}

/**
 * Alterna ativo/inativo do aluno e, se houver conta vinculada, bloqueia ou
 * libera o login via server fns admin. Falha no login não derruba a operação:
 * é devolvida em `loginWarning` para a tela avisar.
 */
export function useToggleAlunoStatus(id: string) {
  const qc = useQueryClient();
  const disableFn = useServerFn(adminDisableAccount);
  const enableFn = useServerFn(adminEnableAccount);
  return useMutation({
    mutationFn: async (aluno: ToggleStatusInput): Promise<ToggleStatusResult> => {
      const novoStatus = aluno.status === "inativo" ? "ativo" : "inativo";
      const { error } = await supabase.from("alunos").update({ status: novoStatus }).eq("id", id);
      if (error) throw error;
      let loginWarning: string | null = null;
      if (aluno.user_id) {
        try {
          if (novoStatus === "inativo") await disableFn({ data: { targetUserId: aluno.user_id } });
          else await enableFn({ data: { targetUserId: aluno.user_id } });
        } catch (e) {
          loginWarning = (e as Error).message;
        }
      }
      return { novoStatus, loginWarning };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.alunos.all });
      qc.invalidateQueries({ queryKey: qk.dashboard.all });
    },
  });
}
