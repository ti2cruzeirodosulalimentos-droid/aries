import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MessageCircle, Plus, Pencil, Trash2, Save, X, Mail, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/lib/permissions";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mensagens")({
  head: () => ({ meta: [{ title: "Mensagens — ARIÉS" }] }),
  component: MensagensPage,
});

type Template = {
  id: string;
  nome: string;
  canal: "whatsapp" | "email" | "ambos";
  assunto: string | null;
  corpo: string;
};

const EMPTY: Omit<Template, "id"> = { nome: "", canal: "whatsapp", assunto: "", corpo: "" };

function MensagensPage() {
  const { isAluno, loading } = usePermissions();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Template | null>(null);

  const { data: templates } = useQuery({
    queryKey: ["mensagens-templates"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensagens_templates")
        .select("id,nome,canal,assunto,corpo")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Template[];
    },
  });

  const saveMut = useMutation({
    mutationFn: async (t: Template | (Omit<Template, "id"> & { id?: string })) => {
      if ("id" in t && t.id) {
        const { error } = await supabase.from("mensagens_templates")
          .update({ nome: t.nome, canal: t.canal, assunto: t.assunto, corpo: t.corpo })
          .eq("id", t.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("mensagens_templates")
          .insert({ owner_id: user!.id, nome: t.nome, canal: t.canal, assunto: t.assunto, corpo: t.corpo });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Template salvo");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["mensagens-templates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mensagens_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removido");
      qc.invalidateQueries({ queryKey: ["mensagens-templates"] });
    },
  });

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  if (isAluno) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="grid place-items-center size-12 rounded-xl gold-border bg-secondary">
            <MessageCircle className="size-6 text-primary" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Comunicação</p>
            <h1 className="font-display text-2xl font-semibold">Mensagens & Lembretes</h1>
          </div>
        </div>
        <Button onClick={() => setEditing({ id: "", ...EMPTY })}>
          <Plus className="size-4" /> Novo template
        </Button>
      </header>

      <div className="luxury-card p-4 text-xs text-muted-foreground">
        <p className="mb-1 text-primary font-semibold">Como usar:</p>
        Crie mensagens reutilizáveis e envie pelo WhatsApp ou e-mail diretamente da ficha de cada aluno.
        Use os marcadores: <code className="text-primary">{"{nome}"}</code>, <code className="text-primary">{"{dias}"}</code>, <code className="text-primary">{"{vencimento}"}</code>, <code className="text-primary">{"{personal}"}</code>.
      </div>

      <div className="grid gap-3">
        {templates?.map((t) => (
          <div key={t.id} className="luxury-card p-4 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display text-lg">{t.nome}</h3>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary gold-border">
                    {t.canal === "ambos" ? "WhatsApp + E-mail" : t.canal === "email" ? "E-mail" : "WhatsApp"}
                  </span>
                </div>
                {t.assunto && <p className="text-xs text-muted-foreground mt-1">Assunto: {t.assunto}</p>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button size="sm" variant="outline" className="text-destructive border-destructive/40"
                  onClick={() => { if (confirm("Remover este template?")) deleteMut.mutate(t.id); }}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
            <p className="text-sm whitespace-pre-wrap text-foreground/90">{t.corpo}</p>
          </div>
        ))}
        {!templates?.length && (
          <div className="luxury-card p-12 text-center">
            <MessageCircle className="mx-auto size-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Nenhum template ainda. Crie o primeiro acima.</p>
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setEditing(null)}>
          <div className="luxury-card w-full max-w-xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">{editing.id ? "Editar template" : "Novo template"}</h2>
              <button onClick={() => setEditing(null)} className="rounded p-1 hover:bg-secondary">
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Nome interno</Label>
                <Input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })}
                  placeholder="Ex: Lembrete de treino" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Canal</Label>
                  <select value={editing.canal}
                    onChange={(e) => setEditing({ ...editing, canal: e.target.value as Template["canal"] })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">E-mail</option>
                    <option value="ambos">WhatsApp + E-mail</option>
                  </select>
                </div>
                <div>
                  <Label>Assunto (e-mail)</Label>
                  <Input value={editing.assunto ?? ""} onChange={(e) => setEditing({ ...editing, assunto: e.target.value })}
                    disabled={editing.canal === "whatsapp"} placeholder="Apenas para e-mail" />
                </div>
              </div>
              <div>
                <Label>Mensagem</Label>
                <Textarea rows={6} value={editing.corpo}
                  onChange={(e) => setEditing({ ...editing, corpo: e.target.value })}
                  placeholder="Olá {nome}! ..." />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Marcadores: <code className="text-primary">{"{nome}"}</code> · <code className="text-primary">{"{dias}"}</code> · <code className="text-primary">{"{vencimento}"}</code> · <code className="text-primary">{"{personal}"}</code>
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={() => saveMut.mutate(editing)} disabled={saveMut.isPending || !editing.nome || !editing.corpo}>
                <Save className="size-4" /> Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers exportados para uso na ficha do aluno
export function renderTemplate(corpo: string, vars: Record<string, string | number | null | undefined>) {
  return corpo.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k];
    return v === null || v === undefined ? "" : String(v);
  });
}

export function whatsappLink(phone: string, message: string) {
  const digits = (phone || "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function mailtoLink(email: string, subject: string, body: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function MessageIcons() { return <><Phone className="size-3" /><Mail className="size-3" /></>; }
