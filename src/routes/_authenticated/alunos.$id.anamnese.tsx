import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/alunos/$id/anamnese")({
  component: AnamnesePage,
});

type Anamnese = Record<string, any>;

const PARQ_QUESTIONS: { key: string; label: string }[] = [
  { key: "parq_problema_cardiaco", label: "Algum médico já disse que você possui problema cardíaco?" },
  { key: "parq_dor_peito", label: "Sente dor no peito ao realizar atividade física?" },
  { key: "parq_tontura", label: "Tende a perder o equilíbrio devido a tontura ou perda de consciência?" },
  { key: "parq_problema_osseo", label: "Tem algum problema ósseo ou articular que poderia piorar com a prática?" },
  { key: "parq_pressao_alta", label: "Tem pressão arterial elevada?" },
  { key: "parq_medicamento_pressao", label: "Toma medicamento para pressão arterial ou coração?" },
  { key: "parq_outras_razoes", label: "Sabe de alguma outra razão para não fazer atividade física?" },
];

function AnamnesePage() {
  const { id: aluno_id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [v, setV] = useState<Anamnese>({});

  const { data: existing, isLoading } = useQuery({
    queryKey: ["anamnese", aluno_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anamneses")
        .select("*")
        .eq("aluno_id", aluno_id)
        .order("data_anamnese", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (existing) setV(existing);
  }, [existing]);

  const set = (k: string, val: any) => setV((s) => ({ ...s, [k]: val }));

  // Sanitiza/valida campos numéricos e texto antes de gravar
  function sanitize(v: Anamnese): Anamnese {
    const clamp = (n: any, lo: number, hi: number) => {
      const x = Number(n);
      if (!Number.isFinite(x)) return null;
      return Math.min(hi, Math.max(lo, x));
    };
    const cap = (s: any, max: number) => (typeof s === "string" ? s.trim().slice(0, max) : s);
    const out: Anamnese = { ...v };
    if (v.horas_sono != null && v.horas_sono !== "") out.horas_sono = clamp(v.horas_sono, 0, 24);
    if (v.hidratacao_litros != null && v.hidratacao_litros !== "") out.hidratacao_litros = clamp(v.hidratacao_litros, 0, 15);
    if (v.satisfacao_corporal != null && v.satisfacao_corporal !== "") out.satisfacao_corporal = clamp(v.satisfacao_corporal, 0, 10);
    if (v.nivel_motivacao != null && v.nivel_motivacao !== "") out.nivel_motivacao = clamp(v.nivel_motivacao, 0, 10);
    if (v.dias_treino_semana != null && v.dias_treino_semana !== "") out.dias_treino_semana = clamp(v.dias_treino_semana, 1, 7);
    for (const k of ["doencas_cronicas","cirurgias","medicamentos","lesoes","alergias","historico_familiar","alimentacao","atividade_descricao","tempo_inatividade","objetivo_principal","objetivo_secundario","prazo_objetivo","motivacao","gosta_treinar","nao_gosta_treinar","maior_dificuldade","motivo_procura","ja_desistiu","regiao_desenvolver","regiao_desconforto","parq_observacoes","observacoes_gerais"]) {
      if (out[k] != null) out[k] = cap(out[k], 2000);
    }
    return out;
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sessão expirada");
      const clean = sanitize(v);
      const payload = {
        ...clean,
        aluno_id,
        personal_id: user.id,
        data_anamnese: clean.data_anamnese ?? new Date().toISOString().slice(0, 10),
      };
      if (existing?.id) {
        const { error } = await supabase.from("anamneses").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("anamneses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Anamnese salva");
      qc.invalidateQueries({ queryKey: ["anamnese", aluno_id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  if (isLoading) return <div className="grid h-40 place-items-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;

  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-6">
      <Section title="Histórico Clínico">
        <Two>
          <Field label="Doenças crônicas / pré-existentes"><Textarea rows={2} value={v.doencas_cronicas ?? ""} onChange={(e) => set("doencas_cronicas", e.target.value)} /></Field>
          <Field label="Cirurgias prévias"><Textarea rows={2} value={v.cirurgias ?? ""} onChange={(e) => set("cirurgias", e.target.value)} /></Field>
          <Field label="Medicamentos em uso"><Textarea rows={2} value={v.medicamentos ?? ""} onChange={(e) => set("medicamentos", e.target.value)} /></Field>
          <Field label="Lesões / dores recorrentes"><Textarea rows={2} value={v.lesoes ?? ""} onChange={(e) => set("lesoes", e.target.value)} /></Field>
          <Field label="Alergias"><Input value={v.alergias ?? ""} onChange={(e) => set("alergias", e.target.value)} /></Field>
          <Field label="Histórico familiar"><Input value={v.historico_familiar ?? ""} onChange={(e) => set("historico_familiar", e.target.value)} placeholder="Diabetes, hipertensão, cardíaco..." /></Field>
        </Two>
      </Section>

      <Section title="Hábitos de Vida">
        <Two>
          <Field label="Fumante">
            <div className="flex items-center gap-2 h-10">
              <Checkbox checked={!!v.fumante} onCheckedChange={(c) => set("fumante", !!c)} id="fumante" />
              <label htmlFor="fumante" className="text-sm">Sim, é fumante</label>
            </div>
          </Field>
          <Field label="Consumo de álcool">
            <SelectField value={v.alcool} onChange={(val) => set("alcool", val)} options={["Nunca", "Social", "Semanal", "Diário"]} />
          </Field>
          <Field label="Qualidade do sono">
            <SelectField value={v.qualidade_sono} onChange={(val) => set("qualidade_sono", val)} options={["Ótima", "Boa", "Regular", "Ruim"]} />
          </Field>
          <Field label="Horas de sono / noite"><Input type="number" step="0.5" value={v.horas_sono ?? ""} onChange={(e) => set("horas_sono", e.target.value ? Number(e.target.value) : null)} /></Field>
          <Field label="Nível de stress">
            <SelectField value={v.nivel_stress} onChange={(val) => set("nivel_stress", val)} options={["Baixo", "Moderado", "Alto", "Muito alto"]} />
          </Field>
          <Field label="Hidratação (litros/dia)"><Input type="number" step="0.1" value={v.hidratacao_litros ?? ""} onChange={(e) => set("hidratacao_litros", e.target.value ? Number(e.target.value) : null)} /></Field>
          <Field label="Alimentação" full><Textarea rows={2} value={v.alimentacao ?? ""} onChange={(e) => set("alimentacao", e.target.value)} placeholder="Descreva padrão alimentar, restrições, refeições típicas..." /></Field>
        </Two>
      </Section>

      <Section title="Atividade Física & Objetivos">
        <Two>
          <Field label="Pratica atividade física?">
            <div className="flex items-center gap-2 h-10">
              <Checkbox checked={!!v.pratica_atividade} onCheckedChange={(c) => set("pratica_atividade", !!c)} id="pratica" />
              <label htmlFor="pratica" className="text-sm">Sim</label>
            </div>
          </Field>
          <Field label="Experiência em musculação">
            <SelectField value={v.experiencia_musculacao} onChange={(val) => set("experiencia_musculacao", val)} options={["Iniciante", "Intermediário", "Avançado"]} />
          </Field>
          <Field label="Descrição da atividade atual"><Input value={v.atividade_descricao ?? ""} onChange={(e) => set("atividade_descricao", e.target.value)} /></Field>
          <Field label="Tempo de inatividade"><Input value={v.tempo_inatividade ?? ""} onChange={(e) => set("tempo_inatividade", e.target.value)} placeholder="6 meses, 1 ano..." /></Field>
          <Field label="Objetivo principal"><Input value={v.objetivo_principal ?? ""} onChange={(e) => set("objetivo_principal", e.target.value)} placeholder="Hipertrofia, emagrecimento..." /></Field>
          <Field label="Objetivo secundário"><Input value={v.objetivo_secundario ?? ""} onChange={(e) => set("objetivo_secundario", e.target.value)} /></Field>
          <Field label="Prazo desejado"><Input value={v.prazo_objetivo ?? ""} onChange={(e) => set("prazo_objetivo", e.target.value)} placeholder="3 meses, 1 ano..." /></Field>
          <Field label="Motivação"><Input value={v.motivacao ?? ""} onChange={(e) => set("motivacao", e.target.value)} /></Field>
        </Two>
      </Section>

      <Section title="PAR-Q (Questionário de Prontidão para Atividade)">
        <div className="space-y-1">
          {PARQ_QUESTIONS.map((q) => (
            <label key={q.key} className="flex items-start gap-3 rounded-md border border-border/60 bg-card/40 px-4 py-3 cursor-pointer hover:bg-card/70">
              <Checkbox checked={!!v[q.key]} onCheckedChange={(c) => set(q.key, !!c)} className="mt-0.5" />
              <span className="text-sm flex-1">{q.label}</span>
              <span className={`text-xs font-semibold ${v[q.key] ? "text-destructive" : "text-muted-foreground"}`}>
                {v[q.key] ? "SIM" : "NÃO"}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-4">
          <Label>Observações PAR-Q</Label>
          <Textarea rows={2} value={v.parq_observacoes ?? ""} onChange={(e) => set("parq_observacoes", e.target.value)} />
        </div>
      </Section>

      <Section title="Ficha Profissional — Objetivos & Rotina">
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Objetivo principal</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {["Emagrecer","Ganhar massa muscular","Definir o corpo","Melhorar condicionamento","Saúde e qualidade de vida","Outro"].map((opt) => (
                <label key={opt} className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer text-sm ${v.objetivo_principal_tipo === opt ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-card/40"}`}>
                  <input type="radio" name="objetivo_tipo" checked={v.objetivo_principal_tipo === opt} onChange={() => set("objetivo_principal_tipo", opt)} className="accent-primary" />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          <Two>
            <Field label="Já treinou anteriormente?">
              <div className="flex items-center gap-2 h-10">
                <Checkbox checked={!!v.ja_treinou} onCheckedChange={(c) => set("ja_treinou", !!c)} id="ja_treinou" />
                <label htmlFor="ja_treinou" className="text-sm">Sim, já treinou</label>
              </div>
            </Field>
            <Field label="Liberação médica para treinar?">
              <div className="flex items-center gap-2 h-10">
                <Checkbox checked={!!v.liberacao_medica} onCheckedChange={(c) => set("liberacao_medica", !!c)} id="liberacao_medica" />
                <label htmlFor="liberacao_medica" className="text-sm">Sim, possui liberação</label>
              </div>
            </Field>
            <Field label="O que mais gosta de treinar?"><Input value={v.gosta_treinar ?? ""} onChange={(e) => set("gosta_treinar", e.target.value)} /></Field>
            <Field label="O que menos gosta de treinar?"><Input value={v.nao_gosta_treinar ?? ""} onChange={(e) => set("nao_gosta_treinar", e.target.value)} /></Field>

            <Field label="Horas de sono / noite">
              <SelectField value={v.faixa_sono} onChange={(val) => set("faixa_sono", val)} options={["Menos de 5h","5 a 6h","7 a 8h","Mais de 8h"]} />
            </Field>
            <Field label="Litros de água / dia">
              <SelectField value={v.faixa_agua} onChange={(val) => set("faixa_agua", val)} options={["Menos de 1L","1 a 2L","Mais de 2L"]} />
            </Field>
            <Field label="Como avalia sua alimentação?">
              <SelectField value={v.alimentacao} onChange={(val) => set("alimentacao", val)} options={["Ruim","Regular","Boa","Excelente"]} />
            </Field>
            <Field label="Dias por semana que pretende treinar">
              <SelectField value={v.dias_treino_semana != null ? String(v.dias_treino_semana) : undefined} onChange={(val) => set("dias_treino_semana", Number(val))} options={["2","3","4","5","6","7"]} />
            </Field>
            <Field label="Horário preferido">
              <SelectField value={v.horario_preferido} onChange={(val) => set("horario_preferido", val)} options={["Manhã","Tarde","Noite"]} />
            </Field>
            <Field label="Satisfação corporal (0–10)">
              <Input type="number" min={0} max={10} value={v.satisfacao_corporal ?? ""} onChange={(e) => set("satisfacao_corporal", e.target.value === "" ? null : Number(e.target.value))} />
            </Field>
          </Two>
        </div>
      </Section>

      <Section title="Perguntas que agregam valor">
        <Two>
          <Field label="Maior dificuldade para alcançar seus objetivos" full><Textarea rows={2} value={v.maior_dificuldade ?? ""} onChange={(e) => set("maior_dificuldade", e.target.value)} /></Field>
          <Field label="O que te motivou a procurar acompanhamento agora?" full><Textarea rows={2} value={v.motivo_procura ?? ""} onChange={(e) => set("motivo_procura", e.target.value)} /></Field>
          <Field label="Já desistiu de treinar antes? Por quê?" full><Textarea rows={2} value={v.ja_desistiu ?? ""} onChange={(e) => set("ja_desistiu", e.target.value)} /></Field>
          <Field label="Região do corpo que deseja desenvolver mais"><Input value={v.regiao_desenvolver ?? ""} onChange={(e) => set("regiao_desenvolver", e.target.value)} /></Field>
          <Field label="Região que gera desconforto ou insegurança"><Input value={v.regiao_desconforto ?? ""} onChange={(e) => set("regiao_desconforto", e.target.value)} /></Field>
          <Field label="Nível de motivação atual (0–10)" full>
            <Input type="number" min={0} max={10} value={v.nivel_motivacao ?? ""} onChange={(e) => set("nivel_motivacao", e.target.value === "" ? null : Number(e.target.value))} />
          </Field>
        </Two>
      </Section>

      <Section title="Observações Gerais">
        <Textarea rows={4} value={v.observacoes_gerais ?? ""} onChange={(e) => set("observacoes_gerais", e.target.value)} placeholder="Qualquer informação adicional relevante..." />
      </Section>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={save.isPending} className="bg-primary text-primary-foreground hover:opacity-90">
          {save.isPending ? <><Loader2 className="size-4 animate-spin" /> Salvando</> : <><Save className="size-4" /> Salvar Anamnese</>}
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="luxury-card p-6">
      <h2 className="font-display text-lg font-semibold text-primary mb-4 tracking-wide">{title}</h2>
      {children}
    </div>
  );
}
function Two({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}
function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={full ? "md:col-span-2" : ""}><Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}
function SelectField({ value, onChange, options }: { value: string | undefined; onChange: (v: string) => void; options: string[] }) {
  return (
    <Select value={value ?? ""} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}
