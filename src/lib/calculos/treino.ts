// Cálculos de treinamento de força e cargas
// Todas funções puras, retornam null para entrada insuficiente.

function n(v: number | null | undefined): number | null {
  return typeof v === "number" && !isNaN(v) && v > 0 ? v : null;
}

// 1RM — Epley (mais usada). Boa estimativa para 1-10 reps.
export function rmEpley(carga: number | null | undefined, reps: number | null | undefined): number | null {
  const c = n(carga), r = n(reps);
  if (!c || !r) return null;
  return Math.round((c * (1 + r / 30)) * 10) / 10;
}

// 1RM — Brzycki. Mais precisa em reps baixas (<10).
export function rmBrzycki(carga: number | null | undefined, reps: number | null | undefined): number | null {
  const c = n(carga), r = n(reps);
  if (!c || !r || r >= 37) return null;
  return Math.round((c * 36 / (37 - r)) * 10) / 10;
}

// 1RM médio das duas
export function rm1(carga: number | null | undefined, reps: number | null | undefined): number | null {
  const e = rmEpley(carga, reps);
  const b = rmBrzycki(carga, reps);
  if (e === null && b === null) return null;
  if (e === null) return b;
  if (b === null) return e;
  return Math.round(((e + b) / 2) * 10) / 10;
}

// Tabela %1RM por número de reps (NSCA / Baechle)
export const PCT_1RM: Record<number, number> = {
  1: 1.00, 2: 0.95, 3: 0.93, 4: 0.90, 5: 0.87,
  6: 0.85, 7: 0.83, 8: 0.80, 9: 0.77, 10: 0.75,
  11: 0.70, 12: 0.67, 15: 0.65,
};

export function cargaParaReps(rm: number | null, reps: number): number | null {
  if (!rm || rm <= 0) return null;
  const pct = PCT_1RM[reps] ?? Math.max(0.5, 1 - reps * 0.025);
  return Math.round(rm * pct * 10) / 10;
}

// Volume total da sessão (kg) = Σ séries × reps × carga
export function volumeTotal(items: Array<{ series?: number | null; reps?: number | null; carga?: number | null }>): number {
  return items.reduce((sum, it) => {
    const s = n(it.series), r = n(it.reps), c = n(it.carga);
    if (!s || !r || !c) return sum;
    return sum + s * r * c;
  }, 0);
}

// Zona de treinamento por %1RM
export function zonaDeTreino(pct: number): string {
  if (pct >= 0.90) return "Força máxima";
  if (pct >= 0.80) return "Hipertrofia pesada";
  if (pct >= 0.70) return "Hipertrofia";
  if (pct >= 0.60) return "Resistência muscular";
  return "Resistência / aquecimento";
}

// Faixa de descanso recomendada por objetivo
export function descansoSugerido(objetivo: "forca" | "hipertrofia" | "resistencia"): string {
  if (objetivo === "forca") return "2-5 min";
  if (objetivo === "hipertrofia") return "60-90s";
  return "30-60s";
}
