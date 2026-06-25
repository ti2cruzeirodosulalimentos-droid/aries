// Mifflin-St Jeor TMB e necessidades calóricas
export type Genero = "M" | "F";
export type Atividade = "sedentario" | "leve" | "moderado" | "intenso" | "muito_intenso";
export type Objetivo = "perder" | "manter" | "ganhar";

export const FATOR_ATIVIDADE: Record<Atividade, number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  intenso: 1.725,
  muito_intenso: 1.9,
};

export const ATIVIDADE_LABEL: Record<Atividade, string> = {
  sedentario: "Sedentário (sem exercícios)",
  leve: "Leve (1-3x/sem)",
  moderado: "Moderado (3-5x/sem)",
  intenso: "Intenso (6-7x/sem)",
  muito_intenso: "Muito intenso (atleta)",
};

export function calcularTMB(peso: number, altura: number, idade: number, genero: Genero): number {
  // altura em cm
  const base = 10 * peso + 6.25 * altura - 5 * idade;
  return genero === "M" ? base + 5 : base - 161;
}

export function calcularGET(tmb: number, atividade: Atividade): number {
  return tmb * FATOR_ATIVIDADE[atividade];
}

export function ajustarPorObjetivo(get: number, objetivo: Objetivo): number {
  if (objetivo === "perder") return get - 500;
  if (objetivo === "ganhar") return get + 400;
  return get;
}

// Distribuição padrão de macros (g) a partir das kcal e do peso
export function macrosPadrao(kcal: number, peso: number, objetivo: Objetivo) {
  const proteinaPorKg = objetivo === "ganhar" ? 2.0 : objetivo === "perder" ? 2.2 : 1.8;
  const proteina_g = Math.round(peso * proteinaPorKg);
  const gordura_g = Math.round((kcal * 0.25) / 9);
  const restante = kcal - proteina_g * 4 - gordura_g * 9;
  const carboidrato_g = Math.max(0, Math.round(restante / 4));
  return { proteina_g, carboidrato_g, gordura_g };
}

export function aguaSugerida(peso: number): number {
  return Number(((peso * 35) / 1000).toFixed(1));
}
