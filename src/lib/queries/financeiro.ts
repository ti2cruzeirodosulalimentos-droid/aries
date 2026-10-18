import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { qk } from "@/lib/query-keys";
import { hojeYmd, type LancamentoFin, type PagamentoStatus, type VendaFin } from "@/lib/financeiro-calc";

// `produtos`, `assinaturas` e `lancamentos` recebem payload dinâmico → cast pontual nas operações.
const db = supabase as any;

const VENDAS_SELECT =
  "id, aluno_id, personal_id, produto_id, valor_centavos, data_venda, fim_vigencia, status, forma_pagamento, observacao, " +
  "pagamento_status, pago_em, assinatura_id, competencia, alunos(full_name), produtos(nome, tipo)";

export interface VendaRow extends VendaFin {
  personal_id: string;
  produto_id: string;
  fim_vigencia: string | null;
  forma_pagamento: string | null;
  competencia: string | null;
}

/** Datas "AAAA-MM-DD" plausíveis (evita ano digitado errado virar lançamento no ano errado). */
const dataValida = (s: unknown, maxFuturoAnos = 2) => {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const limite = `${Number(hojeYmd().slice(0, 4)) + maxFuturoAnos}-12-31`;
  return s >= "2015-01-01" && s <= limite;
};

/** Depois de qualquer mudança de pagamento: refaz listas do financeiro e os números do dashboard. */
function useAposMudarFinanceiro() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk.financeiro.all });
    qc.invalidateQueries({ queryKey: qk.dashboard.all });
  };
}

/**
 * Valor padrão da avaliação, em centavos (null = ainda não definido). O banco grava esse valor
 * em cada avaliação nova (avaliacoes_fisicas.valor_centavos) e o lança no financeiro sozinho.
 */
export function useValorAvaliacao() {
  return useQuery({
    queryKey: qk.config.valorAvaliacao,
    queryFn: async (): Promise<number | null> => {
      const { data, error } = await db.from("config_financeiro").select("valor_avaliacao_centavos").maybeSingle();
      if (error) throw error;
      return data ? Number(data.valor_avaliacao_centavos) : null;
    },
  });
}

/** Define o valor padrão da avaliação; 0 = não cobrar (só admin, por RLS). Vale só pras próximas avaliações. */
export function useSalvarValorAvaliacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (centavos: number) => {
      const valor = Math.round(Number(centavos));
      if (!Number.isFinite(valor) || valor < 0 || valor > 100_000_000) throw new Error("Valor inválido (R$ 0,00 a R$ 1.000.000)");
      const { error } = await db.from("config_financeiro").upsert({ id: true, valor_avaliacao_centavos: valor });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.config.valorAvaliacao }),
  });
}

export interface VendaDaAvaliacao {
  id: string;
  valor_centavos: number;
  status: string;
  pagamento_status: PagamentoStatus;
  pago_em: string | null;
}

