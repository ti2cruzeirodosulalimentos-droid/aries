/**
 * Cálculos e formatação do Financeiro — funções puras (testáveis, sem React/Supabase).
 *
 * Datas são sempre strings "AAAA-MM-DD". Compará-las como texto evita o erro de fuso horário de
 * `new Date("2026-10-17")` (vira meia-noite UTC e, no Brasil, mostra o dia anterior).
 *
 * Regra de receita: conta o que foi PAGO (por data de pagamento). O pendente aparece à parte, como "a receber".
 */

export type PagamentoStatus = "pendente" | "pago";

export interface VendaFin {
  id: string;
  aluno_id: string;
  valor_centavos: number;
  data_venda: string;
  status: string;
  /** Ausente em linhas anteriores à migração: tratado como "pago" (era assim que o app funcionava). */
  pagamento_status?: PagamentoStatus | null;
  pago_em?: string | null;
  observacao?: string | null;
  assinatura_id?: string | null;
  produtos?: { nome?: string | null; tipo?: string | null } | null;
  alunos?: { full_name?: string | null } | null;
}

export interface LancamentoFin {
  id: string;
  tipo: "entrada" | "saida";
  descricao?: string | null;
  valor_centavos: number;
  data_lancamento: string;
  pagamento_status: PagamentoStatus;
  pago_em?: string | null;
  alunos?: { full_name?: string | null } | null;
}

/* ------------------------------ datas e dinheiro ------------------------------ */

const pad = (n: number) => String(n).padStart(2, "0");

export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hojeYmd = () => ymd(new Date());

/** "2026-10-17" -> "17/10/2026" (sem passar por Date, logo sem deslocar o dia). */
export const fmtData = (s?: string | null) =>
  s && /^\d{4}-\d{2}-\d{2}/.test(s) ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : "—";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/** "2026-10" -> "Outubro/2026" */
export const mesAnoLabel = (ym: string) => `${MESES[Number(ym.slice(5, 7)) - 1] ?? "?"}/${ym.slice(0, 4)}`;

/** Soma (ou subtrai) meses de um "AAAA-MM". */
export function addMes(ym: string, delta: number): string {
  const total = Number(ym.slice(0, 4)) * 12 + (Number(ym.slice(5, 7)) - 1) + delta;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}

/** Dias corridos de `de` até `ate` (positivo se `ate` é depois). */
export function diasEntre(de: string, ate: string): number {
  const t = (s: string) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
  return Math.round((t(ate) - t(de)) / 86_400_000);
}

