// Fábrica central de query keys do TanStack Query.
// Use SEMPRE estas funções: invalidar o prefixo `.all` (ex.: qk.alunos.all)
// atinge listas + detalhes da entidade de uma vez (match por prefixo).
// Outras entidades serão adicionadas aqui conforme forem centralizadas.
export const qk = {
  alunos: {
    all: ["alunos"] as const,
    lists: ["alunos", "list"] as const, // prefixo de todas as listas (optimistic)
    list: (params: { search?: string; page?: number; pageSize?: number }) =>
      ["alunos", "list", params] as const,
    detail: (id: string) => ["alunos", "detail", id] as const,
  },
  exercicios: {
    all: ["exercicios"] as const,
    list: () => ["exercicios", "list"] as const,
  },
  avaliacoes: {
    all: ["avaliacoes"] as const,
    byAluno: (alunoId: string) => ["avaliacoes", "aluno", alunoId] as const,
    detail: (id: string) => ["avaliacoes", "detail", id] as const,
  },
  treinos: {
    all: ["treinos"] as const,
    byAluno: (alunoId: string) => ["treinos", "aluno", alunoId] as const,
    detail: (id: string) => ["treinos", "detail", id] as const,
  },
  agenda: {
    all: ["agenda"] as const,
    range: (uid: string | undefined, start: string, end: string) =>
      ["agenda", uid, start, end] as const,
  },
  mensagens: {
    all: ["mensagens"] as const,
    templates: ["mensagens", "templates"] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    pro: (uid?: string) => ["dashboard", "pro", uid] as const,
    aluno: (uid?: string) => ["dashboard", "aluno", uid] as const,
  },
  // Telas do próprio aluno (portal).
  portal: {
    treinos: (alunoId?: string) => ["portal", "treinos", alunoId] as const,
    agenda: (uid?: string) => ["portal", "agenda", uid] as const,
    pagamentos: (uid?: string) => ["portal", "pagamentos", uid] as const,
  },
} as const;
