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
    min: ["alunos", "min"] as const, // id+nome p/ selects
  },
  exercicios: {
    all: ["exercicios"] as const,
    list: () => ["exercicios", "list"] as const,
    picker: ["exercicios", "picker"] as const, // biblioteca completa p/ seletor
  },
  avaliacoes: {
    all: ["avaliacoes"] as const,
    byAluno: (alunoId: string) => ["avaliacoes", "aluno", alunoId] as const,
    detail: (id: string) => ["avaliacoes", "detail", id] as const,
    // Dados do aluno usados ao montar uma nova avaliação (nome, gênero, nascimento).
    alunoCtx: (alunoId: string) => ["avaliacoes", "aluno-ctx", alunoId] as const,
  },
  treinos: {
    all: ["treinos"] as const,
    byAluno: (alunoId: string) => ["treinos", "aluno", alunoId] as const,
    detail: (id: string) => ["treinos", "detail", id] as const,
    exercicios: (treinoId: string) => ["treinos", "exercicios", treinoId] as const,
    exec: (treinoId: string) => ["treinos", "exec", treinoId] as const, // itens c/ mídia p/ execução
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
  // Financeiro: vendas + metas mensais (prefixo comum p/ invalidação ampla).
  vendas: {
    all: ["financeiro", "vendas"] as const,
    list: (uid?: string) => ["financeiro", "vendas", uid] as const,
  },
  metasFin: {
    all: ["financeiro", "meta"] as const,
    byMes: (uid: string | undefined, mes: number, ano: number) =>
      ["financeiro", "meta", uid, mes, ano] as const,
  },
  produtos: {
    all: ["produtos"] as const,
    ativos: ["produtos", "ativos"] as const, // catálogo ativo (nova venda)
    admin: ["produtos", "admin"] as const, // todos, p/ gestão
  },
  dashboard: {
    all: ["dashboard"] as const,
    pro: (uid?: string) => ["dashboard", "pro", uid] as const,
    aluno: (uid?: string) => ["dashboard", "aluno", uid] as const,
  },
  // Administração de usuários e permissões.
  permissoes: {
    users: ["permissoes", "users"] as const,
    userPerms: (uid: string | null) => ["permissoes", "user", uid] as const,
  },
  // Customização admin (campos, categorias, protocolos) — mantém chaves originais.
  customizacao: {
    fields: (contexto: string) => ["custom_fields", contexto] as const,
    categorias: ["exercicio_categorias"] as const,
    protocolos: ["protocolos_avaliacao"] as const,
  },
  // Telas do próprio aluno (portal).
  portal: {
    treinos: (alunoId?: string) => ["portal", "treinos", alunoId] as const,
    agenda: (uid?: string) => ["portal", "agenda", uid] as const,
    pagamentos: (uid?: string) => ["portal", "pagamentos", uid] as const,
  },
  // Módulos vinculados a um aluno (mantêm as chaves originais p/ continuidade).
  alunoBasic: (alunoId: string) => ["aluno-basic", alunoId] as const,
  anamnese: { byAluno: (alunoId: string) => ["anamnese", alunoId] as const },
  metas: { byAluno: (alunoId: string) => ["metas", alunoId] as const },
  nutricao: {
    plano: (alunoId: string) => ["plano", alunoId] as const,
    refeicoes: (planoId?: string) => ["refeicoes", planoId] as const,
  },
  evolucao: { byAluno: (alunoId: string) => ["evolucao", alunoId] as const },
  fotos: { byAluno: (alunoId: string) => ["fotos", alunoId] as const },
} as const;
