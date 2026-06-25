import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Upload, Camera, Trash2, X, GitCompareArrows } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/alunos/$id/fotos")({
  component: FotosPage,
});

const ANGULOS = [
  { value: "frente", label: "Frente" },
  { value: "lado", label: "Lateral" },
  { value: "costas", label: "Costas" },
] as const;

type AnguloKey = (typeof ANGULOS)[number]["value"];

function FotosPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const { data: fotos, isLoading } = useQuery({
    queryKey: ["fotos", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fotos_evolucao").select("*").eq("aluno_id", id)
        .order("data_foto", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const remove = useMutation({
    mutationFn: async (foto: any) => {
      await supabase.storage.from("evolucao-fotos").remove([foto.storage_path]);
      const { error } = await (supabase as any).from("fotos_evolucao").delete().eq("id", foto.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Foto removida"); qc.invalidateQueries({ queryKey: ["fotos", id] }); },
  });

  const sessoes = useMemo(() => {
    const map = new Map<string, any[]>();
    (fotos ?? []).forEach((f: any) => {
      const arr = map.get(f.data_foto) ?? [];
      arr.push(f);
      map.set(f.data_foto, arr);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [fotos]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Evolução</p>
          <h2 className="font-display text-2xl font-semibold">Fotos do Aluno</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCompareOpen(true)} disabled={(fotos?.length ?? 0) < 2} className="gold-border">
            <GitCompareArrows className="size-4" /> Comparar
          </Button>
          <Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground hover:opacity-90">
            <Upload className="size-4" /> Adicionar fotos
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid h-40 place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : sessoes.length === 0 ? (
        <div className="luxury-card p-12 text-center">
          <Camera className="size-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground mb-4">Nenhuma foto de evolução registrada.</p>
          <Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground hover:opacity-90">
            <Upload className="size-4" /> Adicionar primeira sessão
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {sessoes.map(([data, lista]) => (
            <SessaoCard key={data} data={data} fotos={lista} onRemove={(f) => { if (confirm("Excluir foto?")) remove.mutate(f); }} />
          ))}
        </div>
      )}

      {open ? <UploadModal alunoId={id} onClose={() => setOpen(false)} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["fotos", id] }); }} /> : null}
      {compareOpen ? <CompareModal sessoes={sessoes} onClose={() => setCompareOpen(false)} /> : null}
    </div>
  );
}

function SessaoCard({ data, fotos, onRemove }: { data: string; fotos: any[]; onRemove: (f: any) => void }) {
  const peso = fotos.find((f) => f.peso != null)?.peso;
  const obs = fotos.find((f) => f.observacoes)?.observacoes;
  return (
    <div className="luxury-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-lg font-semibold gold-text">{formatDate(data)}</p>
          {peso != null ? <p className="text-xs text-muted-foreground">Peso: {Number(peso).toFixed(1)} kg</p> : null}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {ANGULOS.map(({ value, label }) => {
          const f = fotos.find((x) => x.angulo === value);
          return (
            <div key={value} className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground text-center">{label}</p>
              {f ? <FotoTile foto={f} onRemove={() => onRemove(f)} /> : <EmptyTile />}
            </div>
          );
        })}
      </div>
      {obs ? <p className="text-xs text-muted-foreground italic">"{obs}"</p> : null}
    </div>
  );
}

function FotoTile({ foto, onRemove }: { foto: any; onRemove: () => void }) {
  const url = useSignedUrl(foto.storage_path);
  return (
    <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-border bg-secondary group">
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <div className="grid place-items-center h-full text-muted-foreground"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}
      <button onClick={onRemove} className="absolute top-2 right-2 rounded-full bg-black/70 p-1.5 opacity-0 group-hover:opacity-100 transition">
        <Trash2 className="size-3.5 text-destructive" />
      </button>
    </div>
  );
}

function EmptyTile() {
  return <div className="aspect-[3/4] rounded-lg border border-dashed border-border grid place-items-center text-muted-foreground/50 text-xs">—</div>;
}

function useSignedUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    let cancel = false;
    supabase.storage.from("evolucao-fotos").createSignedUrl(path, 3600).then(({ data }) => {
      if (!cancel) setUrl(data?.signedUrl ?? null);
    });
    return () => { cancel = true; };
  }, [path]);
  return url;
}

