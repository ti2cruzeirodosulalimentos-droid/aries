import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { adminDisableAccount } from "@/lib/admin.functions";
import type { Modulo } from "@/lib/permissions";
import { qk } from "@/lib/query-keys";

export interface AppUser {
  id: string;
  full_name: string;
  roles: string[];
}

export type PermRow = {
  modulo: Modulo;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

/** Lista de usuários com seus papéis (profiles + user_roles agregados). */
export function useAllUsers(enabled: boolean) {
  return useQuery({
    queryKey: qk.permissoes.users,
    enabled,
    queryFn: async (): Promise<AppUser[]> => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const rolesByUser = new Map<string, string[]>();
      (roles ?? []).forEach((r: { user_id: string; role: string }) => {
        const arr = rolesByUser.get(r.user_id) ?? [];
        arr.push(r.role);
        rolesByUser.set(r.user_id, arr);
      });
      return (profiles ?? []).map((p: { id: string; full_name: string | null }) => ({
        id: p.id,
        full_name: p.full_name ?? "Sem nome",
        roles: rolesByUser.get(p.id) ?? [],
      }));
    },
  });
}

/** Permissões por módulo de um usuário. */
export function useUserPerms(userId: string | null) {
  return useQuery({
    queryKey: qk.permissoes.userPerms(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissoes")
        .select("modulo, can_view, can_create, can_edit, can_delete")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []) as PermRow[];
    },
  });
}

/** Upsert das permissões do usuário selecionado (uma linha por módulo). */
export function useSavePerms(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: PermRow[]) => {
      if (!userId) return;
      const payload = rows.map((r) => ({ user_id: userId, ...r }));
      const { error } = await supabase.from("permissoes").upsert(payload, { onConflict: "user_id,modulo" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.permissoes.userPerms(userId) });
      // Chave do hook usePermissions() do usuário logado (em @/lib/permissions).
      qc.invalidateQueries({ queryKey: ["my-permissions"] });
    },
  });
}

/** Define o papel do usuário via RPC admin (admin | personal | aluno). */
export function useSetRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "personal" | "aluno" }) => {
      const { error } = await supabase.rpc("admin_set_role", { _target: userId, _role: role });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.permissoes.users }),
  });
}

/** Desativa a conta (bloqueia login, preserva dados) via server fn admin. */
export function useDisableAccount() {
  const qc = useQueryClient();
  const disableFn = useServerFn(adminDisableAccount);
  return useMutation({
    mutationFn: async (userId: string) => disableFn({ data: { targetUserId: userId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.permissoes.users }),
  });
}
