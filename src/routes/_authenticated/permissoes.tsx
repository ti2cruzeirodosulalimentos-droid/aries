import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, useEffect } from "react";
import { Shield, Save, Eye, Plus, Pencil, Trash2, Check, X as XIcon, UserCog, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions, type Modulo, type Acao } from "@/lib/permissions";
import { adminDisableAccount } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/permissoes")({
  head: () => ({ meta: [{ title: "Permissões — ARIÉS" }] }),
  component: PermissoesPage,
});

const MODULOS: { key: Modulo; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "alunos", label: "Alunos" },
  { key: "anamnese", label: "Anamnese" },
  { key: "avaliacoes", label: "Avaliação Física" },
  { key: "treinos", label: "Treinos" },
  { key: "exercicios", label: "Biblioteca de Exercícios" },
  { key: "nutricao", label: "Nutrição" },
  { key: "metas", label: "Metas" },
  { key: "fotos", label: "Fotos de Evolução" },
  { key: "permissoes", label: "Painel de Permissões" },
];

const ACOES: { key: Acao; label: string; icon: typeof Eye }[] = [
  { key: "view", label: "Visualizar", icon: Eye },
  { key: "create", label: "Criar", icon: Plus },
  { key: "edit", label: "Editar", icon: Pencil },
  { key: "delete", label: "Excluir", icon: Trash2 },
];

type PermRow = { modulo: Modulo; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean };
type PermMap = Record<Modulo, PermRow>;

function emptyMap(): PermMap {
  const m = {} as PermMap;
  for (const mod of MODULOS) m[mod.key] = { modulo: mod.key, can_view: false, can_create: false, can_edit: false, can_delete: false };
  return m;
}

