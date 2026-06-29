import { z } from "zod";

/**
 * Camada central de validação Zod.
 * Use safeParse(data) e exiba zod.flatten().fieldErrors ao usuário.
 */

const trimmedString = (min: number, max: number, label: string) =>
  z.string().trim().min(min, `${label} é obrigatório`).max(max, `${label} muito longo (máx. ${max})`);

const opt = <T extends z.ZodTypeAny>(s: T) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), s.optional());

const optNum = (min?: number, max?: number) =>
  z.preprocess(
    (v) => {
      if (v === "" || v === null || v === undefined) return undefined;
      const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
      return isNaN(n) ? undefined : n;
    },
    (() => {
      let s = z.number();
      if (min !== undefined) s = s.min(min, `Mínimo ${min}`);
      if (max !== undefined) s = s.max(max, `Máximo ${max}`);
      return s.optional();
    })(),
  );

const reqNum = (min: number, max: number, label: string) =>
  z.preprocess(
    (v) => {
      if (v === "" || v === null || v === undefined) return undefined;
      const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
      return isNaN(n) ? undefined : n;
    },
    z.number({ message: `${label} obrigatório` }).min(min, `${label} mínimo ${min}`).max(max, `${label} máximo ${max}`),
  );

const isoDate = opt(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"));

const emailOpt = opt(z.string().trim().email("E-mail inválido").max(255));

const phoneOpt = opt(
  z.string().trim().regex(/^[\d\s()+\-.]{8,20}$/, "Telefone inválido"),
);

const cpfOpt = opt(
  z.string().trim().regex(/^(\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{11})$/, "CPF inválido (11 dígitos)"),
);

/* ---------------- ALUNO ---------------- */
export const alunoSchema = z.object({
  full_name: trimmedString(2, 120, "Nome"),
  birth_date: isoDate,
  gender: opt(z.enum(["M", "F", "Outro"])),
  cpf: cpfOpt,
  phone: phoneOpt,
  whatsapp: phoneOpt,
  email: emailOpt,
  address: opt(z.string().trim().max(255)),
  profession: opt(z.string().trim().max(100)),
  goal: opt(z.string().trim().max(255)),
  notes: opt(z.string().trim().max(2000)),
  status: opt(z.enum(["ativo", "inativo", "vencendo"])).default("ativo"),
  plan_expires_at: isoDate,
  personal_id: opt(z.string().uuid("Personal inválido")),
});
export type AlunoInput = z.infer<typeof alunoSchema>;

/* ---------------- META ---------------- */
export const metaSchema = z
  .object({
    tipo: z.enum(["peso", "percentual_gordura", "massa_magra", "circunferencia", "performance", "habito", "outro"]),
    descricao: trimmedString(3, 200, "Descrição"),
    unidade: opt(z.string().trim().max(20)),
    valor_inicial: optNum(0, 1000),
    valor_atual: optNum(0, 1000),
    valor_alvo: reqNum(0, 1000, "Valor alvo"),
    data_alvo: isoDate,
    observacoes: opt(z.string().trim().max(1000)),
  })
  .refine((d) => d.valor_inicial === undefined || d.valor_alvo !== d.valor_inicial, {
    message: "Valor alvo não pode ser igual ao inicial",
    path: ["valor_alvo"],
  });
export type MetaInput = z.infer<typeof metaSchema>;

/* ---------------- AVALIAÇÃO FÍSICA ---------------- */
// Porteiro dos campos obrigatórios (data + antropometria base). Os ~60 campos
// adicionais (perímetros bilaterais, dobras, VO2, neuromotores, postural e
// resultados calculados) são montados pela tela e passam via .passthrough() —
// validamos o crítico sem enrijecer o formulário completo.
export const avaliacaoSchema = z
  .object({
    data_avaliacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data da avaliação é obrigatória"),
    peso: reqNum(20, 350, "Peso (kg)"),
    altura: reqNum(1.0, 2.5, "Altura (m)"),
    idade: optNum(5, 120),
    genero: opt(z.enum(["masculino", "feminino"])),
    protocolo: opt(z.enum(["jp3", "jp7", "obesos"])),
    observacoes: opt(z.string().trim().max(2000)),
  })
  .passthrough();
export type AvaliacaoInput = z.infer<typeof avaliacaoSchema>;

/* ---------------- ANAMNESE ---------------- */
export const anamneseSchema = z.object({
  objetivo: opt(z.string().trim().max(500)),
  historico_atividade: opt(z.string().trim().max(2000)),
  doencas_cardiovasculares: z.boolean().optional(),
  diabetes: z.boolean().optional(),
  hipertensao: z.boolean().optional(),
  lesoes: opt(z.string().trim().max(1000)),
  medicamentos: opt(z.string().trim().max(1000)),
  alergias: opt(z.string().trim().max(1000)),
  cirurgias: opt(z.string().trim().max(1000)),
  fumante: z.boolean().optional(),
  bebida: opt(z.enum(["nunca", "raramente", "social", "frequente"])),
  qualidade_sono: optNum(0, 10),
  horas_sono: optNum(0, 24),
  observacoes: opt(z.string().trim().max(2000)),
});
export type AnamneseInput = z.infer<typeof anamneseSchema>;

/* ---------------- TREINO ---------------- */
export const treinoSchema = z.object({
  nome: trimmedString(2, 100, "Nome do treino"),
  dia: opt(z.enum(["A", "B", "C", "D", "E", "F"])),
  descricao: opt(z.string().trim().max(2000)),
  ativo: z.boolean().optional().default(true),
});
export type TreinoInput = z.infer<typeof treinoSchema>;

export const treinoExercicioSchema = z.object({
  exercicio_id: z.string().uuid("Exercício obrigatório"),
  series: reqNum(1, 20, "Séries"),
  repeticoes: trimmedString(1, 30, "Repetições"), // pode ser "10-12" ou "AMRAP"
  carga: optNum(0, 1000),
  descanso_seg: optNum(0, 600),
  ordem: optNum(0, 100),
  observacoes: opt(z.string().trim().max(500)),
});
export type TreinoExercicioInput = z.infer<typeof treinoExercicioSchema>;

/* ---------------- NUTRIÇÃO ---------------- */
export const planoAlimentarSchema = z.object({
  nome: trimmedString(2, 100, "Nome do plano"),
  kcal_alvo: optNum(500, 6000),
  proteina_g: optNum(0, 500),
  carbo_g: optNum(0, 1000),
  gordura_g: optNum(0, 400),
  observacoes: opt(z.string().trim().max(2000)),
  ativo: z.boolean().optional().default(true),
});
export type PlanoAlimentarInput = z.infer<typeof planoAlimentarSchema>;

export const refeicaoSchema = z.object({
  nome: trimmedString(1, 80, "Nome da refeição"),
  horario: opt(z.string().regex(/^\d{2}:\d{2}$/, "Horário HH:MM")),
  alimentos: opt(z.string().trim().max(2000)),
  kcal: optNum(0, 3000),
  ordem: optNum(0, 50),
});
export type RefeicaoInput = z.infer<typeof refeicaoSchema>;

/* ---------------- HELPER ---------------- */
/** Retorna { ok: true, data } ou { ok: false, errors: Record<string,string> } com a primeira msg por campo. */
export function validate<T>(schema: z.ZodType<T>, input: unknown):
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string>; message: string } {
  const r = schema.safeParse(input);
  if (r.success) return { ok: true, data: r.data };
  const flat = r.error.flatten();
  const errors: Record<string, string> = {};
  for (const [k, v] of Object.entries(flat.fieldErrors)) {
    const arr = v as string[] | undefined;
    if (arr && arr.length) errors[k] = arr[0]!;
  }
  const firstMsg = Object.values(errors)[0] ?? r.error.issues[0]?.message ?? "Dados inválidos";
  return { ok: false, errors, message: firstMsg };
}