/** Lançamento financeiro gerado por uma avaliação (null = não existe: antiga ou coberta pelo plano). */
export function useVendaDaAvaliacao(avalId: string) {
  return useQuery({
    queryKey: qk.vendas.byAvaliacao(avalId),
    enabled: !!avalId,
    queryFn: async (): Promise<VendaDaAvaliacao | null> => {
      const { data, error } = await db
        .from("vendas")
        .select("id, valor_centavos, status, pagamento_status, pago_em")
        .eq("avaliacao_id", avalId)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

/** O plano do aluno cobre esta avaliação? (a tela avisa antes de salvar; quem decide de verdade é o banco). */
export interface CoberturaAvaliacao {
  coberta: boolean;
  motivo: "sem_plano" | "plano_sem_avaliacao" | "incluida" | "cota_usada";
  assinatura_id: string | null;
  plano: string | null;
  a_cada_meses: number | null;
  proxima_livre: string | null;
}

export function useCoberturaAvaliacao(alunoId: string, data: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.avaliacoes.cobertura(alunoId, data),
    enabled: enabled && !!alunoId && /^\d{4}-\d{2}-\d{2}$/.test(data ?? ""),
    queryFn: async (): Promise<CoberturaAvaliacao | null> => {
      const { data: rows, error } = await db.rpc("avaliacao_cobertura", { p_aluno: alunoId, p_data: data });
      if (error) return null; // sem a função (migração não rodada) o formulário segue como antes
      return ((rows as CoberturaAvaliacao[] | null)?.[0] ?? null) as CoberturaAvaliacao | null;
    },
  });
}

/** Vendas com nome do aluno e produto embutidos (mais recente primeiro). */
export function useVendas(userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: qk.vendas.list(userId),
    enabled,
    queryFn: async (): Promise<VendaRow[]> => {
      const { data, error } = await db
        .from("vendas")
        .select(VENDAS_SELECT)
        .order("data_venda", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VendaRow[];
    },
  });
}

/** Meta financeira do mês/ano corrente do personal. */
export function useMetaFinanceira(userId: string | undefined, mes: number, ano: number) {
  return useQuery({
    queryKey: qk.metasFin.byMes(userId, mes, ano),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metas_financeiras")
        .select("id, valor_centavos")
        .eq("mes", mes)
        .eq("ano", ano)
        .eq("personal_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useDeleteVenda() {
  const aposMudar = useAposMudarFinanceiro();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: aposMudar,
  });
}

/** Cancela a venda sem apagar (some da receita e do pendente). Cobrança de plano só se cancela, nunca se apaga. */
export function useCancelarVenda() {
  const aposMudar = useAposMudarFinanceiro();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendas").update({ status: "cancelado" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: aposMudar,
  });
}

export function useCreateVenda() {
  const aposMudar = useAposMudarFinanceiro();
  return useMutation({
    mutationFn: async (payload: TablesInsert<"vendas">) => {
      if (!payload.aluno_id || !payload.produto_id) throw new Error("Selecione aluno e produto");
      const valor = Number(payload.valor_centavos);
      if (!Number.isFinite(valor) || valor <= 0 || valor > 100_000_000)
        throw new Error("Valor da venda inválido (R$ 0,01 a R$ 1.000.000)");
      if (payload.data_venda && !dataValida(payload.data_venda)) throw new Error("Data da venda inválida — confira o ano");
      const limpo = { ...payload };
      if (limpo.pagamento_status === "pendente") { delete limpo.pago_em; limpo.forma_pagamento = null; }
      const { error } = await supabase.from("vendas").insert(limpo);
      if (error) throw error;
    },
    onSuccess: aposMudar,
  });
}

export interface MarcarPagoInput {
  tabela: "vendas" | "lancamentos";
  id: string;
  forma: string;
  /** Dia em que o dinheiro entrou/saiu ("AAAA-MM-DD"). */
  data: string;
}

