import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Target as TargetIcon, Trash2, X, CheckCircle2, Circle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { metaSchema, validate } from "@/lib/validation/schemas";

export const Route = createFileRoute("/_authenticated/alunos/$id/metas")({
  component: MetasPage,
});

const TIPOS = [
  { value: "peso", label: "Peso corporal", unidade: "kg" },
  { value: "percentual_gordura", label: "% de gordura", unidade: "%" },
  { value: "massa_magra", label: "Massa magra", unidade: "kg" },
  { value: "circunferencia", label: "Medida corporal", unidade: "cm" },
  { value: "performance", label: "Performance", unidade: "kg" },
  { value: "habito", label: "Hábito / Frequência", unidade: "x/sem" },
  { value: "outro", label: "Outro", unidade: "" },
];

function MetasPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["metas", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("metas").select("*").eq("aluno_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async ({ mId, patch }: { mId: string; patch: any }) => {
      const { error } = await (supabase as any).from("metas").update(patch).eq("id", mId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["metas", id] }),
  });

  const remove = useMutation({
    mutationFn: async (mId: string) => {
      const { error } = await (supabase as any).from("metas").delete().eq("id", mId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Meta removida"); qc.invalidateQueries({ queryKey: ["metas", id] }); },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Objetivos</p>
          <h2 className="font-display text-2xl font-semibold">Metas do Aluno</h2>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground hover:opacity-90">
          <Plus className="size-4" /> Nova meta
        </Button>
      </div>

      {isLoading ? (
        <div className="grid h-40 place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="luxury-card p-12 text-center">
          <TargetIcon className="size-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground mb-4">Nenhuma meta definida.</p>
          <Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground hover:opacity-90">
            <Plus className="size-4" /> Criar primeira meta
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data!.map((m: any) => (
            <MetaCard key={m.id} meta={m} onUpdate={(p) => update.mutate({ mId: m.id, patch: p })} onRemove={() => { if (confirm("Excluir meta?")) remove.mutate(m.id); }} />
          ))}
        </div>
      )}

      {open ? <NovaMetaModal alunoId={id} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["metas", id] }); }} /> : null}
    </div>
  );
}

function MetaCard({ meta, onUpdate, onRemove }: { meta: any; onUpdate: (p: any) => void; onRemove: () => void }) {
  const inicial = Number(meta.valor_inicial ?? 0);
  const atual = Number(meta.valor_atual ?? meta.valor_inicial ?? 0);
  const alvo = Number(meta.valor_alvo ?? 0);
  const totalDist = Math.abs(alvo - inicial) || 1;
  const feitoDist = Math.abs(atual - inicial);
  const progresso = Math.min(100, Math.max(0, (feitoDist / totalDist) * 100));
  const concluida = meta.status === "concluida";
  const tipoLabel = TIPOS.find((t) => t.value === meta.tipo)?.label ?? meta.tipo;

  return (
    <div className={`luxury-card p-5 space-y-3 ${concluida ? "border-emerald-500/40" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-primary">{tipoLabel}</p>
          <p className="font-semibold truncate">{meta.descricao}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onUpdate({ status: concluida ? "em_andamento" : "concluida" })} title={concluida ? "Reabrir" : "Marcar concluída"}>
            {concluida ? <CheckCircle2 className="size-5 text-emerald-400" /> : <Circle className="size-5 text-muted-foreground hover:text-primary" />}
          </button>
          <button onClick={onRemove} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="size-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Mini label="Inicial" value={`${inicial}${meta.unidade ?? ""}`} />
        <Mini label="Atual" value={`${atual}${meta.unidade ?? ""}`} gold />
        <Mini label="Alvo" value={`${alvo}${meta.unidade ?? ""}`} />
      </div>

      <div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-[#F5D76E] transition-all" style={{ width: `${progresso}%` }} />
        </div>
        <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
          <span><TrendingUp className="size-3 inline" /> {progresso.toFixed(0)}%</span>
          {meta.data_alvo ? <span>até {formatDate(meta.data_alvo)}</span> : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs">Atualizar valor:</Label>
        <Input
          type="number" step="0.1"
          defaultValue={atual}
          onBlur={(e) => {
            const v = Number(e.target.value);
            if (!isNaN(v) && v !== atual) onUpdate({ valor_atual: v });
          }}
          className="bg-secondary/40 h-8 w-28"
        />
      </div>
    </div>
  );
}

function Mini({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-secondary/40 p-2">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-semibold text-sm ${gold ? "gold-text" : ""}`}>{value}</p>
    </div>
  );
}

function NovaMetaModal({ alunoId, onClose, onSaved }: { alunoId: string; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    tipo: "peso", descricao: "", unidade: "kg",
    valor_inicial: "", valor_atual: "", valor_alvo: "",
    data_alvo: "", observacoes: "",
  });
  const [saving, setSaving] = useState(false);

  function changeTipo(tipo: string) {
    const t = TIPOS.find((x) => x.value === tipo);
    setForm((f) => ({ ...f, tipo, unidade: t?.unidade ?? "" }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const check = validate(metaSchema, form);
    if (!check.ok) return toast.error(check.message);
    setSaving(true);
    const v = check.data;
    const { error } = await (supabase as any).from("metas").insert({
      aluno_id: alunoId, personal_id: user!.id,
      tipo: v.tipo, descricao: v.descricao, unidade: v.unidade ?? null,
      valor_inicial: v.valor_inicial ?? null,
      valor_atual: v.valor_atual ?? v.valor_inicial ?? null,
      valor_alvo: v.valor_alvo,
      data_alvo: v.data_alvo ?? null,
      observacoes: v.observacoes ?? null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Meta criada");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <form onSubmit={submit} className="luxury-card w-full max-w-lg space-y-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold">Nova Meta</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-5" /></button>
        </div>
        <div className="grid gap-3">
          <Field label="Tipo">
            <select value={form.tipo} onChange={(e) => changeTipo(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-secondary/40 px-3 text-sm">
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Descrição *">
            <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex.: Perder 5 kg em 3 meses" className="bg-secondary/40" />
          </Field>
          <div className="grid grid-cols-4 gap-2">
            <Field label="Inicial"><Input type="number" step="0.1" value={form.valor_inicial} onChange={(e) => setForm({ ...form, valor_inicial: e.target.value })} className="bg-secondary/40" /></Field>
            <Field label="Atual"><Input type="number" step="0.1" value={form.valor_atual} onChange={(e) => setForm({ ...form, valor_atual: e.target.value })} className="bg-secondary/40" /></Field>
            <Field label="Alvo *"><Input type="number" step="0.1" value={form.valor_alvo} onChange={(e) => setForm({ ...form, valor_alvo: e.target.value })} className="bg-secondary/40" /></Field>
            <Field label="Unidade"><Input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} className="bg-secondary/40" /></Field>
          </div>
          <Field label="Prazo"><Input type="date" value={form.data_alvo} onChange={(e) => setForm({ ...form, data_alvo: e.target.value })} className="bg-secondary/40" /></Field>
          <Field label="Observações"><Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="bg-secondary/40" /></Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:opacity-90">{saving ? "Salvando..." : "Criar meta"}</Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}
function num(v: string): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
