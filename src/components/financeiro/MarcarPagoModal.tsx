import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMarcarPago } from "@/lib/queries/financeiro";
import { BRL, FORMAS_PAGAMENTO, hojeYmd } from "@/lib/financeiro-calc";
import { Modal, SELECT_CLASS } from "./Modal";

export interface ItemParaPagar {
  tabela: "vendas" | "lancamentos";
  id: string;
  titulo: string;
  valor_centavos: number;
}

/** Pendente -> pago: pergunta como e quando o dinheiro foi pago (ex.: recebido em dinheiro). */
export function MarcarPagoModal({ item, onClose }: { item: ItemParaPagar; onClose: () => void }) {
  const marcar = useMarcarPago();
  const [forma, setForma] = useState<string>("dinheiro");
  const [data, setData] = useState(hojeYmd());

  function confirmar() {
    marcar.mutate(
      { tabela: item.tabela, id: item.id, forma, data },
      {
        onSuccess: () => { toast.success("Marcado como pago"); onClose(); },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }

  return (
    <Modal title="Marcar como pago" onClose={onClose} maxWidth="max-w-sm">
      <p className="text-sm text-muted-foreground">
        <strong className="text-foreground">{item.titulo}</strong> · {BRL(item.valor_centavos)}
      </p>
      <div>
        <Label>Forma de pagamento</Label>
        <select value={forma} onChange={(e) => setForma(e.target.value)} className={SELECT_CLASS}>
          {FORMAS_PAGAMENTO.map((f) => <option key={f.v} value={f.v}>{f.l}</option>)}
        </select>
      </div>
      <div>
        <Label>Data do pagamento</Label>
        <Input type="date" value={data} max={hojeYmd()} onChange={(e) => setData(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={confirmar} disabled={marcar.isPending}>Confirmar pagamento</Button>
      </div>
    </Modal>
  );
}
