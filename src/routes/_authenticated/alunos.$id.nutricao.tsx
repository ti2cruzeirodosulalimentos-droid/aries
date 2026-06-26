import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Save, Plus, Trash2, Calculator, Apple, GripVertical } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  usePlanoAtivo, useRefeicoes, useSavePlano,
  useAddRefeicao, useUpdateRefeicao, useRemoveRefeicao,
} from "@/lib/queries/aluno-modulos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ATIVIDADE_LABEL, type Atividade, type Genero, type Objetivo,
  ajustarPorObjetivo, aguaSugerida, calcularGET, calcularTMB, macrosPadrao,
} from "@/lib/calculos/nutricao";

export const Route = createFileRoute("/_authenticated/alunos/$id/nutricao")({
  component: NutricaoPage,
});

function NutricaoPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();

  const { data: plano } = usePlanoAtivo(id);
  const { data: refeicoes } = useRefeicoes(plano?.id);
  const savePlano = useSavePlano(id, user?.id, plano?.id);

  function salvar(p: Record<string, any>) {
    savePlano.mutate(p, {
      onSuccess: () => toast.success("Plano salvo"),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Nutrição</p>
        <h2 className="font-display text-2xl font-semibold">Plano Alimentar</h2>
      </div>

      <Calculadora plano={plano} onApply={salvar} />
      <PlanoForm plano={plano} onSave={salvar} saving={savePlano.isPending} />
      {plano?.id ? <RefeicoesEditor planoId={plano.id} refeicoes={refeicoes ?? []} /> : (
        <div className="luxury-card p-6 text-center text-sm text-muted-foreground">
          Salve o plano para começar a adicionar refeições.
        </div>
      )}
    </div>
  );
}

function Calculadora({ plano, onApply }: { plano: any; onApply: (p: any) => void }) {
  const [peso, setPeso] = useState<number>(70);
  const [altura, setAltura] = useState<number>(170);
  const [idade, setIdade] = useState<number>(30);
  const [genero, setGenero] = useState<Genero>("M");
  const [atividade, setAtividade] = useState<Atividade>("moderado");
  const [objetivo, setObjetivo] = useState<Objetivo>("manter");

  const tmb = calcularTMB(peso, altura, idade, genero);
  const get = calcularGET(tmb, atividade);
  const kcalAlvo = Math.round(ajustarPorObjetivo(get, objetivo));
  const macros = macrosPadrao(kcalAlvo, peso, objetivo);
  const agua = aguaSugerida(peso);

  function aplicar() {
    onApply({
      ...(plano ?? {}),
      kcal_alvo: kcalAlvo,
      proteina_g: macros.proteina_g,
      carboidrato_g: macros.carboidrato_g,
      gordura_g: macros.gordura_g,
      agua_litros: agua,
      objetivo: plano?.objetivo ?? (objetivo === "perder" ? "Emagrecimento" : objetivo === "ganhar" ? "Hipertrofia" : "Manutenção"),
      nome: plano?.nome ?? "Plano Alimentar",
    });
  }

  return (
    <div className="luxury-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="size-4 text-primary" />
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Calculadora Mifflin-St Jeor</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Field label="Peso (kg)"><Input type="number" value={peso} onChange={(e) => setPeso(Number(e.target.value))} className="bg-secondary/40" /></Field>
        <Field label="Altura (cm)"><Input type="number" value={altura} onChange={(e) => setAltura(Number(e.target.value))} className="bg-secondary/40" /></Field>
        <Field label="Idade"><Input type="number" value={idade} onChange={(e) => setIdade(Number(e.target.value))} className="bg-secondary/40" /></Field>
        <Field label="Sexo">
          <select value={genero} onChange={(e) => setGenero(e.target.value as Genero)} className="flex h-9 w-full rounded-md border border-input bg-secondary/40 px-3 text-sm">
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
        </Field>
        <Field label="Atividade">
          <select value={atividade} onChange={(e) => setAtividade(e.target.value as Atividade)} className="flex h-9 w-full rounded-md border border-input bg-secondary/40 px-3 text-sm">
            {Object.entries(ATIVIDADE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Objetivo">
          <select value={objetivo} onChange={(e) => setObjetivo(e.target.value as Objetivo)} className="flex h-9 w-full rounded-md border border-input bg-secondary/40 px-3 text-sm">
            <option value="perder">Perder gordura (-500 kcal)</option>
            <option value="manter">Manter (GET)</option>
            <option value="ganhar">Ganhar massa (+400 kcal)</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
        <Pill label="TMB" value={`${Math.round(tmb)} kcal`} />
        <Pill label="GET" value={`${Math.round(get)} kcal`} />
        <Pill label="Alvo" value={`${kcalAlvo} kcal`} gold />
        <Pill label="Macros" value={`P${macros.proteina_g} C${macros.carboidrato_g} G${macros.gordura_g}`} />
        <Pill label="Água" value={`${agua} L`} />
      </div>
      <Button onClick={aplicar} className="bg-primary text-primary-foreground hover:opacity-90">
        Aplicar cálculo ao plano
      </Button>
    </div>
  );
}

function PlanoForm({ plano, onSave, saving }: { plano: any; onSave: (p: any) => void; saving: boolean }) {
  const [form, setForm] = useState({
    nome: "", objetivo: "", kcal_alvo: "", proteina_g: "", carboidrato_g: "", gordura_g: "", agua_litros: "", observacoes: "",
  });
  useEffect(() => {
    if (!plano) return;
    setForm({
      nome: plano.nome ?? "",
      objetivo: plano.objetivo ?? "",
      kcal_alvo: plano.kcal_alvo ?? "",
      proteina_g: plano.proteina_g ?? "",
      carboidrato_g: plano.carboidrato_g ?? "",
      gordura_g: plano.gordura_g ?? "",
      agua_litros: plano.agua_litros ?? "",
      observacoes: plano.observacoes ?? "",
    });
  }, [plano]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ ...plano, ...form, kcal_alvo: num(form.kcal_alvo), proteina_g: num(form.proteina_g), carboidrato_g: num(form.carboidrato_g), gordura_g: num(form.gordura_g), agua_litros: num(form.agua_litros) }); }} className="luxury-card p-5 space-y-4">
      <p className="text-xs uppercase tracking-[0.3em] text-primary">Dados do Plano</p>
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Nome"><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="bg-secondary/40" /></Field>
        <Field label="Objetivo"><Input value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} className="bg-secondary/40" /></Field>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Field label="Kcal alvo"><Input type="number" value={form.kcal_alvo} onChange={(e) => setForm({ ...form, kcal_alvo: e.target.value })} className="bg-secondary/40" /></Field>
        <Field label="Proteína (g)"><Input type="number" value={form.proteina_g} onChange={(e) => setForm({ ...form, proteina_g: e.target.value })} className="bg-secondary/40" /></Field>
        <Field label="Carbo (g)"><Input type="number" value={form.carboidrato_g} onChange={(e) => setForm({ ...form, carboidrato_g: e.target.value })} className="bg-secondary/40" /></Field>
        <Field label="Gordura (g)"><Input type="number" value={form.gordura_g} onChange={(e) => setForm({ ...form, gordura_g: e.target.value })} className="bg-secondary/40" /></Field>
        <Field label="Água (L)"><Input type="number" step="0.1" value={form.agua_litros} onChange={(e) => setForm({ ...form, agua_litros: e.target.value })} className="bg-secondary/40" /></Field>
      </div>
      <Field label="Observações"><Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="bg-secondary/40" /></Field>
      <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:opacity-90">
        <Save className="size-4" /> Salvar plano
      </Button>
    </form>
  );
}

