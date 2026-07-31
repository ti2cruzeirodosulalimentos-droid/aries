import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Save, Loader2, Calculator, ChevronRight, ChevronLeft, Activity, Ruler, HeartPulse, Dumbbell, Camera, PersonStanding, Settings2, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAlunoParaAvaliacao, useAvaliacaoDetail, useCreateAvaliacao, useUpdateAvaliacao, useUltimaAvaliacao } from "@/lib/queries/avaliacoes";
import { useAuth } from "@/lib/auth";
import { avaliacaoSchema, validate } from "@/lib/validation/schemas";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { calcularAvaliacao, type Protocolo, type Genero } from "@/lib/calculos/fisica";
import { PosturalBody, type PosturalView } from "@/components/PosturalBody";

const CIRC = [
  ["circ_pescoco", "Pescoço"], ["circ_ombro", "Ombro"], ["circ_torax", "Tórax"],
  ["circ_cintura", "Cintura"], ["circ_abdomen", "Abdômen"], ["circ_quadril", "Quadril"],
] as const;

const CIRC_BILAT = [
  ["braco_relax", "Braço relaxado"],
  ["braco_contr", "Braço contraído"],
  ["antebraco_relax", "Antebraço"],
  ["coxa_prox", "Coxa proximal"],
  ["coxa_medial", "Coxa medial"],
  ["coxa_distal", "Coxa distal"],
  ["panturrilha", "Panturrilha"],
] as const;

const DIAMETROS = [
  ["diametro_punho", "Punho"],
  ["diametro_umero", "Úmero"],
  ["diametro_femur", "Fêmur"],
] as const;

const POSTURAL: Record<PosturalView, string[]> = {
  anterior: ["Ombros assimétricos","Inclinação de cabeça","Joelhos valgos","Joelhos varos","Pés pronados","Pés supinados","Báscula pélvica"],
  lateral: ["Anteversão de Quadril","Retroversão de Quadril","Rotação Interna dos Ombros","Retificação Cervical","Retificação Lombar","Protusão Abdominal","Hiperlordose Cervical","Hiperlordose Lombar","Hipercifose Torácica","Pé - Plano","Pé - Cavo","Pé - Calcâneo","Pé - Equino","Genu - Flexo","Genu - Recurvado"],
  posterior: ["Escoliose","Ombros assimétricos (post.)","Escápulas aladas","Escápulas assimétricas","Triângulo de Talles desigual","Calcâneo valgo","Calcâneo varo"],
};

const VO2_PROTOCOLOS = ["Cooper 12 min","Teste de Polar","Astrand-Rhyming","Burpee 1 min","Outro"];

export const DOBRAS = [
  ["dobra_peitoral", "Peitoral"], ["dobra_axilar_media", "Axilar Média"], ["dobra_triceps", "Tríceps"],
  ["dobra_subescapular", "Subescapular"], ["dobra_abdominal", "Abdominal"], ["dobra_suprailiaca", "Suprailíaca"],
  ["dobra_coxa", "Coxa"],
] as const;

type DobraKey = typeof DOBRAS[number][0];
type SubView = "menu" | "config" | "composicao" | "perimetros" | "vo2" | "neuro" | "postural" | "obs";

// Campos numéricos vindos do banco — normalizados com Number() ao carregar para edição,
// pois calcularAvaliacao() exige typeof "number" (Supabase pode retornar numeric como string).
const NUMERIC_KEYS = [
  "peso", "altura", "idade", "pressao_sistolica", "pressao_diastolica", "fc_repouso",
  ...CIRC.map(([k]) => k),
  ...CIRC_BILAT.flatMap(([k]) => [`circ_${k}_d`, `circ_${k}_e`]),
  "circ_braco_d", "circ_braco_e", "circ_antebraco_d", "circ_antebraco_e", "circ_coxa_d", "circ_coxa_e",
  "circ_panturrilha_d", "circ_panturrilha_e",
  ...DIAMETROS.map(([k]) => k),
  ...DOBRAS.map(([k]) => k),
  "vo2_distancia", "vo2_fc_final", "vo2_resultado",
  "neuro_preensao_d", "neuro_preensao_e", "neuro_sentar_alcancar", "neuro_abdominal_1min", "neuro_flexao_1min", "neuro_salto_vertical",
  "densidade_corporal", "percentual_gordura", "massa_gorda", "massa_magra", "peso_ideal_min", "peso_ideal_max", "imc", "rcq",
] as const;

