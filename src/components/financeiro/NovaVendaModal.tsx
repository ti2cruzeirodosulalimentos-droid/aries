import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAlunosMin, useCreateVenda, useProdutosAtivos } from "@/lib/queries/financeiro";
import { FORMAS_PAGAMENTO, hojeYmd, parseBRL } from "@/lib/financeiro-calc";
import { Modal, SELECT_CLASS } from "./Modal";

export function NovaVendaModal({ onClose, userId }: { onClose: () => void; userId: string }) {
  const { data: alunos = [] } = useAlunosMin();
  const { data: produtos = [] } = useProdutosAtivos();
  const create = useCreateVenda();
  const hoje = hojeYmd();
  const [alunoId, setAlunoId] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [valor, setValor] = useState("0,00");
  const [forma, setForma] = useState<string>("pix");
  const [data, setData] = useState(hoje);
  const [recebido, setRecebido] = useState(true);

  const produto = produtos.find((x) => x.id === produtoId);

  function onProduto(id: string) {
    setProdutoId(id);
    const p = produtos.find((x) => x.id === id);
    if (p) setValor((p.preco_centavos / 100).toFixed(2).replace(".", ","));
  }

  function salvar() {
    if (!alunoId || !produtoId) { toast.error("Selecione aluno e produto"); return; }
    const aluno = alunos.find((a) => a.id === alunoId);
    const valor_centavos = parseBRL(valor);
    create.mutate(
      {
        aluno_id: alunoId,
        personal_id: aluno?.personal_id ?? userId,
        produto_id: produtoId,
        valor_centavos,
        data_venda: data,
        inicio_vigencia: data,
        pagamento_status: recebido ? "pago" : "pendente",
        pago_em: recebido ? (data > hoje ? hoje : data) : undefined,
        forma_pagamento: recebido ? forma : null,
      },
      {
        onSuccess: () => { toast.success(recebido ? "Venda registrada" : "Venda registrada como pendente"); onClose(); },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }

  return (
    <Modal title="Nova venda" onClose={onClose}>
      <div className="space-y-3">
        <div><Label>Aluno</Label>
          <select value={alunoId} onChange={(e) => setAlunoId(e.target.value)} className={SELECT_CLASS}>
            <option value="">—</option>
            {alunos.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
          </select>
        </div>
        <div><Label>Produto</Label>
          <select value={produtoId} onChange={(e) => onProduto(e.target.value)} className={SELECT_CLASS}>
            <option value="">—</option>
            {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          {produto?.tipo === "plano" ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Esta venda é única. Para cobrar todo mês sozinho, cadastre o aluno em <strong className="text-foreground">Planos dos alunos</strong>.
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Valor (R$)</Label><Input value={valor} onChange={(e) => setValor(e.target.value)} /></div>
          <div><Label>Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={recebido} onChange={(e) => setRecebido(e.target.checked)} /> Já recebi
        </label>
        {recebido ? (
          <div><Label>Forma de pagamento</Label>
            <select value={forma} onChange={(e) => setForma(e.target.value)} className={SELECT_CLASS}>
              {FORMAS_PAGAMENTO.map((f) => <option key={f.v} value={f.v}>{f.l}</option>)}
            </select>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Fica em Pendentes até você marcar como paga.</p>
        )}
      </div>
      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={salvar} disabled={create.isPending}>Registrar</Button></div>
    </Modal>
  );
}
