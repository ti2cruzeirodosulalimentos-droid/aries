// Templates de treino padrão de academia.
// Os exercícios são referenciados pelo NOME exato (deve bater com a biblioteca seedada).

export type TemplateItem = {
  nome: string;          // nome exato do exercício na biblioteca
  series: number;
  repeticoes: string;    // "10-12", "8", "15"
  descanso_seg: number;
  metodo?: string;
};

export type TemplateTreino = {
  letra: string;
  nome: string;
  objetivo: string;
  itens: TemplateItem[];
};

export type Template = {
  id: string;
  nome: string;
  descricao: string;
  divisao: string;       // "ABC", "ABCD", "PPL", "Full Body"
  nivel: "Iniciante" | "Intermediário" | "Avançado";
  treinos: TemplateTreino[];
};

export type AjusteNivel = "iniciante" | "intermediario" | "avancado";

/**
 * Ajusta volume (séries), descanso e sugere faixa de carga com base no nível do aluno.
 * - Iniciante: menos séries, mais descanso, foco em aprendizado (10-15 reps).
 * - Intermediário: padrão do template.
 * - Avançado: +1 série, menos descanso, faixas mais pesadas mantidas.
 *
 * Se um 1RM (kg) for informado para o exercício (mapa nome→1RM), calcula a carga
 * inicial sugerida com base na faixa de reps (Epley reverso):
 *   carga ≈ 1RM × (1 - 0.0333 × reps_alvo)
 * usando o limite inferior da faixa para reps_alvo conservador.
 */
export function ajustarItem(
  it: TemplateItem,
  nivel: AjusteNivel,
  rmKg?: number,
): TemplateItem & { carga_sugerida?: string } {
  let series = it.series;
  let descanso = it.descanso_seg;
  let reps = it.repeticoes;

  if (nivel === "iniciante") {
    series = Math.max(2, it.series - 1);
    descanso = it.descanso_seg + 15;
    // amplia faixa para reps mais leves
    if (/^\d+-\d+$/.test(it.repeticoes)) {
      const [a, b] = it.repeticoes.split("-").map(Number);
      reps = `${Math.max(a, 10)}-${Math.max(b, 15)}`;
    }
  } else if (nivel === "avancado") {
    series = it.series + 1;
    descanso = Math.max(30, it.descanso_seg - 15);
  }

  let carga_sugerida: string | undefined;
  if (rmKg && rmKg > 0) {
    const repsAlvo = /^\d+/.test(reps) ? parseInt(reps, 10) : 10;
    const pct = Math.max(0.4, 1 - 0.0333 * repsAlvo);
    const carga = Math.round(rmKg * pct);
    carga_sugerida = `${carga} kg`;
  }

  return { ...it, series, descanso_seg: descanso, repeticoes: reps, carga_sugerida };
}

