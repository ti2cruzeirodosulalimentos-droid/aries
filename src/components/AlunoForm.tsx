import { useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Loader2, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/lib/permissions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { alunoSchema, validate } from "@/lib/validation/schemas";

export interface AlunoFormValues {
  id?: string;
  full_name: string;
  photo_url?: string | null;
  birth_date?: string | null;
  gender?: "M" | "F" | "Outro" | null;
  cpf?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  profession?: string | null;
  goal?: string | null;
  notes?: string | null;
  status?: "ativo" | "inativo" | "vencendo";
  plan_expires_at?: string | null;
  personal_id?: string | null;
}

const empty: AlunoFormValues = {
  full_name: "",
  status: "ativo",
};

export function AlunoForm({ initial, mode }: { initial?: AlunoFormValues; mode: "create" | "edit" }) {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [values, setValues] = useState<AlunoFormValues>(initial ?? empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: personals = [] } = useQuery({
    queryKey: ["personals-list"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data: rs } = await supabase.from("user_roles").select("user_id").in("role", ["personal", "admin"]);
      const ids = (rs ?? []).map((r) => r.user_id);
      if (!ids.length) return [];
      const { data: ps } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      return ps ?? [];
    },
  });

  function set<K extends keyof AlunoFormValues>(key: K, value: AlunoFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sessão expirada");
      const check = validate(alunoSchema, values);
      if (!check.ok) {
        setErrors(check.errors);
        throw new Error(check.message);
      }
      setErrors({});
      const v = check.data;
      const payload = {
        personal_id: (isAdmin && v.personal_id) ? v.personal_id : user.id,
        full_name: v.full_name,
        photo_url: values.photo_url || null,
        birth_date: v.birth_date ?? null,
        gender: v.gender ?? null,
        cpf: v.cpf ?? null,
        phone: v.phone ?? null,
        whatsapp: v.whatsapp ?? null,
        email: v.email ?? null,
        address: v.address ?? null,
        profession: v.profession ?? null,
        goal: v.goal ?? null,
        notes: v.notes ?? null,
        status: v.status ?? "ativo",
        plan_expires_at: v.plan_expires_at ?? null,
      };
      if (mode === "create") {
        const { data, error } = await supabase.from("alunos").insert(payload).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("alunos").update(payload).eq("id", values.id!).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast.success(mode === "create" ? "Aluno cadastrado!" : "Alterações salvas");
      qc.invalidateQueries({ queryKey: ["alunos"] });
      qc.invalidateQueries({ queryKey: ["aluno"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      navigate({ to: "/alunos" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const del = useMutation({
    mutationFn: async () => {
      if (!values.id) return;
      const { error } = await supabase.from("alunos").delete().eq("id", values.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aluno excluído");
      qc.invalidateQueries({ queryKey: ["alunos"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      navigate({ to: "/alunos" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  async function handlePhoto(file: File) {
    if (!user) return;
    setPhotoUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("aluno-fotos").upload(path, file, { upsert: false, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("aluno-fotos").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr) throw signErr;
      set("photo_url", signed.signedUrl);
      toast.success("Foto enviada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setPhotoUploading(false);
    }
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
      className="mx-auto max-w-4xl space-y-6"
    >
      <div className="luxury-card rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold">Foto & Identificação</h2>

        <div className="mt-5 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="relative">
            <div className="size-24 overflow-hidden rounded-full gold-border bg-muted">
              {values.photo_url ? (
                <img src={values.photo_url} alt="" className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center font-display text-3xl gold-text">
                  {values.full_name?.charAt(0).toUpperCase() || "?"}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 grid size-9 place-items-center rounded-full bg-primary text-primary-foreground gold-glow"
              aria-label="Trocar foto"
            >
              {photoUploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhoto(f); }}
            />
          </div>

          <div className="grid flex-1 gap-4 sm:grid-cols-2 w-full">
            <Field label="Nome completo *" error={errors.full_name}>
              <Input value={values.full_name} onChange={(e) => set("full_name", e.target.value)} required className="h-11 bg-input/60" />
            </Field>
            <Field label="Data de nascimento" error={errors.birth_date}>
              <Input type="date" value={values.birth_date ?? ""} onChange={(e) => set("birth_date", e.target.value)} className="h-11 bg-input/60" />
            </Field>
            <Field label="Sexo" error={errors.gender}>
              <select
                value={values.gender ?? ""}
                onChange={(e) => set("gender", (e.target.value || null) as AlunoFormValues["gender"])}
                className="h-11 w-full rounded-md bg-input/60 px-3 text-sm"
              >
                <option value="">—</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </Field>
            <Field label="CPF" error={errors.cpf}>
              <Input value={values.cpf ?? ""} onChange={(e) => set("cpf", e.target.value)} className="h-11 bg-input/60" />
            </Field>
          </div>
        </div>
      </div>

      <div className="luxury-card rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold">Contato</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Telefone" error={errors.phone}>
            <Input value={values.phone ?? ""} onChange={(e) => set("phone", e.target.value)} className="h-11 bg-input/60" />
          </Field>
          <Field label="WhatsApp" error={errors.whatsapp}>
            <Input value={values.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} placeholder="5511..." className="h-11 bg-input/60" />
          </Field>
          <Field label="E-mail" error={errors.email}>
            <Input type="email" value={values.email ?? ""} onChange={(e) => set("email", e.target.value)} className="h-11 bg-input/60" />
          </Field>
          <Field label="Profissão" error={errors.profession}>
            <Input value={values.profession ?? ""} onChange={(e) => set("profession", e.target.value)} className="h-11 bg-input/60" />
          </Field>
          <Field label="Endereço" className="sm:col-span-2" error={errors.address}>
            <Input value={values.address ?? ""} onChange={(e) => set("address", e.target.value)} className="h-11 bg-input/60" />
          </Field>
        </div>
      </div>

      <div className="luxury-card rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold">Objetivo & Plano</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Objetivo principal" className="sm:col-span-2" error={errors.goal}>
            <Input value={values.goal ?? ""} onChange={(e) => set("goal", e.target.value)} placeholder="Ex: hipertrofia, emagrecimento..." className="h-11 bg-input/60" />
          </Field>
          <Field label="Status">
            <select
              value={values.status ?? "ativo"}
              onChange={(e) => set("status", e.target.value as AlunoFormValues["status"])}
              className="h-11 w-full rounded-md bg-input/60 px-3 text-sm"
            >
              <option value="ativo">Ativo</option>
              <option value="vencendo">Vencendo</option>
              <option value="inativo">Inativo</option>
            </select>
          </Field>
          <Field label="Vencimento do plano">
            <Input type="date" value={values.plan_expires_at ?? ""} onChange={(e) => set("plan_expires_at", e.target.value)} className="h-11 bg-input/60" />
          </Field>
          {isAdmin && (
            <Field label="Personal responsável *" className="sm:col-span-2">
              <select
                value={values.personal_id ?? user?.id ?? ""}
                onChange={(e) => set("personal_id", e.target.value)}
                className="h-11 w-full rounded-md bg-input/60 px-3 text-sm"
                required
              >
                <option value="">Selecione...</option>
                {personals.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name ?? p.id}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Observações" className="sm:col-span-2">
            <Textarea value={values.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={4} className="bg-input/60" />
          </Field>
        </div>
      </div>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl bg-background/80 p-3 backdrop-blur gold-border">
        <Button
          type="submit"
          disabled={save.isPending}
          className="h-11 flex-1 bg-primary font-semibold text-primary-foreground hover:opacity-90 gold-glow sm:flex-none sm:px-8"
        >
          {save.isPending ? <Loader2 className="size-4 animate-spin" /> : (<><Save className="size-4" /> Salvar</>)}
        </Button>
        {mode === "edit" && (
          <Button
            type="button"
            variant="outline"
            disabled={del.isPending}
            onClick={() => {
              if (confirm("Excluir este aluno? Esta ação não pode ser desfeita.")) del.mutate();
            }}
            className="h-11 border-destructive/40 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-4" /> Excluir
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={() => navigate({ to: "/alunos" })} className="h-11">
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function Field({ label, className, error, children }: { label: string; className?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
