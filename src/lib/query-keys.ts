// Fábrica central de query keys do TanStack Query.
// Use SEMPRE estas funções: invalidar o prefixo `.all` (ex.: qk.alunos.all)
// atinge listas + detalhes da entidade de uma vez (match por prefixo).
// Outras entidades serão adicionadas aqui conforme forem centralizadas.
export const qk = {
  alunos: {
    all: ["alunos"] as const,
    list: (params: { search?: string; page?: number; pageSize?: number }) =>
      ["alunos", "list", params] as const,
    detail: (id: string) => ["alunos", "detail", id] as const,
  },
} as const;