export const TEMPLATES: Template[] = [
  {
    id: "abc-hipertrofia",
    nome: "ABC — Hipertrofia",
    descricao: "Clássico 3x/semana: Peito+Tríceps / Costas+Bíceps / Pernas+Ombros.",
    divisao: "ABC",
    nivel: "Intermediário",
    treinos: [
      {
        letra: "A", nome: "Peito + Tríceps", objetivo: "Hipertrofia de peito e tríceps",
        itens: [
          { nome: "Supino Reto com Barra", series: 4, repeticoes: "8-10", descanso_seg: 90 },
          { nome: "Supino Inclinado com Halteres", series: 4, repeticoes: "10-12", descanso_seg: 75 },
          { nome: "Crucifixo com Halteres", series: 3, repeticoes: "12", descanso_seg: 60 },
          { nome: "Crossover na Polia", series: 3, repeticoes: "15", descanso_seg: 45 },
          { nome: "Tríceps Pulley", series: 4, repeticoes: "10-12", descanso_seg: 60 },
          { nome: "Tríceps Francês", series: 3, repeticoes: "12", descanso_seg: 60 },
          { nome: "Mergulho em Banco", series: 3, repeticoes: "até falha", descanso_seg: 60 },
        ],
      },
      {
        letra: "B", nome: "Costas + Bíceps", objetivo: "Hipertrofia de dorsais e bíceps",
        itens: [
          { nome: "Barra Fixa", series: 4, repeticoes: "6-10", descanso_seg: 90 },
          { nome: "Remada Curvada com Barra", series: 4, repeticoes: "8-10", descanso_seg: 90 },
          { nome: "Puxada Frente na Polia", series: 3, repeticoes: "10-12", descanso_seg: 75 },
          { nome: "Remada Baixa Sentado", series: 3, repeticoes: "12", descanso_seg: 60 },
          { nome: "Rosca Direta com Barra", series: 4, repeticoes: "10-12", descanso_seg: 60 },
          { nome: "Rosca Alternada com Halteres", series: 3, repeticoes: "10", descanso_seg: 60 },
          { nome: "Rosca Martelo", series: 3, repeticoes: "12", descanso_seg: 45 },
        ],
      },
      {
        letra: "C", nome: "Pernas + Ombros", objetivo: "Hipertrofia de membros inferiores e deltoides",
        itens: [
          { nome: "Agachamento Livre", series: 4, repeticoes: "8-10", descanso_seg: 120 },
          { nome: "Leg Press 45°", series: 4, repeticoes: "10-12", descanso_seg: 90 },
          { nome: "Cadeira Extensora", series: 3, repeticoes: "12-15", descanso_seg: 60 },
          { nome: "Mesa Flexora", series: 4, repeticoes: "10-12", descanso_seg: 60 },
          { nome: "Panturrilha em Pé", series: 4, repeticoes: "15-20", descanso_seg: 45 },
          { nome: "Desenvolvimento com Halteres", series: 4, repeticoes: "10", descanso_seg: 75 },
          { nome: "Elevação Lateral", series: 4, repeticoes: "12-15", descanso_seg: 45 },
        ],
      },
    ],
  },
  {
    id: "abcd-hipertrofia",
    nome: "ABCD — Hipertrofia",
    descricao: "4x/semana com mais volume por grupo: Peito / Costas / Pernas / Ombros+Braços.",
    divisao: "ABCD",
    nivel: "Intermediário",
    treinos: [
      {
        letra: "A", nome: "Peito", objetivo: "Volume e força de peito",
        itens: [
          { nome: "Supino Reto com Barra", series: 4, repeticoes: "6-8", descanso_seg: 120 },
          { nome: "Supino Inclinado com Halteres", series: 4, repeticoes: "8-10", descanso_seg: 90 },
          { nome: "Supino Declinado com Barra", series: 3, repeticoes: "10", descanso_seg: 75 },
          { nome: "Crucifixo com Halteres", series: 3, repeticoes: "12", descanso_seg: 60 },
          { nome: "Crossover na Polia", series: 3, repeticoes: "15", descanso_seg: 45 },
          { nome: "Peck Deck", series: 3, repeticoes: "12-15", descanso_seg: 45, metodo: "Drop-set na última" },
        ],
      },
      {
        letra: "B", nome: "Costas", objetivo: "Espessura e largura dorsal",
        itens: [
          { nome: "Levantamento Terra", series: 4, repeticoes: "5-6", descanso_seg: 150 },
          { nome: "Barra Fixa", series: 4, repeticoes: "8", descanso_seg: 90 },
          { nome: "Remada Curvada com Barra", series: 4, repeticoes: "8-10", descanso_seg: 90 },
          { nome: "Remada Cavalinho", series: 3, repeticoes: "10", descanso_seg: 75 },
          { nome: "Puxada Frente na Polia", series: 3, repeticoes: "12", descanso_seg: 60 },
          { nome: "Pullover com Halter", series: 3, repeticoes: "12", descanso_seg: 60 },
        ],
      },
      {
        letra: "C", nome: "Pernas", objetivo: "Hipertrofia completa de pernas",
        itens: [
          { nome: "Agachamento Livre", series: 5, repeticoes: "5-8", descanso_seg: 150 },
          { nome: "Hack Squat", series: 4, repeticoes: "10", descanso_seg: 90 },
          { nome: "Afundo com Halteres", series: 3, repeticoes: "12 por perna", descanso_seg: 75 },
          { nome: "Cadeira Extensora", series: 4, repeticoes: "12-15", descanso_seg: 60 },
          { nome: "Stiff com Barra", series: 4, repeticoes: "10", descanso_seg: 90 },
          { nome: "Mesa Flexora", series: 3, repeticoes: "12", descanso_seg: 60 },
          { nome: "Panturrilha em Pé", series: 5, repeticoes: "15-20", descanso_seg: 45 },
        ],
      },
      {
        letra: "D", nome: "Ombros + Braços", objetivo: "Deltoides, bíceps e tríceps",
        itens: [
          { nome: "Desenvolvimento com Barra", series: 4, repeticoes: "8", descanso_seg: 90 },
          { nome: "Elevação Lateral", series: 4, repeticoes: "12-15", descanso_seg: 45 },
          { nome: "Elevação Frontal", series: 3, repeticoes: "12", descanso_seg: 45 },
          { nome: "Crucifixo Inverso", series: 3, repeticoes: "15", descanso_seg: 45 },
          { nome: "Rosca Scott", series: 4, repeticoes: "10", descanso_seg: 60 },
          { nome: "Rosca Martelo", series: 3, repeticoes: "12", descanso_seg: 45 },
          { nome: "Tríceps Testa com Barra W", series: 4, repeticoes: "10", descanso_seg: 60 },
          { nome: "Tríceps Pulley", series: 3, repeticoes: "12-15", descanso_seg: 45 },
        ],
      },
    ],
  },
  {
    id: "ppl",
    nome: "Push / Pull / Legs",
    descricao: "Empurrar (peito, ombro, tríceps) / Puxar (costas, bíceps) / Pernas. 3 ou 6x/semana.",
    divisao: "PPL",
    nivel: "Avançado",
    treinos: [
      {
        letra: "A", nome: "Push (Empurrar)", objetivo: "Peito, ombros e tríceps",
        itens: [
          { nome: "Supino Reto com Barra", series: 4, repeticoes: "6-8", descanso_seg: 120 },
          { nome: "Desenvolvimento com Halteres", series: 4, repeticoes: "8-10", descanso_seg: 90 },
          { nome: "Supino Inclinado com Halteres", series: 3, repeticoes: "10", descanso_seg: 75 },
          { nome: "Elevação Lateral", series: 4, repeticoes: "12-15", descanso_seg: 45 },
          { nome: "Tríceps Pulley", series: 4, repeticoes: "10-12", descanso_seg: 60 },
          { nome: "Tríceps Francês", series: 3, repeticoes: "12", descanso_seg: 60 },
        ],
      },
      {
        letra: "B", nome: "Pull (Puxar)", objetivo: "Costas e bíceps",
        itens: [
          { nome: "Levantamento Terra", series: 4, repeticoes: "5", descanso_seg: 150 },
          { nome: "Barra Fixa", series: 4, repeticoes: "8", descanso_seg: 90 },
          { nome: "Remada Curvada com Barra", series: 4, repeticoes: "8-10", descanso_seg: 90 },
          { nome: "Remada Baixa Sentado", series: 3, repeticoes: "12", descanso_seg: 60 },
          { nome: "Rosca Direta com Barra", series: 4, repeticoes: "10", descanso_seg: 60 },
          { nome: "Rosca Concentrada", series: 3, repeticoes: "12", descanso_seg: 45 },
        ],
      },
      {
        letra: "C", nome: "Legs (Pernas)", objetivo: "Pernas completas",
        itens: [
          { nome: "Agachamento Livre", series: 5, repeticoes: "5-8", descanso_seg: 150 },
          { nome: "Leg Press 45°", series: 4, repeticoes: "10-12", descanso_seg: 90 },
          { nome: "Stiff com Barra", series: 4, repeticoes: "10", descanso_seg: 90 },
          { nome: "Cadeira Extensora", series: 3, repeticoes: "15", descanso_seg: 60 },
          { nome: "Mesa Flexora", series: 3, repeticoes: "12", descanso_seg: 60 },
          { nome: "Panturrilha em Pé", series: 5, repeticoes: "15-20", descanso_seg: 45 },
        ],
      },
    ],
  },
  {
    id: "fullbody",
    nome: "Full Body — Iniciante",
    descricao: "Corpo inteiro 3x/semana, ideal para iniciantes ganharem base.",
    divisao: "Full Body",
    nivel: "Iniciante",
    treinos: [
      {
        letra: "A", nome: "Full Body A", objetivo: "Aprendizado de padrões básicos",
        itens: [
          { nome: "Agachamento no Smith", series: 3, repeticoes: "10-12", descanso_seg: 90 },
          { nome: "Supino Reto com Barra", series: 3, repeticoes: "10", descanso_seg: 75 },
          { nome: "Puxada Frente na Polia", series: 3, repeticoes: "10-12", descanso_seg: 75 },
          { nome: "Desenvolvimento com Halteres", series: 3, repeticoes: "12", descanso_seg: 60 },
          { nome: "Prancha", series: 3, repeticoes: "30s", descanso_seg: 45 },
        ],
      },
      {
        letra: "B", nome: "Full Body B", objetivo: "Variação com isoladores",
        itens: [
          { nome: "Leg Press 45°", series: 3, repeticoes: "12", descanso_seg: 90 },
          { nome: "Remada Baixa Sentado", series: 3, repeticoes: "12", descanso_seg: 75 },
          { nome: "Supino Inclinado com Halteres", series: 3, repeticoes: "12", descanso_seg: 75 },
          { nome: "Elevação Lateral", series: 3, repeticoes: "15", descanso_seg: 45 },
          { nome: "Rosca Alternada com Halteres", series: 3, repeticoes: "12", descanso_seg: 45 },
          { nome: "Tríceps Pulley", series: 3, repeticoes: "12", descanso_seg: 45 },
          { nome: "Abdominal Supra", series: 3, repeticoes: "15-20", descanso_seg: 30 },
        ],
      },
      {
        letra: "C", nome: "Full Body C", objetivo: "Glúteos e core",
        itens: [
          { nome: "Elevação Pélvica com Barra", series: 4, repeticoes: "10-12", descanso_seg: 75 },
          { nome: "Afundo com Halteres", series: 3, repeticoes: "10 por perna", descanso_seg: 75 },
          { nome: "Mesa Flexora", series: 3, repeticoes: "12", descanso_seg: 60 },
          { nome: "Remada Unilateral com Halter", series: 3, repeticoes: "10", descanso_seg: 60 },
          { nome: "Crucifixo com Halteres", series: 3, repeticoes: "12", descanso_seg: 60 },
          { nome: "Prancha", series: 3, repeticoes: "40s", descanso_seg: 45 },
        ],
      },
    ],
  },
  {
    id: "feminino-gluteos",
    nome: "Foco em Glúteos (4x/semana)",
    descricao: "Programação com foco em glúteos e posterior, dividida em 4 dias.",
    divisao: "ABCD",
    nivel: "Intermediário",
    treinos: [
      {
        letra: "A", nome: "Glúteos pesado", objetivo: "Sobrecarga de glúteo máximo",
        itens: [
          { nome: "Elevação Pélvica com Barra", series: 5, repeticoes: "8-10", descanso_seg: 90 },
          { nome: "Agachamento Sumô", series: 4, repeticoes: "10-12", descanso_seg: 75 },
          { nome: "Búlgaro com Halteres", series: 4, repeticoes: "10 por perna", descanso_seg: 75 },
          { nome: "Coice na Polia", series: 4, repeticoes: "12", descanso_seg: 45 },
          { nome: "Abdução na Máquina", series: 4, repeticoes: "15", descanso_seg: 45 },
        ],
      },
      {
        letra: "B", nome: "Posterior + Costas", objetivo: "Posterior de coxa e dorsais",
        itens: [
          { nome: "Stiff com Barra", series: 4, repeticoes: "10", descanso_seg: 90 },
          { nome: "Mesa Flexora", series: 4, repeticoes: "12", descanso_seg: 60 },
          { nome: "Cadeira Flexora", series: 3, repeticoes: "15", descanso_seg: 45 },
          { nome: "Puxada Frente na Polia", series: 4, repeticoes: "10-12", descanso_seg: 75 },
          { nome: "Remada Baixa Sentado", series: 3, repeticoes: "12", descanso_seg: 60 },
        ],
      },
      {
        letra: "C", nome: "Quadríceps + Peito", objetivo: "Pernas dianteiras e peito leve",
        itens: [
          { nome: "Hack Squat", series: 4, repeticoes: "10", descanso_seg: 90 },
          { nome: "Cadeira Extensora", series: 4, repeticoes: "12-15", descanso_seg: 60 },
          { nome: "Leg Press 45°", series: 4, repeticoes: "12", descanso_seg: 75 },
          { nome: "Supino Inclinado com Halteres", series: 3, repeticoes: "12", descanso_seg: 60 },
          { nome: "Crossover na Polia", series: 3, repeticoes: "15", descanso_seg: 45 },
        ],
      },
      {
        letra: "D", nome: "Glúteos + Ombros", objetivo: "Volume extra de glúteo + deltoides",
        itens: [
          { nome: "Elevação Pélvica com Barra", series: 4, repeticoes: "12", descanso_seg: 60 },
          { nome: "Coice na Polia", series: 4, repeticoes: "15", descanso_seg: 45 },
          { nome: "Afundo com Halteres", series: 3, repeticoes: "12 por perna", descanso_seg: 60 },
          { nome: "Desenvolvimento com Halteres", series: 4, repeticoes: "10", descanso_seg: 75 },
          { nome: "Elevação Lateral", series: 4, repeticoes: "15", descanso_seg: 45 },
          { nome: "Abdominal na Polia", series: 4, repeticoes: "15", descanso_seg: 45 },
        ],
      },
    ],
  },
];
