import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Plus, Search, Apple, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useAlimentos, useCreateAlimento, useDeleteAlimento, CATEGORIAS_ALIMENTO, type Alimento } from "@/lib/queries/alimentos";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/alimentos")({
  head: () => ({ meta: [{ title: "Banco de Alimentos — ARIÉS" }] }),
  component: AlimentosPage,
});

function AlimentosPage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("");
  const [open, setOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useAlimentos();

  const filtered = (data ?? []).filter((a) => {
    if (categoria && a.categoria !== categoria) return false;
    if (q && !a.nome.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const excluir = useDeleteAlimento();
  const remover = (id: string) =>
    excluir.mutate(id, {
      onSuccess: () => toast.success("Alimento removido"),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao remover"),
    });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Nutrição</p>
          <h1 className="font-display text-3xl font-semibold">Banco de Alimentos</h1>
          <p className="text-xs text-muted-foreground mt-1">{(data ?? []).length} alimentos cadastrados</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground hover:opacity-90">
          <Plus className="size-4" /> Novo alimento
        </Button>
      </div>

      <div className="luxury-card p-4 space-y-3">
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar alimento..." className="pl-9 bg-secondary/40" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={!categoria} onClick={() => setCategoria("")}>Todos</Chip>
          {CATEGORIAS_ALIMENTO.map((c) => <Chip key={c} active={categoria === c} onClick={() => setCategoria(c)}>{c}</Chip>)}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-2 sm:grid-cols-2" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Apple}
          title={q || categoria ? "Nada encontrado" : "Banco vazio"}
          description={q || categoria ? "Ajuste a busca ou os filtros." : "Cadastre o primeiro alimento."}
          action={!q && !categoria ? { label: "Novo alimento", onClick: () => setOpen(true), icon: Plus } : undefined}
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {filtered.map((a) => (
            <div key={a.id} className="luxury-card p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{a.nome}</p>
                <p className="text-[11px] text-muted-foreground">
                  {a.categoria} · por {a.porcao_base}{a.unidade}: {fmt(a.kcal)} kcal · P{fmt(a.proteina_g)} C{fmt(a.carboidrato_g)} G{fmt(a.gordura_g)}
                </p>
              </div>
              {a.created_by === user?.id ? (
                <button onClick={() => { if (confirm(`Remover "${a.nome}"?`)) remover(a.id); }} className="text-muted-foreground hover:text-destructive p-1 shrink-0">
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {open ? <NovoAlimentoModal onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

function fmt(v: number) {
  return Number(v ?? 0).toFixed(1).replace(/\.0$/, "");
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-3 py-1 rounded-full text-xs transition ${active ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground hover:text-foreground"}`}>
      {children}
    </button>
  );
}

function NovoAlimentoModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const create = useCreateAlimento();
  const [form, setForm] = useState({
    nome: "", categoria: "Outro", unidade: "g", porcao_base: "100",
    kcal: "", proteina_g: "", carboidrato_g: "", gordura_g: "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error("Informe o nome");
    if (!user) return toast.error("Sessão expirada");
    create.mutate(
      {
        nome: form.nome.trim(),
        categoria: form.categoria,
        unidade: form.unidade,
        porcao_base: Number(form.porcao_base) || 100,
        kcal: Number(form.kcal) || 0,
        proteina_g: Number(form.proteina_g) || 0,
        carboidrato_g: Number(form.carboidrato_g) || 0,
        gordura_g: Number(form.gordura_g) || 0,
        created_by: user.id,
      } as Partial<Alimento> & { created_by: string },
      {
        onSuccess: () => { toast.success("Alimento criado"); onClose(); },
        onError: (er) => toast.error(er instanceof Error ? er.message : "Erro ao criar"),
      },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm px-4 py-8" onClick={onClose}>
      <form onSubmit={submit} className="luxury-card w-full max-w-lg space-y-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold">Novo Alimento</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-5" /></button>
        </div>
        <div className="grid gap-3">
          <div>
            <Label className="text-xs">Nome *</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="bg-secondary/40" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Categoria</Label>
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-secondary/40 px-3 text-sm">
                {CATEGORIAS_ALIMENTO.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Unidade</Label>
              <select value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-secondary/40 px-3 text-sm">
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="unidade">unidade</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Porção base</Label>
              <Input type="number" value={form.porcao_base} onChange={(e) => setForm({ ...form, porcao_base: e.target.value })} className="bg-secondary/40" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mb-1">Valores abaixo referentes à porção base informada acima:</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Calorias (kcal)</Label>
              <Input type="number" value={form.kcal} onChange={(e) => setForm({ ...form, kcal: e.target.value })} className="bg-secondary/40" />
            </div>
            <div>
              <Label className="text-xs">Proteína (g)</Label>
              <Input type="number" value={form.proteina_g} onChange={(e) => setForm({ ...form, proteina_g: e.target.value })} className="bg-secondary/40" />
            </div>
            <div>
              <Label className="text-xs">Carboidrato (g)</Label>
              <Input type="number" value={form.carboidrato_g} onChange={(e) => setForm({ ...form, carboidrato_g: e.target.value })} className="bg-secondary/40" />
            </div>
            <div>
              <Label className="text-xs">Gordura (g)</Label>
              <Input type="number" value={form.gordura_g} onChange={(e) => setForm({ ...form, gordura_g: e.target.value })} className="bg-secondary/40" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={create.isPending} className="bg-primary text-primary-foreground hover:opacity-90">{create.isPending ? "Salvando..." : "Criar"}</Button>
        </div>
      </form>
    </div>
  );
}