function UploadModal({ alunoId, onClose, onDone }: { alunoId: string; onClose: () => void; onDone: () => void }) {
  const { user } = useAuth();
  const [data_foto, setData] = useState(new Date().toISOString().slice(0, 10));
  const [peso, setPeso] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [files, setFiles] = useState<Record<AnguloKey, File | null>>({ frente: null, lado: null, costas: null });
  const [uploading, setUploading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const entries = Object.entries(files).filter(([, f]) => f) as [AnguloKey, File][];
    if (entries.length === 0) return toast.error("Selecione ao menos uma foto");
    setUploading(true);
    try {
      for (const [angulo, file] of entries) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${user!.id}/${alunoId}/${data_foto}-${angulo}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("evolucao-fotos").upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { error: insErr } = await (supabase as any).from("fotos_evolucao").insert({
          aluno_id: alunoId, personal_id: user!.id, data_foto, angulo, storage_path: path,
          peso: peso ? Number(peso) : null, observacoes: observacoes || null,
        });
        if (insErr) throw insErr;
      }
      toast.success("Fotos enviadas");
      onDone();
    } catch (err: any) {
      toast.error(err.message ?? "Erro no upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <form onSubmit={submit} className="luxury-card w-full max-w-xl space-y-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold">Nova Sessão de Fotos</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <Input type="date" value={data_foto} onChange={(e) => setData(e.target.value)} className="bg-secondary/40" />
          </Field>
          <Field label="Peso (kg)">
            <Input type="number" step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} className="bg-secondary/40" />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {ANGULOS.map(({ value, label }) => (
            <div key={value}>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
              <FilePicker file={files[value]} onChange={(f) => setFiles((prev) => ({ ...prev, [value]: f }))} />
            </div>
          ))}
        </div>
        <Field label="Observações">
          <Textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="bg-secondary/40" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={uploading} className="bg-primary text-primary-foreground hover:opacity-90">
            <Upload className="size-4" /> {uploading ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function FilePicker({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <label className="block aspect-[3/4] rounded-lg border border-dashed border-border bg-secondary/40 overflow-hidden cursor-pointer hover:border-primary transition">
      {preview ? (
        <img src={preview} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="grid place-items-center h-full text-muted-foreground">
          <Camera className="size-6" />
        </div>
      )}
      <input
        type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}

function CompareModal({ sessoes, onClose }: { sessoes: [string, any[]][]; onClose: () => void }) {
  const opcoes = sessoes.map(([d]) => d);
  const [a, setA] = useState(opcoes[opcoes.length - 1]);
  const [b, setB] = useState(opcoes[0]);
  const [angulo, setAngulo] = useState<AnguloKey>("frente");

  const fotoA = sessoes.find(([d]) => d === a)?.[1].find((f) => f.angulo === angulo);
  const fotoB = sessoes.find(([d]) => d === b)?.[1].find((f) => f.angulo === angulo);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="luxury-card w-full max-w-4xl space-y-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold">Comparativo de Evolução</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-5" /></button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Antes">
            <select value={a} onChange={(e) => setA(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-secondary/40 px-3 text-sm">
              {opcoes.map((d) => <option key={d} value={d}>{formatDate(d)}</option>)}
            </select>
          </Field>
          <Field label="Depois">
            <select value={b} onChange={(e) => setB(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-secondary/40 px-3 text-sm">
              {opcoes.map((d) => <option key={d} value={d}>{formatDate(d)}</option>)}
            </select>
          </Field>
          <Field label="Ângulo">
            <select value={angulo} onChange={(e) => setAngulo(e.target.value as AnguloKey)} className="flex h-9 w-full rounded-md border border-input bg-secondary/40 px-3 text-sm">
              {ANGULOS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <CompareSide titulo="Antes" data={a} foto={fotoA} />
          <CompareSide titulo="Depois" data={b} foto={fotoB} />
        </div>
      </div>
    </div>
  );
}

function CompareSide({ titulo, data, foto }: { titulo: string; data: string; foto: any }) {
  const url = useSignedUrl(foto?.storage_path ?? null);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-primary">{titulo}</span>
        <span className="text-xs text-muted-foreground">{formatDate(data)}</span>
      </div>
      <div className="aspect-[3/4] rounded-lg overflow-hidden border border-primary/40 bg-secondary grid place-items-center">
        {foto ? (url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />) : <p className="text-xs text-muted-foreground">Sem foto neste ângulo</p>}
      </div>
      {foto?.peso != null ? <p className="text-center text-xs text-muted-foreground">Peso: {Number(foto.peso).toFixed(1)} kg</p> : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}
function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
