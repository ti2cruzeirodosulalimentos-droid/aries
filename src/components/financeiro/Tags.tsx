import type { PagamentoStatus } from "@/lib/financeiro-calc";

const BASE = "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider whitespace-nowrap";

export function Tag({ children, tom = "ouro" }: { children: React.ReactNode; tom?: "ouro" | "verde" | "ambar" | "vermelho" | "cinza" }) {
  const cor = {
    ouro: "border-primary/40 text-primary",
    verde: "border-emerald-500/40 text-emerald-400",
    ambar: "border-amber-500/40 text-amber-300",
    vermelho: "border-destructive/40 text-destructive",
    cinza: "border-border text-muted-foreground",
  }[tom];
  return <span className={`${BASE} ${cor}`}>{children}</span>;
}

export function StatusPagamento({ status }: { status: PagamentoStatus }) {
  return status === "pago" ? <Tag tom="verde">Pago</Tag> : <Tag tom="ambar">Pendente</Tag>;
}
