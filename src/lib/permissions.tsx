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
export type Role = "admin" | "personal" | "nutricionista" | "aluno";

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
  isNutricionista: boolean;
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
  isNutricionista: false,
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
      const role: Role = roles.includes("admin")
        ? "admin"
        : roles.includes("personal")
          ? "personal"
          : roles.includes("nutricionista")
            ? "nutricionista"
            : "aluno";
      return { perms, role, alunoId: aRes.data?.id ?? null };
    },
  });

  const role = data?.role ?? "aluno";
  const isAdmin = role === "admin";
  const isPersonal = role === "personal";
  const isNutricionista = role === "nutricionista";
  const isAluno = role === "aluno";
  const perms = data?.perms ?? [];

  const can = (m: Modulo, a: Acao) => {
    if (isAdmin) return true;
    if (isPersonal) {
      // Personal cuida de treino; nutrição é módulo exclusivo do nutricionista.
      if (m === "permissoes" || m === "nutricao") return false;
      return true;
    }
    if (isNutricionista) {
      // Nutricionista cuida de dieta; treino/exercícios são exclusivos do personal.
      if (m === "permissoes" || m === "treinos" || m === "exercicios") return false;
      return true;
    }
    // aluno: apenas leitura limitada, via tabela de permissões granular
    const row = perms.find((p) => p.modulo === m);
    if (!row) return false;
    return a === "view" ? row.can_view : a === "create" ? row.can_create : a === "edit" ? row.can_edit : row.can_delete;
  };

  return (
    <Ctx.Provider value={{ perms, role, isAdmin, isPersonal, isNutricionista, isAluno, alunoId: data?.alunoId ?? null, loading: isLoading, can }}>
      {children}
    </Ctx.Provider>
  );
}

export const usePermissions = () => useContext(Ctx);
