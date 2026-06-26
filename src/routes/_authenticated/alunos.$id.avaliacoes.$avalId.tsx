import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, FileDown, Loader2, Trash2, Calculator } from "lucide-react";
import { toast } from "sonner";
import { useAvaliacaoDetail, useDeleteAvaliacao } from "@/lib/queries/avaliacoes";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/alunos/$id/avaliacoes/$avalId")({
  component: AvaliacaoDetail,
});

function AvaliacaoDetail() {
  const { id: aluno_id, avalId } = Route.useParams();
  const navigate = useNavigate();
  const [genPdf, setGenPdf] = useState(false);

  const { data, isLoading } = useAvaliacaoDetail(aluno_id, avalId);

  const del = useDeleteAvaliacao(aluno_id);
  function removerAvaliacao() {
    if (!confirm("Remover avaliação?")) return;
    del.mutate(avalId, {
      onSuccess: () => {
        toast.success("Avaliação removida");
        navigate({ to: "/alunos/$id/avaliacoes", params: { id: aluno_id } });
      },
      onError: (e: any) => toast.error(e.message),
    });
  }

  async function downloadPDF() {
    if (!data) return;
    setGenPdf(true);
    try {
      let fotoUrl: string | null = null;
      if (data.aluno.photo_url) {
        // photo_url is a signed URL; fetch and convert to data URL for react-pdf
        try {
          const r = await fetch(data.aluno.photo_url);
          const b = await r.blob();
          fotoUrl = await new Promise<string>((res) => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result as string);
            fr.readAsDataURL(b);
          });
        } catch { fotoUrl = null; }
      }
      const [{ pdf }, { AvaliacaoPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/pdf/AvaliacaoPDF"),
      ]);
      const blob = await pdf(<AvaliacaoPDF aluno={data.aluno} avaliacao={data.aval} anamnese={data.anam} fotoUrl={fotoUrl} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `avaliacao-${data.aluno.full_name.replace(/\s+/g, "_")}-${data.aval.data_avaliacao}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF gerado");
    } catch (e: any) {
      toast.error("Erro ao gerar PDF: " + e.message);
    } finally {
      setGenPdf(false);
    }
  }

  if (isLoading || !data) {
    return <div className="grid h-40 place-items-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  }
  const a = data.aval;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link to="/alunos/$id/avaliacoes" params={{ id: aluno_id }} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" /> Histórico
        </Link>
        <div className="flex gap-2">
          <Button onClick={downloadPDF} disabled={genPdf} className="bg-primary text-primary-foreground hover:opacity-90">
            {genPdf ? <><Loader2 className="size-4 animate-spin" /> Gerando</> : <><FileDown className="size-4" /> Baixar PDF</>}
          </Button>
          <Button variant="outline" onClick={removerAvaliacao} className="border-destructive/40 text-destructive hover:bg-destructive/10">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Avaliação de {formatDate(a.data_avaliacao)}</p>
        <h2 className="font-display text-2xl font-semibold">{protocoloLabel(a.protocolo)}</h2>
      </div>

      {/* Resultados destacados */}
      <div className="luxury-card p-6 border-primary/40">
        <h3 className="font-display text-lg font-semibold text-primary mb-4 flex items-center gap-2"><Calculator className="size-5" /> Resultados</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <BigStat label="% Gordura" value={fmt(a.percentual_gordura, "%")} />
          <BigStat label="Massa Magra" value={fmt(a.massa_magra, " kg")} />
          <BigStat label="Massa Gorda" value={fmt(a.massa_gorda, " kg")} />
          <BigStat label="IMC" value={fmt(a.imc)} hint={a.imc_classificacao} />
          <BigStat label="RCQ" value={fmt(a.rcq, "", 3)} hint={a.rcq_classificacao} />
          <BigStat label="Peso Ideal" value={a.peso_ideal_min ? `${fmt(a.peso_ideal_min)} – ${fmt(a.peso_ideal_max)} kg` : "—"} />
        </div>
      </div>

      <Card title="Dados Gerais">
        <Grid4>
          <FieldRO label="Peso" value={fmt(a.peso, " kg")} />
          <FieldRO label="Altura" value={fmt(a.altura, " m")} />
          <FieldRO label="Idade" value={a.idade ? `${a.idade} anos` : "—"} />
          <FieldRO label="Gênero" value={a.genero ?? "—"} />
          <FieldRO label="PA" value={a.pressao_sistolica && a.pressao_diastolica ? `${a.pressao_sistolica}/${a.pressao_diastolica}` : "—"} />
          <FieldRO label="FC Repouso" value={a.fc_repouso ? `${a.fc_repouso} bpm` : "—"} />
          <FieldRO label="Densidade" value={a.densidade_corporal ? String(a.densidade_corporal) : "—"} />
        </Grid4>
      </Card>

      <Card title="Circunferências (cm)">
        <Grid4>
          {[
            ["Pescoço", a.circ_pescoco], ["Ombro", a.circ_ombro], ["Tórax", a.circ_torax],
            ["Cintura", a.circ_cintura], ["Abdômen", a.circ_abdomen], ["Quadril", a.circ_quadril],
            ["Braço D.", a.circ_braco_d], ["Braço E.", a.circ_braco_e],
            ["Antebraço D.", a.circ_antebraco_d], ["Antebraço E.", a.circ_antebraco_e],
            ["Coxa D.", a.circ_coxa_d], ["Coxa E.", a.circ_coxa_e],
            ["Panturrilha D.", a.circ_panturrilha_d], ["Panturrilha E.", a.circ_panturrilha_e],
          ].map(([l, val]) => <FieldRO key={l as string} label={l as string} value={fmt(val)} />)}
        </Grid4>
      </Card>

      <Card title="Dobras Cutâneas (mm)">
        <Grid4>
          {[
            ["Peitoral", a.dobra_peitoral], ["Axilar Média", a.dobra_axilar_media], ["Tríceps", a.dobra_triceps],
            ["Subescapular", a.dobra_subescapular], ["Abdominal", a.dobra_abdominal],
            ["Suprailíaca", a.dobra_suprailiaca], ["Coxa", a.dobra_coxa],
          ].map(([l, val]) => <FieldRO key={l as string} label={l as string} value={fmt(val)} />)}
        </Grid4>
      </Card>

      {a.observacoes ? (
        <Card title="Observações">
          <p className="text-sm leading-relaxed">{a.observacoes}</p>
        </Card>
      ) : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="luxury-card p-6">
      <h3 className="font-display text-base font-semibold text-primary mb-4 tracking-wide">{title}</h3>
      {children}
    </div>
  );
}
function Grid4({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-4">{children}</div>;
}
function FieldRO({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
function BigStat({ label, value, hint }: { label: string; value: string; hint?: string | null }) {
  return (
    <div className="rounded-lg border border-primary/30 bg-card/60 p-4 text-center">
      <p className="text-[10px] uppercase tracking-[0.2em] text-primary mb-2">{label}</p>
      <p className="font-display text-2xl font-bold">{value}</p>
      {hint ? <p className="text-[10px] text-muted-foreground mt-1">{hint}</p> : null}
    </div>
  );
}
function fmt(v: any, suffix = "", digits = 2) {
  if (v === null || v === undefined) return "—";
  return Number(v).toFixed(digits) + suffix;
}
function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function protocoloLabel(p: string | null) {
  if (p === "jp3") return "Jackson & Pollock — 3 dobras";
  if (p === "jp7") return "Jackson & Pollock — 7 dobras";
  if (p === "obesos") return "Protocolo Obesos (Weltman)";
  return "—";
}
