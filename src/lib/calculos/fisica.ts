// Cálculos antropométricos — fórmulas clássicas de avaliação física
// Todas funções puras, retornam null quando entrada insuficiente.

export type Genero = "masculino" | "feminino";
export type Protocolo = "jp3" | "jp7" | "obesos";

export interface DobrasJP3 {
  peitoral?: number | null;     // homens
  abdominal?: number | null;    // homens
  coxa: number | null | undefined;
  triceps?: number | null;      // mulheres
  suprailiaca?: number | null;  // mulheres
}

export interface DobrasJP7 {
  peitoral: number | null | undefined;
  axilar_media: number | null | undefined;
  triceps: number | null | undefined;
  subescapular: number | null | undefined;
  abdominal: number | null | undefined;
  suprailiaca: number | null | undefined;
  coxa: number | null | undefined;
}

function n(v: number | null | undefined): number | null {
  return typeof v === "number" && !isNaN(v) ? v : null;
}

// IMC e classificação OMS
export function calcImc(peso: number | null | undefined, altura: number | null | undefined) {
  const p = n(peso), a = n(altura);
  if (!p || !a || a <= 0) return { imc: null, classificacao: null };
  const imc = p / (a * a);
  const c = imc < 18.5
    ? "Abaixo do peso"
    : imc < 25 ? "Eutrofia"
    : imc < 30 ? "Sobrepeso"
    : imc < 35 ? "Obesidade grau I"
    : imc < 40 ? "Obesidade grau II"
    : "Obesidade grau III";
  return { imc: round(imc, 2), classificacao: c };
}

// RCQ (relação cintura/quadril)
export function calcRcq(cintura: number | null | undefined, quadril: number | null | undefined, genero: Genero | null | undefined) {
  const c = n(cintura), q = n(quadril);
  if (!c || !q || q <= 0) return { rcq: null, classificacao: null };
  const rcq = c / q;
  let cls: string;
  if (genero === "masculino") {
    cls = rcq < 0.83 ? "Baixo risco" : rcq < 0.89 ? "Risco moderado" : rcq < 0.95 ? "Alto risco" : "Risco muito alto";
  } else if (genero === "feminino") {
    cls = rcq < 0.71 ? "Baixo risco" : rcq < 0.78 ? "Risco moderado" : rcq < 0.84 ? "Alto risco" : "Risco muito alto";
  } else {
    cls = "—";
  }
  return { rcq: round(rcq, 3), classificacao: cls };
}

// Siri (1961) — densidade → %G
export function siri(densidade: number | null): number | null {
  if (!densidade || densidade <= 0) return null;
  return round(495 / densidade - 450, 2);
}

// Jackson & Pollock 3 dobras
export function jp3(dobras: DobrasJP3, idade: number, genero: Genero): { densidade: number | null; pg: number | null; soma: number | null } {
  if (genero === "masculino") {
    const a = n(dobras.peitoral), b = n(dobras.abdominal), c = n(dobras.coxa);
    if (a === null || b === null || c === null) return empty();
    const S = a + b + c;
    const dc = 1.10938 - 0.0008267 * S + 0.0000016 * S * S - 0.0002574 * idade;
    return { densidade: round(dc, 5), pg: siri(dc), soma: round(S, 2) };
  }
  const a = n(dobras.triceps), b = n(dobras.suprailiaca), c = n(dobras.coxa);
  if (a === null || b === null || c === null) return empty();
  const S = a + b + c;
  const dc = 1.0994921 - 0.0009929 * S + 0.0000023 * S * S - 0.0001392 * idade;
  return { densidade: round(dc, 5), pg: siri(dc), soma: round(S, 2) };
}

// Jackson & Pollock 7 dobras
export function jp7(d: DobrasJP7, idade: number, genero: Genero): { densidade: number | null; pg: number | null; soma: number | null } {
  const vals = [d.peitoral, d.axilar_media, d.triceps, d.subescapular, d.abdominal, d.suprailiaca, d.coxa].map(n);
  if (vals.some((v) => v === null)) return empty();
  const S = vals.reduce((s, v) => s! + v!, 0)!;
  const dc = genero === "masculino"
    ? 1.112 - 0.00043499 * S + 0.00000055 * S * S - 0.00028826 * idade
    : 1.097 - 0.00046971 * S + 0.00000056 * S * S - 0.00012828 * idade;
  return { densidade: round(dc, 5), pg: siri(dc), soma: round(S, 2) };
}