export function requiredDobras(protocolo: string | undefined, genero: string | undefined): DobraKey[] {
  if (protocolo === "jp7") return ["dobra_peitoral","dobra_axilar_media","dobra_triceps","dobra_subescapular","dobra_abdominal","dobra_suprailiaca","dobra_coxa"];
  if (protocolo === "jp3") {
    // Sem gênero definido não dá pra saber quais 3 dobras pedir (o protocolo usa
    // pontos diferentes por sexo) — nunca presumir "masculino" por padrão.
    if (genero === "feminino") return ["dobra_triceps","dobra_suprailiaca","dobra_coxa"];
    if (genero === "masculino") return ["dobra_peitoral","dobra_abdominal","dobra_coxa"];
    return [];
  }
  return [];
}

function rowToFormState(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = { ...row };
  for (const k of NUMERIC_KEYS) {
    if (out[k] != null) out[k] = Number(out[k]);
  }
  delete out.id;
  delete out.created_at;
  delete out.updated_at;
  return out;
}

export interface AvaliacaoFormProps {
  /** id do aluno (sempre presente, vem da rota). */
  alunoId: string;
  /** id da avaliação sendo editada; ausente = criando uma nova. */
  avalId?: string;
}

export function AvaliacaoForm({ alunoId: aluno_id, avalId }: AvaliacaoFormProps) {
  const isEdit = !!avalId;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<SubView>("menu");
  const [v, setV] = useState<Record<string, any>>({
    data_avaliacao: new Date().toISOString().slice(0, 10),
    protocolo: "jp3" as Protocolo,
  });
  const [hydrated, setHydrated] = useState(false);

  const { data: aluno } = useAlunoParaAvaliacao(aluno_id);
  const { data: existing } = useAvaliacaoDetail(aluno_id, avalId ?? "");
  // Gabarito: última avaliação já registrada, só faz sentido ao criar uma nova (não ao editar).
  const { data: ultima } = useUltimaAvaliacao(aluno_id, !isEdit);
  const create = useCreateAvaliacao(aluno_id);
  const update = useUpdateAvaliacao(aluno_id);
  const saving = isEdit ? update.isPending : create.isPending;

  // Modo criação: pré-preenche gênero/idade a partir do cadastro do aluno.
  useEffect(() => {
    if (!isEdit && aluno && !v.genero) {
      const g = aluno.gender === "F" ? "feminino" : aluno.gender === "M" ? "masculino" : null;
      const idade = aluno.birth_date ? calcAge(aluno.birth_date) : null;
      setV((s) => ({ ...s, genero: g, idade }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aluno, isEdit]);

  // Modo edição: carrega os valores já salvos da avaliação uma única vez.
  useEffect(() => {
    if (isEdit && existing?.aval && !hydrated) {
      setV(rowToFormState(existing.aval));
      setHydrated(true);
    }
  }, [isEdit, existing, hydrated]);

  const set = (k: string, val: any) => setV((s) => ({ ...s, [k]: val }));
  const num = (k: string) => (val: string) => set(k, val === "" ? null : Number(val));

  const calc = useMemo(() => {
    if (!v.genero || !v.idade) return null;
    return calcularAvaliacao({
      protocolo: v.protocolo as Protocolo,
      genero: v.genero as Genero,
      idade: Number(v.idade),
      peso: v.peso ?? null,
      altura: v.altura ?? null,
      cintura: v.circ_cintura ?? null,
      quadril: v.circ_quadril ?? null,
      abdomen: v.circ_abdomen ?? null,
      dobras: {
        peitoral: v.dobra_peitoral, abdominal: v.dobra_abdominal, coxa: v.dobra_coxa,
        triceps: v.dobra_triceps, suprailiaca: v.dobra_suprailiaca,
        axilar_media: v.dobra_axilar_media, subescapular: v.dobra_subescapular,
      },
    });
  }, [v]);

  // Dobras obrigatórias para o protocolo/gênero atuais que ainda não foram preenchidas.
  // Sem elas o cálculo de %G/massa magra/gorda/peso ideal fica silenciosamente nulo.
  const missingDobras = useMemo(() => {
    if (v.protocolo === "obesos") return [];
    const required = requiredDobras(v.protocolo, v.genero);
    return required.filter((k) => v[k] == null);
  }, [v]);
  const missingDobrasLabels = missingDobras.map((k) => DOBRAS.find(([key]) => key === k)?.[1] ?? k);
  const dobrasIniciadas = DOBRAS.some(([k]) => v[k] != null);
  const generoIndefinido = v.protocolo === "jp3" && !v.genero;

  // Valor da última avaliação pra um campo — mostrado como referência ao lado do input.
  function prev(key: string): string | undefined {
    const v = (ultima as Record<string, any> | undefined)?.[key];
    if (v == null) return undefined;
    return typeof v === "number" ? (Number.isInteger(v) ? String(v) : v.toFixed(1)) : String(v);
  }

  function salvar() {
    if (!user) { toast.error("Sessão expirada"); return; }
    // Validação central (Zod) dos campos críticos
    const check = validate(avaliacaoSchema, {
      data_avaliacao: v.data_avaliacao,
      peso: v.peso,
      altura: v.altura,
      idade: v.idade,
      genero: v.genero,
      protocolo: v.protocolo,
      observacoes: v.observacoes,
    });
    if (!check.ok) { toast.error(check.message); return; }
    const bilatPayload: Record<string, number | null> = {};
    for (const [k] of CIRC_BILAT) {
      bilatPayload[`circ_${k}_d`] = v[`circ_${k}_d`] ?? null;
      bilatPayload[`circ_${k}_e`] = v[`circ_${k}_e`] ?? null;
    }
    // Espelha valores nos campos legados usados em listagens antigas
    const legacy = {
      circ_braco_d: v.circ_braco_contr_d ?? v.circ_braco_relax_d ?? null,
      circ_braco_e: v.circ_braco_contr_e ?? v.circ_braco_relax_e ?? null,
      circ_antebraco_d: v.circ_antebraco_relax_d ?? null,
      circ_antebraco_e: v.circ_antebraco_relax_e ?? null,
      circ_coxa_d: v.circ_coxa_medial_d ?? v.circ_coxa_prox_d ?? null,
      circ_coxa_e: v.circ_coxa_medial_e ?? v.circ_coxa_prox_e ?? null,
      circ_panturrilha_d: v.circ_panturrilha_d ?? null,
      circ_panturrilha_e: v.circ_panturrilha_e ?? null,
    };
    const payload = {
      aluno_id,
      personal_id: user.id,
      data_avaliacao: v.data_avaliacao,
      protocolo: v.protocolo,
      peso: v.peso, altura: v.altura, idade: v.idade, genero: v.genero,
      pressao_sistolica: v.pressao_sistolica, pressao_diastolica: v.pressao_diastolica, fc_repouso: v.fc_repouso,
      ...Object.fromEntries(CIRC.map(([k]) => [k, v[k] ?? null])),
      ...bilatPayload,
      ...legacy,
      ...Object.fromEntries(DIAMETROS.map(([k]) => [k, v[k] ?? null])),
      ...Object.fromEntries(DOBRAS.map(([k]) => [k, v[k] ?? null])),
      vo2_protocolo: v.vo2_protocolo ?? null,
      vo2_distancia: v.vo2_distancia ?? null,
      vo2_fc_final: v.vo2_fc_final ?? null,
      vo2_resultado: v.vo2_resultado ?? null,
      vo2_classificacao: v.vo2_classificacao ?? null,
      neuro_preensao_d: v.neuro_preensao_d ?? null,
      neuro_preensao_e: v.neuro_preensao_e ?? null,
      neuro_sentar_alcancar: v.neuro_sentar_alcancar ?? null,
      neuro_abdominal_1min: v.neuro_abdominal_1min ?? null,
      neuro_flexao_1min: v.neuro_flexao_1min ?? null,
      neuro_salto_vertical: v.neuro_salto_vertical ?? null,
      postural: v.postural ?? {},
      densidade_corporal: calc?.densidade,
      percentual_gordura: calc?.percentual_gordura,
      massa_gorda: calc?.massa_gorda,
      massa_magra: calc?.massa_magra,
      peso_ideal_min: calc?.peso_ideal_min,
      peso_ideal_max: calc?.peso_ideal_max,
      imc: calc?.imc,
      imc_classificacao: calc?.imc_classificacao,
      rcq: calc?.rcq,
      rcq_classificacao: calc?.rcq_classificacao,
      observacoes: v.observacoes,
    };
    if (isEdit) {
      update.mutate({ id: avalId!, ...payload }, {
        onSuccess: () => {
          toast.success("Avaliação atualizada");
          navigate({ to: "/alunos/$id/avaliacoes/$avalId", params: { id: aluno_id, avalId: avalId! } });
        },
        onError: (e: any) => toast.error(e.message ?? "Erro ao atualizar"),
      });
    } else {
      create.mutate(payload, {
        onSuccess: (id) => {
          toast.success("Avaliação salva");
          navigate({ to: "/alunos/$id/avaliacoes/$avalId", params: { id: aluno_id, avalId: id } });
        },
        onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
      });
    }
  }

  // Progresso/contadores para o menu
  const counts = useMemo(() => {
    const required = requiredDobras(v.protocolo, v.genero);
    const composicaoOk = !!v.peso && !!v.altura && required.every((k) => v[k] != null);
    const perimetrosCount = CIRC.filter(([k]) => v[k] != null).length
      + CIRC_BILAT.reduce((acc, [k]) => acc + (v[`circ_${k}_d`] != null ? 1 : 0) + (v[`circ_${k}_e`] != null ? 1 : 0), 0)
      + DIAMETROS.filter(([k]) => v[k] != null).length;
    const vo2Ok = !!v.vo2_resultado || !!v.vo2_protocolo;
    const neuroCount = ["neuro_preensao_d","neuro_preensao_e","neuro_sentar_alcancar","neuro_abdominal_1min","neuro_flexao_1min","neuro_salto_vertical"].filter((k) => v[k] != null).length;
    const posturalCount = ((v.postural?.anterior?.length ?? 0) + (v.postural?.lateral?.length ?? 0) + (v.postural?.posterior?.length ?? 0));
    return { composicaoOk, perimetrosCount, vo2Ok, neuroCount, posturalCount };
  }, [v]);

  if (view === "menu") {
    const items: Array<{ key: SubView; label: string; icon: any; hint?: string; ok?: boolean }> = [
      { key: "config", label: "Configuração", icon: Settings2, hint: `${v.data_avaliacao} · ${v.protocolo?.toUpperCase()}`, ok: !!v.genero && !!v.idade },
      { key: "composicao", label: "Composição Corporal", icon: Activity, hint: calc?.percentual_gordura ? `${calc.percentual_gordura}% G` : "Peso, altura e dobras", ok: counts.composicaoOk },
      { key: "perimetros", label: "Perímetros", icon: Ruler, hint: `${counts.perimetrosCount} medida(s)`, ok: counts.perimetrosCount > 0 },
      { key: "vo2", label: "VO2Max", icon: HeartPulse, hint: v.vo2_resultado ? `${v.vo2_resultado} ml/kg/min` : "Capacidade cardiorrespiratória", ok: counts.vo2Ok },
      { key: "neuro", label: "Neuromotores", icon: Dumbbell, hint: `${counts.neuroCount}/6 testes`, ok: counts.neuroCount > 0 },
      { key: "postural", label: "Avaliação Postural", icon: PersonStanding, hint: `${counts.posturalCount} marcação(ões)`, ok: counts.posturalCount > 0 },
      { key: "obs", label: "Observações", icon: Camera, hint: v.observacoes ? "Preenchido" : "Opcional", ok: !!v.observacoes },
    ];
    return (
      <div className="space-y-4">
        <div className="luxury-card p-4 flex items-center gap-3">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {aluno?.full_name?.[0] ?? "?"}
          </div>
          <div className="flex-1">
            <p className="font-semibold leading-tight">{aluno?.full_name ?? "Aluno"}</p>
            <p className="text-xs text-muted-foreground">Data: {fmtDate(v.data_avaliacao)}</p>
          </div>
        </div>

        <div className="luxury-card overflow-hidden">
          {items.map((it, i) => (
            <button
              key={it.key}
              type="button"
              onClick={() => setView(it.key)}
              className={`w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition ${i > 0 ? "border-t border-border" : ""}`}
            >
              <div className={`size-11 rounded-full flex items-center justify-center ${it.ok ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                <it.icon className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium leading-tight">{it.label}</p>
                <p className="text-xs text-muted-foreground truncate">{it.hint}</p>
              </div>
              {it.ok ? <Check className="size-4 text-primary" /> : null}
              <ChevronRight className="size-5 text-muted-foreground" />
            </button>
          ))}
        </div>

        {calc?.percentual_gordura ? (
          <div className="luxury-card p-4 border-primary/30">
            <p className="text-xs uppercase tracking-wider text-primary mb-2 flex items-center gap-2"><Calculator className="size-4" /> Resultados</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Mini label="% G" value={fmt(calc?.percentual_gordura, "%")} />
              <Mini label="MM" value={fmt(calc?.massa_magra, "kg")} />
              <Mini label="IMC" value={fmt(calc?.imc)} />
            </div>
          </div>
        ) : generoIndefinido ? (
          <div className="luxury-card p-4 border-destructive/40 bg-destructive/5">
            <p className="text-xs uppercase tracking-wider text-destructive mb-1 flex items-center gap-2">
              <AlertTriangle className="size-4" /> Composição corporal não calculada
            </p>
            <p className="text-sm text-muted-foreground">Defina o gênero na aba Configuração — obrigatório para o protocolo JP3.</p>
          </div>
        ) : dobrasIniciadas && missingDobras.length > 0 ? (
          <div className="luxury-card p-4 border-destructive/40 bg-destructive/5">
            <p className="text-xs uppercase tracking-wider text-destructive mb-1 flex items-center gap-2">
              <AlertTriangle className="size-4" /> Composição corporal não calculada
            </p>
            <p className="text-sm text-muted-foreground">
              Falta preencher: <strong className="text-foreground">{missingDobrasLabels.join(", ")}</strong> para o protocolo {v.protocolo?.toUpperCase()}.
            </p>
          </div>
        ) : null}

        <Button
          className="w-full bg-primary text-primary-foreground"
          onClick={salvar}
          disabled={saving}
        >
          {saving ? <><Loader2 className="size-4 animate-spin" /> {isEdit ? "Atualizando" : "Salvando"}</> : <><Save className="size-4" /> {isEdit ? "Atualizar Avaliação" : "Salvar Avaliação"}</>}
        </Button>
      </div>
    );
  }

  // Sub-paineis
  return (
    <div className="space-y-4">
      <button type="button" onClick={() => setView("menu")} className="flex items-center gap-2 text-sm text-primary">
        <ChevronLeft className="size-4" /> Voltar para o menu
      </button>

      {view === "config" && (
        <Section title="Configuração">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Data"><Input type="date" value={v.data_avaliacao ?? ""} onChange={(e) => set("data_avaliacao", e.target.value)} /></Field>
            <Field label="Gênero *">
              <Select value={v.genero ?? ""} onValueChange={(val) => set("genero", val)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Idade"><Input type="number" inputMode="numeric" value={v.idade ?? ""} onChange={(e) => set("idade", e.target.value ? Number(e.target.value) : null)} /></Field>
            <Field label="Protocolo">
              <Select value={v.protocolo} onValueChange={(val) => set("protocolo", val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="jp3">Jackson & Pollock — 3 dobras</SelectItem>
                  <SelectItem value="jp7">Jackson & Pollock — 7 dobras</SelectItem>
                  <SelectItem value="obesos">Protocolo Obesos (Weltman)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </Section>
      )}

      {view === "composicao" && (
        <>
          <Section title="Antropometria & Sinais Vitais">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <Field label="Peso (kg) *" hint={prev("peso")}><NumInput value={v.peso} onChange={num("peso")} step="0.1" /></Field>
              <Field label="Altura (m ou cm) *" hint={prev("altura")}>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={v.altura ?? ""}
                  placeholder="Ex: 1.75 ou 175"
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") return set("altura", null);
                    let n = Number(raw);
                    if (!isNaN(n) && n > 3) n = n / 100; // 175 -> 1.75
                    set("altura", n);
                  }}
                />
              </Field>
              <Field label="PA Sistólica" hint={prev("pressao_sistolica")}><NumInput value={v.pressao_sistolica} onChange={num("pressao_sistolica")} /></Field>
              <Field label="PA Diastólica" hint={prev("pressao_diastolica")}><NumInput value={v.pressao_diastolica} onChange={num("pressao_diastolica")} /></Field>
              <Field label="FC Repouso (bpm)" hint={prev("fc_repouso")}><NumInput value={v.fc_repouso} onChange={num("fc_repouso")} /></Field>
            </div>
            {v.altura != null && (v.altura < 1 || v.altura > 2.4) ? (
              <p className="text-xs text-destructive mt-2">Altura fora da faixa esperada (1.00–2.40 m). Confira o valor.</p>
            ) : null}
          </Section>

          <Section title="Dobras Cutâneas (mm)">
            {v.protocolo === "obesos" ? (
              <p className="text-sm text-muted-foreground">Este protocolo não utiliza dobras — usa circunferência abdominal.</p>
            ) : v.protocolo === "jp3" && !v.genero ? (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <p>Selecione o gênero na aba <strong>Configuração</strong> antes de preencher as dobras — o protocolo JP3 mede pontos diferentes para homens e mulheres.</p>
              </div>
            ) : (() => {
              const required = requiredDobras(v.protocolo, v.genero);
              // JP3 só mostra as 3 dobras do sexo selecionado, pra não confundir o
              // personal com pontos que essa fórmula nem usa. JP7 usa todas as 7.
              const visiveis = v.protocolo === "jp3" ? DOBRAS.filter(([k]) => required.includes(k)) : DOBRAS;
              return (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {visiveis.map(([k, label]) => (
                    <Field key={k} label={label} hint={prev(k)}>
                      <NumInput value={v[k]} onChange={num(k)} step="0.1" />
                    </Field>
                  ))}
                </div>
              );
            })()}
          </Section>

          {calc?.percentual_gordura ? (
            <div className="luxury-card p-4 border-primary/40">
              <div className="grid grid-cols-3 gap-2 text-center">
                <BigStat label="% G" value={fmt(calc?.percentual_gordura, "%")} hint={calc?.classificacao_pg} />
                <BigStat label="MM" value={fmt(calc?.massa_magra, " kg")} />
                <BigStat label="MG" value={fmt(calc?.massa_gorda, " kg")} />
                <BigStat label="IMC" value={fmt(calc?.imc)} hint={calc?.imc_classificacao} />
                <BigStat label="RCQ" value={fmt(calc?.rcq, "", 3)} hint={calc?.rcq_classificacao} />
                <BigStat label="Peso ideal" value={calc?.peso_ideal_min ? `${fmt(calc.peso_ideal_min)}–${fmt(calc.peso_ideal_max)}` : "—"} />
              </div>
            </div>
          ) : v.protocolo !== "obesos" && missingDobras.length > 0 ? (
            <div className="luxury-card p-4 border-destructive/40 bg-destructive/5">
              <p className="text-sm text-destructive flex items-center gap-2 font-medium">
                <AlertTriangle className="size-4 shrink-0" /> % Gordura, massa magra/gorda e peso ideal não serão calculados
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Preencha também: <strong className="text-foreground">{missingDobrasLabels.join(", ")}</strong>.
              </p>
            </div>
          ) : null}
        </>
      )}

      {view === "perimetros" && (
        <>
          <Section title="Centrais (cm)">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {CIRC.map(([k, label]) => (
                <Field key={k} label={label} hint={prev(k)}><NumInput value={v[k]} onChange={num(k)} step="0.1" /></Field>
              ))}
            </div>
          </Section>
          <Section title="Bilaterais (cm)">
            <div className="grid grid-cols-[1fr_70px_70px] gap-2 items-center text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              <span></span><span className="text-center">Direito</span><span className="text-center">Esquerdo</span>
            </div>
            <div className="space-y-2">
              {CIRC_BILAT.map(([k, label]) => {
                const hD = prev(`circ_${k}_d`);
                const hE = prev(`circ_${k}_e`);
                return (
                  <div key={k} className="grid grid-cols-[1fr_70px_70px] gap-2 items-center">
                    <Label className="text-sm leading-tight">
                      {label}
                      {hD || hE ? <span className="block text-[10px] normal-case text-primary/70">anterior: D {hD ?? "—"} / E {hE ?? "—"}</span> : null}
                    </Label>
                    <NumInput value={v[`circ_${k}_d`]} onChange={num(`circ_${k}_d`)} step="0.1" />
                    <NumInput value={v[`circ_${k}_e`]} onChange={num(`circ_${k}_e`)} step="0.1" />
                  </div>
                );
              })}
            </div>
          </Section>
          <Section title="Diâmetro Ósseo (cm)">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              {DIAMETROS.map(([k, label]) => (
                <Field key={k} label={label} hint={prev(k)}><NumInput value={v[k]} onChange={num(k)} step="0.1" /></Field>
              ))}
            </div>
          </Section>
        </>
      )}

      {view === "vo2" && (
        <Section title="VO2 Máx">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <div className="col-span-2">
              <Field label="Protocolo">
                <Select value={v.vo2_protocolo ?? ""} onValueChange={(val) => set("vo2_protocolo", val)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{VO2_PROTOCOLOS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Distância / Reps"><NumInput value={v.vo2_distancia} onChange={num("vo2_distancia")} step="0.01" /></Field>
            <Field label="FC Final (bpm)"><NumInput value={v.vo2_fc_final} onChange={num("vo2_fc_final")} /></Field>
            <Field label="Resultado (ml/kg/min)"><NumInput value={v.vo2_resultado} onChange={num("vo2_resultado")} step="0.1" /></Field>
            <Field label="Classificação">
              <Select value={v.vo2_classificacao ?? ""} onValueChange={(val) => set("vo2_classificacao", val)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {["Muito Fraco","Fraco","Regular","Bom","Excelente","Superior"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </Section>
      )}

      {view === "neuro" && (
        <Section title="Testes Neuromotores">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <Field label="Preensão D. (kgf)"><NumInput value={v.neuro_preensao_d} onChange={num("neuro_preensao_d")} step="0.1" /></Field>
            <Field label="Preensão E. (kgf)"><NumInput value={v.neuro_preensao_e} onChange={num("neuro_preensao_e")} step="0.1" /></Field>
            <Field label="Sentar-alcançar (cm)"><NumInput value={v.neuro_sentar_alcancar} onChange={num("neuro_sentar_alcancar")} step="0.1" /></Field>
            <Field label="Abdominais 1 min"><NumInput value={v.neuro_abdominal_1min} onChange={num("neuro_abdominal_1min")} /></Field>
            <Field label="Flexões 1 min"><NumInput value={v.neuro_flexao_1min} onChange={num("neuro_flexao_1min")} /></Field>
            <Field label="Salto vertical (cm)"><NumInput value={v.neuro_salto_vertical} onChange={num("neuro_salto_vertical")} step="0.1" /></Field>
          </div>
        </Section>
      )}

      {view === "postural" && <PosturalPanel v={v} set={set} />}

      {view === "obs" && (
        <Section title="Observações">
          <Textarea rows={6} value={v.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} placeholder="Observações do avaliador, recomendações, próximos passos..." />
        </Section>
      )}

      <Button className="w-full bg-primary text-primary-foreground" onClick={() => setView("menu")}>
        <Check className="size-4" /> Concluir seção
      </Button>
    </div>
  );
}

function PosturalPanel({ v, set }: { v: Record<string, any>; set: (k: string, val: any) => void }) {
  const [tab, setTab] = useState<PosturalView>("anterior");
  const selected: string[] = v.postural?.[tab] ?? [];
  const toggle = (item: string) => {
    const cur = v.postural ?? {};
    const list: string[] = cur[tab] ?? [];
    const next = list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
    set("postural", { ...cur, [tab]: next });
  };

  return (
    <Section title="Avaliação Postural">
      <div className="flex gap-2 mb-3">
        {(["anterior","lateral","posterior"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs uppercase tracking-wider rounded-md border transition ${tab === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mb-2 text-center">
        Toque nos pontos do corpo ou marque na lista
      </p>

      <PosturalBody view={tab} items={POSTURAL[tab]} selected={selected} onToggle={toggle} />

      <div className="mt-4 grid gap-1.5">
        {POSTURAL[tab].map((item) => (
          <label key={item} className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/40">
            <Checkbox checked={selected.includes(item)} onCheckedChange={() => toggle(item)} />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="luxury-card p-4">
      <h2 className="font-display text-base font-semibold text-primary mb-3 tracking-wide">{title}</h2>
      {children}
    </div>
  );
}
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <Label className="mb-1.5 flex items-baseline gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {label}
        {hint ? <span className="normal-case tracking-normal text-primary/70">(anterior: {hint})</span> : null}
      </Label>
      {children}
    </div>
  );
}
function NumInput({ value, onChange, step, disabled }: { value: any; onChange: (v: string) => void; step?: string; disabled?: boolean }) {
  return <Input type="number" inputMode="decimal" step={step ?? "1"} value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} />;
}
function BigStat({ label, value, hint }: { label: string; value: string; hint?: string | null }) {
  return (
    <div className="rounded-lg border border-primary/30 bg-card/60 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-primary mb-1">{label}</p>
      <p className="font-display text-lg font-bold leading-tight">{value}</p>
      {hint ? <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{hint}</p> : null}
    </div>
  );
}
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-bold">{value}</p>
    </div>
  );
}
function fmt(v: any, suffix = "", digits = 2) {
  if (v === null || v === undefined) return "—";
  return Number(v).toFixed(digits) + suffix;
}
function fmtDate(d: string) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function calcAge(b: string) {
  const d = new Date(b); const t = new Date();
  let a = t.getFullYear() - d.getFullYear();
  const md = t.getMonth() - d.getMonth();
  if (md < 0 || (md === 0 && t.getDate() < d.getDate())) a--;
  return a;
}