/** Pendente -> pago, guardando como e quando foi pago. */
export function useMarcarPago() {
  const aposMudar = useAposMudarFinanceiro();
  return useMutation({
    mutationFn: async ({ tabela, id, forma, data }: MarcarPagoInput) => {
      if (!dataValida(data, 0) || data > hojeYmd()) throw new Error("Data do pagamento inválida (não pode ser no futuro)");
      const { error } = await db
        .from(tabela)
        .update({ pagamento_status: "pago", pago_em: data, forma_pagamento: forma || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: aposMudar,
  });
}

/** Desfaz um pagamento marcado por engano (volta a ficar pendente). */
export function useReabrirPagamento() {
  const aposMudar = useAposMudarFinanceiro();
  return useMutation({
    mutationFn: async ({ tabela, id }: { tabela: "vendas" | "lancamentos"; id: string }) => {
      const { error } = await db.from(tabela).update({ pagamento_status: "pendente" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: aposMudar,
  });
}

/* ------------------------------ lançamentos avulsos ------------------------------ */

export interface LancamentoRow extends LancamentoFin {
  personal_id: string;
  aluno_id: string | null;
  forma_pagamento: string | null;
}

const LANC_SELECT =
  "id, personal_id, aluno_id, tipo, descricao, valor_centavos, data_lancamento, pagamento_status, pago_em, forma_pagamento, alunos(full_name)";

export function useLancamentos(userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: qk.lancamentos.list(userId),
    enabled,
    queryFn: async (): Promise<LancamentoRow[]> => {
      const { data, error } = await db
        .from("lancamentos")
        .select(LANC_SELECT)
        .order("data_lancamento", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LancamentoRow[];
    },
  });
}

export interface NovoLancamento {
  personal_id: string;
  tipo: "entrada" | "saida";
  descricao: string;
  valor_centavos: number;
  data_lancamento: string;
  aluno_id?: string | null;
  pagamento_status: PagamentoStatus;
  pago_em?: string | null;
  forma_pagamento?: string | null;
}

export function useCreateLancamento() {
  const aposMudar = useAposMudarFinanceiro();
  return useMutation({
    mutationFn: async (input: NovoLancamento) => {
      const descricao = input.descricao.trim();
      if (!descricao) throw new Error("Informe a descrição");
      if (descricao.length > 200) throw new Error("Descrição muito longa (máx. 200)");
      const valor = Math.round(Number(input.valor_centavos));
      if (!Number.isFinite(valor) || valor <= 0 || valor > 100_000_000) throw new Error("Valor inválido (R$ 0,01 a R$ 1.000.000)");
      if (!dataValida(input.data_lancamento)) throw new Error("Data inválida — confira o ano");
      const pago = input.pagamento_status === "pago";
      const { error } = await db.from("lancamentos").insert({
        personal_id: input.personal_id,
        tipo: input.tipo,
        descricao,
        valor_centavos: valor,
        data_lancamento: input.data_lancamento,
        aluno_id: input.aluno_id || null,
        pagamento_status: input.pagamento_status,
        pago_em: pago ? input.pago_em ?? input.data_lancamento : null,
        forma_pagamento: pago ? input.forma_pagamento ?? null : null,
      });
      if (error) throw error;
    },
    onSuccess: aposMudar,
  });
}

export function useDeleteLancamento() {
  const aposMudar = useAposMudarFinanceiro();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("lancamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: aposMudar,
  });
}

/* ------------------------------ plano do aluno (mensalidade automática) ------------------------------ */

export interface AssinaturaRow {
  id: string;
  aluno_id: string;
  personal_id: string;
  produto_id: string;
  valor_centavos: number;
  inicio: string;
  dia_vencimento: number;
  fim: string | null;
  alunos?: { full_name?: string | null } | null;
  produtos?: { nome?: string | null; duracao_meses?: number | null; avaliacao_a_cada_meses?: number | null } | null;
}

const ASS_SELECT =
  "id, aluno_id, personal_id, produto_id, valor_centavos, inicio, dia_vencimento, fim, alunos(full_name), produtos(nome, duracao_meses, avaliacao_a_cada_meses)";

export function useAssinaturas(userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: qk.assinaturas.list(userId),
    enabled,
    queryFn: async (): Promise<AssinaturaRow[]> => {
      const { data, error } = await db.from("assinaturas").select(ASS_SELECT).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AssinaturaRow[];
    },
  });
}

/**
 * Gera as cobranças (pendentes) que já deveriam existir: o app chama ao abrir o Financeiro e o Dashboard.
 * O banco só cria o que falta (idempotente) e só dos planos do usuário (admin: de todos).
 */
export function useGerarMensalidades(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    let cancelado = false;
    (async () => {
      const { data, error } = await db.rpc("gerar_mensalidades");
      if (cancelado || error) return;
      if (Number(data) > 0) {
        qc.invalidateQueries({ queryKey: qk.financeiro.all });
        qc.invalidateQueries({ queryKey: qk.dashboard.all });
      }
    })();
    return () => { cancelado = true; };
  }, [enabled, qc]);
}

export interface NovaAssinatura {
  aluno_id: string;
  personal_id: string;
  produto_id: string;
  valor_centavos: number;
  inicio: string;
  dia_vencimento: number;
}

/** Cadastra o plano do aluno e já gera a(s) cobrança(s) que estiverem vencendo. */
export function useCreateAssinatura() {
  const aposMudar = useAposMudarFinanceiro();
  return useMutation({
    mutationFn: async (input: NovaAssinatura): Promise<number> => {
      if (!input.aluno_id || !input.produto_id) throw new Error("Selecione o aluno e o plano");
      const valor = Math.round(Number(input.valor_centavos));
      if (!Number.isFinite(valor) || valor <= 0 || valor > 100_000_000) throw new Error("Valor inválido (R$ 0,01 a R$ 1.000.000)");
      const dia = Math.round(Number(input.dia_vencimento));
      if (!Number.isFinite(dia) || dia < 1 || dia > 31) throw new Error("Dia do vencimento deve ser de 1 a 31");
      if (!dataValida(input.inicio)) throw new Error("Data de início inválida — confira o ano");
      const { error } = await db.from("assinaturas").insert({ ...input, valor_centavos: valor, dia_vencimento: dia });
      if (error) throw error;
      const { data } = await db.rpc("gerar_mensalidades");
      return Number(data) || 0;
    },
    onSuccess: aposMudar,
  });
}