function RefeicoesEditor({ planoId, refeicoes }: { planoId: string; refeicoes: any[] }) {
  const totalKcal = useMemo(() => refeicoes.reduce((s, r) => s + Number(r.kcal ?? 0), 0), [refeicoes]);

  const add = useAddRefeicao(planoId);
  const update = useUpdateRefeicao(planoId);
  const remove = useRemoveRefeicao(planoId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Refeições</p>
          <p className="text-sm text-muted-foreground">{refeicoes.length} refeições · {totalKcal.toFixed(0)} kcal totais</p>
        </div>
        <Button onClick={() => add.mutate()} className="bg-primary text-primary-foreground hover:opacity-90">
          <Plus className="size-4" /> Adicionar
        </Button>
      </div>
      {refeicoes.length === 0 ? (
        <div className="luxury-card p-10 text-center text-muted-foreground">
          <Apple className="size-10 mx-auto mb-2 text-muted-foreground/40" />
          Nenhuma refeição. Comece adicionando.
        </div>
      ) : refeicoes.map((r) => (
        <RefeicaoRow key={r.id} refeicao={r} onPatch={(p) => update.mutate({ id: r.id, patch: p }, { onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar") })} onRemove={() => { if (confirm("Remover refeição?")) remove.mutate(r.id); }} />
      ))}
    </div>
  );
}

function RefeicaoRow({ refeicao, onPatch, onRemove }: { refeicao: any; onPatch: (p: any) => void; onRemove: () => void }) {
  const [local, setLocal] = useState({
    nome: refeicao.nome ?? "", horario: refeicao.horario ?? "", descricao: refeicao.descricao ?? "", kcal: refeicao.kcal ?? "",
  });
  function commit(patch: Partial<typeof local>) {
    const next = { ...local, ...patch };
    setLocal(next);
    onPatch({ ...patch, kcal: "kcal" in patch ? num(String(patch.kcal ?? "")) : undefined });
  }
  return (
    <div className="luxury-card p-4">
      <div className="flex items-start gap-3">
        <div className="text-primary"><GripVertical className="size-4" /><span className="block text-center text-xs font-bold gold-text mt-1">{refeicao.ordem}</span></div>
        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px_auto] gap-2 items-start">
            <Input value={local.nome} onChange={(e) => commit({ nome: e.target.value })} placeholder="Nome" className="bg-secondary/40 font-semibold" />
            <Input value={local.horario} onChange={(e) => commit({ horario: e.target.value })} placeholder="Horário" className="bg-secondary/40" />
            <Input type="number" value={local.kcal} onChange={(e) => commit({ kcal: e.target.value })} placeholder="kcal" className="bg-secondary/40" />
            <button onClick={onRemove} className="text-muted-foreground hover:text-destructive p-2"><Trash2 className="size-4" /></button>
          </div>
          <Textarea rows={2} value={local.descricao} onChange={(e) => commit({ descricao: e.target.value })} placeholder="Ex.: 2 ovos + 50g aveia + 1 banana" className="bg-secondary/40" />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}
function Pill({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 text-center ${gold ? "border-primary bg-primary/10" : "border-border bg-secondary/40"}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-semibold ${gold ? "gold-text" : ""}`}>{value}</p>
    </div>
  );
}
function num(v: string | number | null | undefined): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