// Protocolo Obesos (Weltman et al., 1988) — sem dobras, usa circunferência abdominal
export function obesos(circ_abdomen: number | null | undefined, peso: number | null | undefined, altura: number | null | undefined, genero: Genero): { pg: number | null } {
  const ca = n(circ_abdomen), p = n(peso), a = n(altura);
  if (!ca || !p) return { pg: null };
  if (genero === "masculino") {
    const pg = 0.31457 * ca - 0.10969 * p + 10.8336;
    return { pg: round(pg, 2) };
  }
  if (!a) return { pg: null };
  const alt_cm = a * 100;
  const pg = 0.11077 * ca - 0.17666 * alt_cm + 0.14354 * p + 51.03301;
  return { pg: round(pg, 2) };
}

// Massa gorda / magra / peso ideal por faixa
export function composicao(peso: number | null | undefined, pg: number | null, genero: Genero | null | undefined) {
  const p = n(peso);
  if (!p || pg === null) return { massaGorda: null, massaMagra: null, pesoIdealMin: null, pesoIdealMax: null };
  const massaGorda = (p * pg) / 100;
  const massaMagra = p - massaGorda;
  // Faixas ideais por gênero
  const [gMin, gMax] = genero === "feminino" ? [18, 25] : [10, 20];
  const pesoIdealMin = massaMagra / (1 - gMin / 100);
  const pesoIdealMax = massaMagra / (1 - gMax / 100);
  return {
    massaGorda: round(massaGorda, 2),
    massaMagra: round(massaMagra, 2),
    pesoIdealMin: round(pesoIdealMin, 2),
    pesoIdealMax: round(pesoIdealMax, 2),
  };
}

export function classificarPG(pg: number | null, genero: Genero | null | undefined): string {
  if (pg === null) return "—";
  if (genero === "feminino") {
    if (pg < 14) return "Essencial";
    if (pg < 21) return "Atlética";
    if (pg < 25) return "Boa forma";
    if (pg < 32) return "Aceitável";
    return "Obesidade";
  }
  if (pg < 6) return "Essencial";
  if (pg < 14) return "Atlética";
  if (pg < 18) return "Boa forma";
  if (pg < 25) return "Aceitável";
  return "Obesidade";
}

// TMB Mifflin-St Jeor
export function tmbMifflin(peso: number | null | undefined, altura: number | null | undefined, idade: number | null | undefined, genero: Genero | null | undefined): number | null {
  const p = n(peso), a = n(altura), i = n(idade);
  if (!p || !a || !i || !genero) return null;
  const alt_cm = a * 100;
  const base = 10 * p + 6.25 * alt_cm - 5 * i;
  return round(genero === "masculino" ? base + 5 : base - 161, 0);
}

function empty() {
  return { densidade: null, pg: null, soma: null };
}

function round(n: number, d: number) {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

// Calcula tudo com base no protocolo escolhido
export interface CalcInput {
  protocolo: Protocolo;
  genero: Genero;
  idade: number;
  peso: number | null;
  altura: number | null;
  cintura: number | null;
  quadril: number | null;
  abdomen: number | null;
  dobras: DobrasJP7 & DobrasJP3;
}

export function calcularAvaliacao(input: CalcInput) {
  const { protocolo, genero, idade, peso, altura, cintura, quadril, abdomen, dobras } = input;
  const imcRes = calcImc(peso, altura);
  const rcqRes = calcRcq(cintura, quadril, genero);

  let densidade: number | null = null;
  let pg: number | null = null;
  let soma: number | null = null;

  if (protocolo === "jp3") {
    const r = jp3(dobras, idade, genero);
    densidade = r.densidade; pg = r.pg; soma = r.soma;
  } else if (protocolo === "jp7") {
    const r = jp7(dobras, idade, genero);
    densidade = r.densidade; pg = r.pg; soma = r.soma;
  } else if (protocolo === "obesos") {
    const r = obesos(abdomen, peso, altura, genero);
    pg = r.pg;
  }

  const comp = composicao(peso, pg, genero);
  const classPG = classificarPG(pg, genero);

  return {
    imc: imcRes.imc,
    imc_classificacao: imcRes.classificacao,
    rcq: rcqRes.rcq,
    rcq_classificacao: rcqRes.classificacao,
    densidade,
    percentual_gordura: pg,
    classificacao_pg: classPG,
    soma_dobras: soma,
    massa_gorda: comp.massaGorda,
    massa_magra: comp.massaMagra,
    peso_ideal_min: comp.pesoIdealMin,
    peso_ideal_max: comp.pesoIdealMax,
  };
}