function PermissoesPage() {
  const { isAdmin, loading: permsLoading } = usePermissions();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<PermMap>(emptyMap());

  const { data: users } = useQuery({
    queryKey: ["all-users"],
    enabled: isAdmin,
    queryFn: async () => {
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

  const { data: userPerms } = useQuery({
    queryKey: ["user-perms", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data } = await supabase
        .from("permissoes")
        .select("modulo, can_view, can_create, can_edit, can_delete")
        .eq("user_id", selected!);
      return (data ?? []) as PermRow[];
    },
  });

  useEffect(() => {
    if (!userPerms) return;
    const map = emptyMap();
    userPerms.forEach((p) => {
      map[p.modulo] = p;
    });
    setDraft(map);
  }, [userPerms]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const rows = MODULOS.map((m) => ({ user_id: selected, ...draft[m.key] }));
      const { error } = await supabase.from("permissoes").upsert(rows, { onConflict: "user_id,modulo" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Permissões atualizadas");
      qc.invalidateQueries({ queryKey: ["user-perms", selected] });
      qc.invalidateQueries({ queryKey: ["my-permissions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleRoleAdmin = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      if (makeAdmin) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
        if (error && !error.message.includes("duplicate")) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["all-users"] });
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "personal" | "aluno" }) => {
      const { error } = await supabase.rpc("admin_set_role", { _target: userId, _role: role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Papel atualizado");
      qc.invalidateQueries({ queryKey: ["all-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disableFn = useServerFn(adminDisableAccount);
  const disableAccount = useMutation({
    mutationFn: async (userId: string) => disableFn({ data: { targetUserId: userId } }),
    onSuccess: () => {
      toast.success("Conta desativada. O login foi bloqueado, os dados foram preservados.");
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["all-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedUser = useMemo(() => users?.find((u) => u.id === selected) ?? null, [users, selected]);

  if (permsLoading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  function setAll(value: boolean) {
    const m = emptyMap();
    for (const mod of MODULOS) m[mod.key] = { modulo: mod.key, can_view: value, can_create: value, can_edit: value, can_delete: value };
    setDraft(m);
  }

  function applyTemplate(t: "personal" | "readonly") {
    const m = emptyMap();
    for (const mod of MODULOS) {
      if (t === "personal") {
        const isAdminPanel = mod.key === "permissoes";
        m[mod.key] = { modulo: mod.key, can_view: !isAdminPanel, can_create: !isAdminPanel, can_edit: !isAdminPanel, can_delete: !isAdminPanel };
      } else {
        m[mod.key] = { modulo: mod.key, can_view: mod.key !== "permissoes", can_create: false, can_edit: false, can_delete: false };
      }
    }
    setDraft(m);
  }

  function toggle(mod: Modulo, acao: Acao) {
    setDraft((d) => {
      const row = { ...d[mod] };
      const key = `can_${acao}` as keyof PermRow;
      (row[key] as boolean) = !row[key];
      return { ...d, [mod]: row };
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="grid place-items-center size-12 rounded-xl gold-border bg-secondary">
          <Shield className="size-6 text-primary" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Administração</p>
          <h1 className="font-display text-2xl font-semibold">Painel de Permissões</h1>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Users list */}
        <div className="luxury-card p-2 h-fit">
          <p className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">Usuários</p>
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {users?.map((u) => {
              const active = selected === u.id;
              const isUserAdmin = u.roles.includes("admin");
              return (
                <button
                  key={u.id}
                  onClick={() => setSelected(u.id)}
                  className={`w-full text-left rounded-lg px-3 py-2.5 transition flex items-center gap-3 ${
                    active ? "bg-primary/10 gold-border" : "hover:bg-secondary"
                  }`}
                >
                  <div className="grid place-items-center size-9 rounded-full bg-secondary text-primary font-display">
                    {u.full_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.full_name}</p>
                    <div className="flex gap-1 mt-0.5">
                      {isUserAdmin && (
                        <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-primary">
                          Admin
                        </span>
                      )}
                      {u.roles.filter((r) => r !== "admin").map((r) => (
                        <span key={r} className="rounded bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
            {!users?.length && <p className="px-3 py-4 text-xs text-muted-foreground">Nenhum usuário</p>}
          </div>
        </div>

        {/* Permissions matrix */}
        <div className="luxury-card p-5 space-y-5">
          {!selectedUser ? (
            <div className="grid place-items-center py-20 text-center">
              <UserCog className="size-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Selecione um usuário para gerenciar suas permissões</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Editando</p>
                  <h2 className="font-display text-xl">{selectedUser.full_name}</h2>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => setRole.mutate({ userId: selectedUser.id, role: "aluno" })}>
                    Definir como Aluno
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRole.mutate({ userId: selectedUser.id, role: "personal" })}>
                    Promover a Personal
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRole.mutate({ userId: selectedUser.id, role: "admin" })}>
                    Promover a Admin
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setAll(true)}>
                  <Check className="size-3.5" /> Marcar tudo
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAll(false)}>
                  <XIcon className="size-3.5" /> Desmarcar tudo
                </Button>
                <Button size="sm" variant="outline" onClick={() => applyTemplate("personal")}>
                  Template: Personal
                </Button>
                <Button size="sm" variant="outline" onClick={() => applyTemplate("readonly")}>
                  Template: Somente leitura
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-xs uppercase tracking-wider text-muted-foreground">Módulo</th>
                      {ACOES.map((a) => {
                        const Icon = a.icon;
                        return (
                          <th key={a.key} className="py-3 px-2 text-center text-xs uppercase tracking-wider text-muted-foreground">
                            <div className="flex flex-col items-center gap-1">
                              <Icon className="size-3.5 text-primary" />
                              {a.label}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {MODULOS.map((m) => (
                      <tr key={m.key} className="border-b border-border/40 hover:bg-primary/5">
                        <td className="py-3 px-2 font-medium">{m.label}</td>
                        {ACOES.map((a) => {
                          const checked = !!draft[m.key][`can_${a.key}` as keyof PermRow];
                          return (
                            <td key={a.key} className="py-3 px-2 text-center">
                              <button
                                onClick={() => toggle(m.key, a.key)}
                                className={`size-7 rounded-md border-2 grid place-items-center transition ${
                                  checked
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-border hover:border-primary/50"
                                }`}
                                aria-label={`${a.label} ${m.label}`}
                              >
                                {checked && <Check className="size-4" />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between gap-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/40 hover:bg-destructive/10"
                  onClick={() => {
                    if (confirm(`Excluir conta de ${selectedUser.full_name}?\n\nO login será bloqueado permanentemente, mas todos os dados (avaliações, treinos, vendas) serão preservados.`))
                      disableAccount.mutate(selectedUser.id);
                  }}
                  disabled={disableAccount.isPending}
                >
                  <UserX className="size-4" /> {disableAccount.isPending ? "Excluindo..." : "Excluir conta"}
                </Button>
                <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                  <Save className="size-4" /> {saveMut.isPending ? "Salvando..." : "Salvar alterações"}
                </Button>
              </div>

              {selectedUser.roles.includes("admin") && (
                <p className="text-xs text-primary/80 bg-primary/5 rounded-md p-3 gold-border">
                  ⚡ Este usuário é administrador e possui acesso total, independentemente das permissões marcadas acima.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