export function useUpdateAssinatura() {
  const aposMudar = useAposMudarFinanceiro();
  return useMutation({
    mutationFn: async ({ id, valor_centavos, dia_vencimento, fim }: { id: string; valor_centavos?: number; dia_vencimento?: number; fim?: string | null }) => {
      const patch: Record<string, unknown> = {};
      if (valor_centavos !== undefined) {
        const v = Math.round(Number(valor_centavos));
        if (!Number.isFinite(v) || v <= 0 || v > 100_000_000) throw new Error("Valor inválido (R$ 0,01 a R$ 1.000.000)");
        patch.valor_centavos = v;
      }
      if (dia_vencimento !== undefined) {
        const d = Math.round(Number(dia_vencimento));
        if (!Number.isFinite(d) || d < 1 || d > 31) throw new Error("Dia do vencimento deve ser de 1 a 31");
        patch.dia_vencimento = d;
      }
      if (fim !== undefined) {
        if (fim !== null && !dataValida(fim)) throw new Error("Data de encerramento inválida");
        patch.fim = fim;
      }
      const { error } = await db.from("assinaturas").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: aposMudar,
  });
}

export interface MetaFinanceiraInput {
  personal_id: string;
  mes: number;
  ano: number;
  valor_centavos: number;
}

export function useUpsertMetaFinanceira() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MetaFinanceiraInput) => {
      const valor = Number(input.valor_centavos);
      if (!Number.isFinite(valor) || valor < 0 || valor > 1_000_000_000) throw new Error("Meta inválida");
      const { error } = await supabase
        .from("metas_financeiras")
        .upsert({ ...input, valor_centavos: Math.round(valor) }, { onConflict: "personal_id,mes,ano" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.metasFin.all }),
  });
}

/** id + nome + personal_id dos alunos, para selects (nova venda). */
export function useAlunosMin() {
  return useQuery({
    queryKey: qk.alunos.min,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alunos")
        .select("id, full_name, personal_id")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Catálogo de produtos ativos (para registrar venda). */
export function useProdutosAtivos() {
  return useQuery({
    queryKey: qk.produtos.ativos,
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await db.from("produtos").select("*").eq("ativo", true).order("preco_centavos");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Todos os produtos (gestão admin). */
export function useProdutosAdmin() {
  return useQuery({
    queryKey: qk.produtos.admin,
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await db.from("produtos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Cria (sem id) ou atualiza (com id) um produto; limpa timestamps do payload. */
export function useUpsertProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (form: Record<string, any>) => {
      const payload: Record<string, any> = { ...form };
      delete payload.created_at;
      delete payload.updated_at;
      if (!String(payload.nome ?? "").trim()) throw new Error("Nome do produto obrigatório");
      const preco = Number(payload.preco_centavos);
      if (!Number.isFinite(preco) || preco < 0 || preco > 100_000_000) throw new Error("Preço inválido");
      // "inclui 1 avaliação a cada N meses" só faz sentido em plano; vazio = não inclui
      if (payload.tipo !== "plano" || payload.avaliacao_a_cada_meses === "" || payload.avaliacao_a_cada_meses === undefined) {
        payload.avaliacao_a_cada_meses = null;
      } else if (payload.avaliacao_a_cada_meses !== null) {
        const n = Number(payload.avaliacao_a_cada_meses);
        if (!Number.isInteger(n) || n < 1 || n > 24) throw new Error("Avaliação inclusa: de 1 a 24 meses");
        payload.avaliacao_a_cada_meses = n;
      }
      if (payload.id) {
        const { error } = await db.from("produtos").update(payload).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("produtos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.produtos.all }),
  });
}

export function useDeleteProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("produtos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.produtos.all }),
  });
}