export const BRL = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** "150,00" / "1.500,00" / "150.5" -> centavos (NaN se inválido). */
export function parseBRL(s: string): number {
  let t = s.replace(/[^\d.,]/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  return Math.round(parseFloat(t) * 100);
}

/* ------------------------------ forma de pagamento ------------------------------ */

export const FORMAS_PAGAMENTO = [
  { v: "dinheiro", l: "Dinheiro" },
  { v: "pix", l: "Pix" },
  { v: "cartao", l: "Cartão" },
  { v: "transferencia", l: "Transferência" },
] as const;

export const formaLabel = (v?: string | null) => FORMAS_PAGAMENTO.find((f) => f.v === v)?.l ?? v ?? "";

/* ------------------------------ status ------------------------------ */

export const pagamentoDe = (v: { pagamento_status?: PagamentoStatus | null }): PagamentoStatus => v.pagamento_status ?? "pago";

/** Quando o dinheiro entrou: a data de pagamento (ou, em registros antigos, a data da venda). */
export const quandoPagou = (v: { pago_em?: string | null; data_venda: string }) => v.pago_em ?? v.data_venda;

export const ehAutomaticoAvaliacao = (v: { observacao?: string | null }) =>
  typeof v.observacao === "string" && v.observacao.startsWith("Gerado automaticamente");

/** Texto e cor do prazo de uma cobrança pendente. */
export function prazoDe(dataYmd: string, hoje: string): { texto: string; vencida: boolean } {
  const d = diasEntre(hoje, dataYmd);
  if (d < 0) return { texto: `Atrasada ${-d} ${-d === 1 ? "dia" : "dias"}`, vencida: true };
  if (d === 0) return { texto: "Vence hoje", vencida: false };
  return { texto: `Vence em ${d} ${d === 1 ? "dia" : "dias"}`, vencida: false };
}

/* ------------------------------ resumo ------------------------------ */

export interface ResumoFin {
  recebidoMes: number;
  recebidoAno: number;
  saidasMes: number;
  saidasAno: number;
  aReceber: number;
  aReceberQtd: number;
  vencidasQtd: number;
  vencidasValor: number;
  aPagar: number;
  ticket: number;
  qtdAval: number;
  qtdPlanos: number;
  top: { nome: string; total: number }[];
}

export function resumoFinanceiro(vendas: VendaFin[], lancs: LancamentoFin[], hoje: string): ResumoFin {
  const mes = hoje.slice(0, 7);
  const ano = hoje.slice(0, 4);
  const r: ResumoFin = {
    recebidoMes: 0, recebidoAno: 0, saidasMes: 0, saidasAno: 0,
    aReceber: 0, aReceberQtd: 0, vencidasQtd: 0, vencidasValor: 0, aPagar: 0,
    ticket: 0, qtdAval: 0, qtdPlanos: 0, top: [],
  };
  const porAluno = new Map<string, { nome: string; total: number }>();
  let somaPagas = 0;
  let qtdPagas = 0;

  const entrou = (quando: string, valor: number) => {
    if (quando.startsWith(ano)) r.recebidoAno += valor;
    if (quando.startsWith(mes)) r.recebidoMes += valor;
  };

  for (const v of vendas) {
    if (v.status === "cancelado") continue;
    const tipo = v.produtos?.tipo;
    if (tipo === "avaliacao") r.qtdAval++;
    else if (tipo === "plano") r.qtdPlanos++;

    if (pagamentoDe(v) === "pago") {
      entrou(quandoPagou(v), v.valor_centavos);
      somaPagas += v.valor_centavos;
      qtdPagas++;
      const cur = porAluno.get(v.aluno_id) ?? { nome: v.alunos?.full_name ?? "—", total: 0 };
      cur.total += v.valor_centavos;
      porAluno.set(v.aluno_id, cur);
    } else {
      r.aReceber += v.valor_centavos;
      r.aReceberQtd++;
      if (v.data_venda < hoje) { r.vencidasQtd++; r.vencidasValor += v.valor_centavos; }
    }
  }

  for (const l of lancs) {
    if (l.tipo === "entrada") {
      if (l.pagamento_status === "pago") entrou(l.pago_em ?? l.data_lancamento, l.valor_centavos);
      else {
        r.aReceber += l.valor_centavos;
        r.aReceberQtd++;
        if (l.data_lancamento < hoje) { r.vencidasQtd++; r.vencidasValor += l.valor_centavos; }
      }
    } else if (l.pagamento_status === "pago") {
      const quando = l.pago_em ?? l.data_lancamento;
      if (quando.startsWith(ano)) r.saidasAno += l.valor_centavos;
      if (quando.startsWith(mes)) r.saidasMes += l.valor_centavos;
    } else {
      r.aPagar += l.valor_centavos;
    }
  }

  r.ticket = qtdPagas ? Math.round(somaPagas / qtdPagas) : 0;
  r.top = Array.from(porAluno.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  return r;
}

/* ------------------------------ aba Pendentes ------------------------------ */

export type OrigemPendente = "mensalidade" | "avaliacao" | "venda" | "avulso";

export interface ItemPendente {
  tabela: "vendas" | "lancamentos";
  id: string;
  /** Vencimento. */
  data: string;
  titulo: string;
  subtitulo: string;
  valor_centavos: number;
  /** true = saída (a pagar); false = entrada (a receber). */
  saida: boolean;
  origem: OrigemPendente;
}

/** Tudo que está pendente (vendas e lançamentos), do vencimento mais antigo pro mais novo. */
export function itensPendentes(vendas: VendaFin[], lancs: LancamentoFin[]): ItemPendente[] {
  const itens: ItemPendente[] = [];
  for (const v of vendas) {
    if (v.status === "cancelado" || pagamentoDe(v) !== "pendente") continue;
    itens.push({
      tabela: "vendas",
      id: v.id,
      data: v.data_venda,
      titulo: v.alunos?.full_name ?? "—",
      subtitulo: v.produtos?.nome ?? "—",
      valor_centavos: v.valor_centavos,
      saida: false,
      origem: v.assinatura_id ? "mensalidade" : ehAutomaticoAvaliacao(v) ? "avaliacao" : "venda",
    });
  }
  for (const l of lancs) {
    if (l.pagamento_status !== "pendente") continue;
    itens.push({
      tabela: "lancamentos",
      id: l.id,
      data: l.data_lancamento,
      titulo: l.descricao ?? "Lançamento",
      subtitulo: l.alunos?.full_name ?? (l.tipo === "saida" ? "Saída" : "Entrada avulsa"),
      valor_centavos: l.valor_centavos,
      saida: l.tipo === "saida",
      origem: "avulso",
    });
  }
  return itens.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.titulo.localeCompare(b.titulo)));
}

/* ------------------------------ aba Avulsos ------------------------------ */

export interface ResumoMes {
  entradas: number;
  saidas: number;
  saldo: number;
  pendenteEntradas: number;
  pendenteSaidas: number;
}

/** Totais dos lançamentos avulsos de um mês ("AAAA-MM"), pela data do lançamento. */
export function resumoAvulsosDoMes<T extends LancamentoFin>(lancs: T[], ym: string): { itens: T[]; resumo: ResumoMes } {
  const itens = lancs.filter((l) => l.data_lancamento.startsWith(ym));
  const resumo: ResumoMes = { entradas: 0, saidas: 0, saldo: 0, pendenteEntradas: 0, pendenteSaidas: 0 };
  for (const l of itens) {
    const entrada = l.tipo === "entrada";
    if (l.pagamento_status === "pago") {
      if (entrada) resumo.entradas += l.valor_centavos; else resumo.saidas += l.valor_centavos;
    } else if (entrada) resumo.pendenteEntradas += l.valor_centavos;
    else resumo.pendenteSaidas += l.valor_centavos;
  }
  resumo.saldo = resumo.entradas - resumo.saidas;
  return { itens, resumo };
}
