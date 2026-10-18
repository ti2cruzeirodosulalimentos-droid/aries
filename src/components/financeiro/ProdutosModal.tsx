import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDeleteProduto, useProdutosAdmin, useUpsertProduto } from "@/lib/queries/financeiro";
import { BRL } from "@/lib/financeiro-calc";
import { Modal } from "./Modal";

const AVALIACAO_INCLUSA = [
  { v: "", l: "Não inclui (a avaliação é cobrada à parte)" },
  { v: "1", l: "1 avaliação por mês" },
  { v: "2", l: "1 avaliação a cada 2 meses" },
  { v: "3", l: "1 avaliação a cada 3 meses" },
  { v: "4", l: "1 avaliação a cada 4 meses" },
  { v: "6", l: "1 avaliação a cada 6 meses" },
] as const;

export function ProdutosModal({ onClose }: { onClose: () => void }) {
  const { data: produtos = [] } = useProdutosAdmin();
  const upsert = useUpsertProduto();
  const del = useDeleteProduto();
  const [editing, setEditing] = useState<any>(null);
  const blank: any = { nome: "", tipo: "plano", preco_centavos: 0, duracao_meses: 1, ativo: true, avaliacao_a_cada_meses: null };
  const [form, setForm] = useState<any>(blank);
  const [valor, setValor] = useState("0,00");

  function startEdit(p: any) { setEditing(p); setForm(p); setValor((p.preco_centavos / 100).toFixed(2).replace(".", ",")); }
  function startNew() { setEditing({}); setForm(blank); setValor("0,00"); }

  function salvar() {
    if (!form.nome?.trim()) { toast.error("Nome obrigatório"); return; }
    const preco_centavos = Math.round(parseFloat(valor.replace(",", ".") || "0") * 100);
    upsert.mutate(
      { ...form, preco_centavos },
      {
        onSuccess: () => { toast.success(form.id ? "Atualizado" : "Criado"); setEditing(null); },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }
  function excluir(id: string) {
    if (!confirm("Excluir este produto?")) return;
    del.mutate(id, {
      onError: (e: Error) =>
        toast.error(/foreign key|violates/i.test(e.message)
          ? "Este produto já está em uso (vendas ou planos de alunos). Desmarque “Ativo” em vez de excluir."
          : e.message),
    });
  }

  return (
    <Modal title="Produtos & Planos" onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex justify-end">
        <Button size="sm" onClick={startNew}><Plus className="size-4" /> Novo</Button>
      </div>
      {editing ? (
        <div className="space-y-3 border border-border rounded-lg p-4 bg-secondary/20">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div><Label>Tipo</Label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="h-9 w-full rounded-md bg-input/60 px-3 text-sm border border-input">
                <option value="plano">Plano</option><option value="avaliacao">Avaliação</option>
              </select>
            </div>
            <div><Label>Duração (meses)</Label><Input type="number" min={0} value={form.duracao_meses ?? 0} onChange={(e) => setForm({ ...form, duracao_meses: parseInt(e.target.value) || 0 })} /></div>
            <div><Label>Preço (R$)</Label><Input value={valor} onChange={(e) => setValor(e.target.value)} /></div>
            <label className="flex items-end gap-2 text-sm"><input type="checkbox" checked={!!form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /> Ativo</label>
            {form.tipo === "plano" ? (
              <div className="col-span-2">
                <Label>Avaliação inclusa no plano</Label>
                <select
                  value={form.avaliacao_a_cada_meses == null ? "" : String(form.avaliacao_a_cada_meses)}
                  onChange={(e) => setForm({ ...form, avaliacao_a_cada_meses: e.target.value === "" ? null : Number(e.target.value) })}
                  className="h-9 w-full rounded-md bg-input/60 px-3 text-sm border border-input"
                >
                  {AVALIACAO_INCLUSA.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">Dentro dessa cota, a avaliação do aluno que tem este plano não gera cobrança. A que passar da cota é cobrada normalmente.</p>
              </div>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={salvar}>{form.id ? "Salvar" : "Criar"}</Button>
          </div>
        </div>
      ) : null}
      <div className="divide-y divide-border/40">
        {produtos.map((p: any) => (
          <div key={p.id} className="flex items-center justify-between py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">{p.nome} {!p.ativo && <span className="ml-2 text-[10px] uppercase text-muted-foreground">(inativo)</span>}</p>
              <p className="text-xs text-muted-foreground">
                {p.tipo} · {p.duracao_meses ?? 0}m · {BRL(p.preco_centavos)}
                {p.avaliacao_a_cada_meses ? ` · avaliação ${p.avaliacao_a_cada_meses === 1 ? "por mês" : `a cada ${p.avaliacao_a_cada_meses} meses`}` : ""}
              </p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => startEdit(p)} className="p-2 text-muted-foreground hover:text-primary"><Pencil className="size-4" /></button>
              <button onClick={() => excluir(p.id)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
            </div>
          </div>
        ))}
        {!produtos.length && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum produto cadastrado</p>}
      </div>
      <div className="flex justify-end"><Button variant="ghost" onClick={onClose}>Fechar</Button></div>
    </Modal>
  );
}
