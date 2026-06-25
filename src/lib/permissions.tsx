import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type Modulo =
  | "dashboard"
  | "alunos"
  | "anamnese"
  | "avaliacoes"
  | "treinos"
  | "exercicios"
  | "nutricao"
  | "metas"
  | "fotos"
  | "permissoes";

export type Acao = "view" | "create" | "edit" | "delete";
export type Role = "admin" | "personal" | "aluno";

export interface PermissaoRow {
  modulo: Modulo;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface PermCtx {
  perms: PermissaoRow[];
  role: Role;
  isAdmin: boolean;
  isPersonal: boolean;
  isAluno: boolean;
  alunoId: string | null;
  loading: boolean;
  can: (m: Modulo, a: Acao) => boolean;
}

const Ctx = createContext<PermCtx>({
  perms: [],
  role: "aluno",
  isAdmin: false,
  isPersonal: false,
  isAluno: true,
  alunoId: null,
  loading: true,
  can: () => false,
});

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["my-permissions", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [pRes, rRes, aRes] = await Promise.all([
        supabase.from("permissoes").select("modulo,can_view,can_create,can_edit,can_delete").eq("user_id", user!.id),
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
        supabase.from("alunos").select("id").eq("user_id", user!.id).maybeSingle(),
      ]);
      const perms = (pRes.data ?? []) as PermissaoRow[];
      const roles = (rRes.data ?? []).map((r: { role: Role }) => r.role);
      const role: Role = roles.includes("admin") ? "admin" : roles.includes("personal") ? "personal" : "aluno";
      return { perms, role, alunoId: aRes.data?.id ?? null };
    },
  });

  const role = data?.role ?? "aluno";
  const isAdmin = role === "admin";
  const isPersonal = role === "personal";
  const isAluno = role === "aluno";
  const perms = data?.perms ?? [];

  const can = (m: Modulo, a: Acao) => {
    if (isAdmin) return true;
    if (isPersonal) {
      // Personal tem acesso amplo aos próprios alunos
      if (m === "permissoes") return false;
      return true;
    }
    // aluno: apenas leitura limitada
    const row = perms.find((p) => p.modulo === m);
    if (!row) return false;
    return a === "view" ? row.can_view : a === "create" ? row.can_create : a === "edit" ? row.can_edit : row.can_delete;
  };

  return (
    <Ctx.Provider value={{ perms, role, isAdmin, isPersonal, isAluno, alunoId: data?.alunoId ?? null, loading: isLoading, can }}>
      {children}
    </Ctx.Provider>
  );
}

export const usePermissions = () => useContext(Ctx);
