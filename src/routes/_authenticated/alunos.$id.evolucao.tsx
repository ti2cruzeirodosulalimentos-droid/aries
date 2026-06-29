import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { TrendingUp, TrendingDown, Download, FileText } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useAlunoBasic, useEvolucao } from "@/lib/queries/aluno-modulos";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsSkeleton } from "@/components/ui/list-skeleton";
import { toast } from "sonner";
import { LazyBody3D, type MuscleGroup } from "@/components/3d";

function trend(a: number | null, b: number | null): "up" | "down" | "same" {
  if (a == null || b == null) return "same";
  const d = Number(a) - Number(b);
  if (Math.abs(d) < 0.3) return "same";
  return d > 0 ? "up" : "down";
}

export const Route = createFileRoute("/_authenticated/alunos/$id/evolucao")({
  head: () => ({ meta: [{ title: "Evolução — ARIÉS" }] }),
  component: EvolucaoPage,
});

type Row = {
  id: string; data_avaliacao: string;
  peso: number | null; percentual_gordura: number | null;
  massa_magra: number | null; massa_gorda: number | null; imc: number | null;
  circ_cintura: number | null; circ_quadril: number | null;
};

function EvolucaoPage() {
  const { id } = Route.useParams();
  const chartRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const { data: aluno } = useAlunoBasic(id);
  const { data, isLoading, isError, refetch } = useEvolucao<Row>(id);

  const chartData = useMemo(() => (data ?? []).map((r) => ({
    data: formatDate(r.data_avaliacao),
    peso: numOrNull(r.peso),
    gordura: numOrNull(r.percentual_gordura),
    massa_magra: numOrNull(r.massa_magra),
    imc: numOrNull(r.imc),
  })), [data]);

  const summary = useMemo(() => {
    if (!data || data.length === 0) return null;
    const first = data[0], last = data[data.length - 1];
    return {
      first, last,
      dPeso: diff(last.peso, first.peso),
      dGord: diff(last.percentual_gordura, first.percentual_gordura),
      dMM: diff(last.massa_magra, first.massa_magra),
      dIMC: diff(last.imc, first.imc),
    };
  }, [data]);

  async function exportPDF() {
    if (!data || data.length === 0) { toast.error("Nenhuma avaliação registrada."); return; }
    setExporting(true);
    try {
      let chartImage: string | null = null;
      // tenta capturar gráfico via SVG → PNG
      const svg = chartRef.current?.querySelector("svg");
      if (svg) chartImage = await svgToPng(svg as SVGSVGElement, 1200, 480);

      const registros = (data ?? []).slice().reverse().map((r) => ({
        data: formatDate(r.data_avaliacao),
        peso: numOrNull(r.peso),
        gordura: numOrNull(r.percentual_gordura),
        massa_magra: numOrNull(r.massa_magra),
        imc: numOrNull(r.imc),
      }));
      const periodo = { de: formatDate(data[0].data_avaliacao), ate: formatDate(data[data.length - 1].data_avaliacao) };

      const [{ pdf }, { EvolucaoPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/pdf/EvolucaoPDF"),
      ]);
      const blob = await pdf(
        <EvolucaoPDF
          alunoNome={aluno?.full_name ?? "Aluno"}
          fotoUrl={aluno?.photo_url ?? null}
          periodo={periodo}
          registros={registros}
          chartImage={chartImage}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Evolucao-${(aluno?.full_name ?? "aluno").replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <StatsSkeleton count={4} />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Sem dados de evolução"
        description="Cadastre avaliações físicas para visualizar gráficos e tendências de evolução."
        action={{ label: "Nova avaliação", to: "/alunos/$id/avaliacoes/nova", params: { id }, icon: TrendingUp }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Análise</p>
          <h2 className="font-display text-2xl font-semibold">Evolução do Aluno</h2>
        </div>
        <Button onClick={exportPDF} disabled={exporting}>
          <Download className="size-4" /> {exporting ? "Gerando..." : "Exportar PDF"}
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Peso" value={fmt(summary.last.peso, " kg")} delta={summary.dPeso} invert />
          <StatCard label="% Gordura" value={fmt(summary.last.percentual_gordura, "%")} delta={summary.dGord} invert />
          <StatCard label="Massa Magra" value={fmt(summary.last.massa_magra, " kg")} delta={summary.dMM} />
          <StatCard label="IMC" value={fmt(summary.last.imc)} delta={summary.dIMC} invert />
        </div>
      )}

      {summary && (
        <div className="luxury-card p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Heatmap Corporal (1ª avaliação vs atual)</p>
          <p className="text-[11px] text-muted-foreground mb-2">Verde = reduziu · Vermelho = aumentou · Cinza = estável</p>
          <LazyBody3D
            heatmap={{
              abdomen: trend(summary.last.circ_cintura, summary.first.circ_cintura),
              lombar: trend(summary.last.circ_cintura, summary.first.circ_cintura),
              gluteo: trend(summary.last.circ_quadril, summary.first.circ_quadril),
              peito: trend(summary.last.peso, summary.first.peso),
              quadriceps: trend(summary.last.massa_gorda, summary.first.massa_gorda),
              posterior: trend(summary.last.massa_gorda, summary.first.massa_gorda),
              biceps: trend(summary.first.massa_magra, summary.last.massa_magra),
              triceps: trend(summary.first.massa_magra, summary.last.massa_magra),
            }}
            height={360}
          />
        </div>
      )}

      <div className="luxury-card p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-primary mb-3">Tendência</p>
        <div ref={chartRef} className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
              <CartesianGrid stroke="#2A2417" strokeDasharray="3 3" />
              <XAxis dataKey="data" stroke="#9A9A9A" fontSize={11} />
              <YAxis yAxisId="left" stroke="#D4AF37" fontSize={11} />
              <YAxis yAxisId="right" orientation="right" stroke="#F5D76E" fontSize={11} />
              <Tooltip contentStyle={{ background: "#161616", border: "1px solid #2A2417", borderRadius: 8, color: "#fff" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="left" type="monotone" dataKey="peso" name="Peso (kg)" stroke="#D4AF37" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line yAxisId="left" type="monotone" dataKey="massa_magra" name="Massa Magra (kg)" stroke="#34D399" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="gordura" name="% Gordura" stroke="#F87171" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="imc" name="IMC" stroke="#60A5FA" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="luxury-card p-4 overflow-x-auto">
        <p className="text-xs uppercase tracking-[0.2em] text-primary mb-3">Histórico</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="py-2">Data</th><th className="py-2 text-right">Peso</th>
              <th className="py-2 text-right">% Gord.</th><th className="py-2 text-right">M. Magra</th>
              <th className="py-2 text-right">M. Gorda</th><th className="py-2 text-right">IMC</th>
            </tr>
          </thead>
          <tbody>
            {data.slice().reverse().map((r) => (
              <tr key={r.id} className="border-b border-border/40">
                <td className="py-2">{formatDate(r.data_avaliacao)}</td>
                <td className="py-2 text-right">{fmt(r.peso, " kg")}</td>
                <td className="py-2 text-right">{fmt(r.percentual_gordura, "%")}</td>
                <td className="py-2 text-right">{fmt(r.massa_magra, " kg")}</td>
                <td className="py-2 text-right">{fmt(r.massa_gorda, " kg")}</td>
                <td className="py-2 text-right">{fmt(r.imc)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, delta, invert }: { label: string; value: string; delta: number | null; invert?: boolean }) {
  const isGood = delta == null || delta === 0 ? null : invert ? delta < 0 : delta > 0;
  const Icon = (delta ?? 0) > 0 ? TrendingUp : TrendingDown;
  return (
    <div className="luxury-card p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-xl mt-1">{value}</p>
      {delta != null && delta !== 0 && (
        <p className={`mt-1 text-xs flex items-center gap-1 ${isGood ? "text-emerald-400" : "text-destructive"}`}>
          <Icon className="size-3" /> {Math.abs(delta).toFixed(1)} desde a 1ª avaliação
        </p>
      )}
    </div>
  );
}

function fmt(v: number | null | undefined, suf = "") {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return Number(v).toFixed(1) + suf;
}
function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function diff(a: number | null, b: number | null): number | null {
  if (a == null || b == null) return null;
  return Number(a) - Number(b);
}
function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

async function svgToPng(svg: SVGSVGElement, width: number, height: number): Promise<string | null> {
  try {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));
    const xml = new XMLSerializer().serializeToString(clone);
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    const img = new Image();
    img.src = `data:image/svg+xml;base64,${svg64}`;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#0A0A0A";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  } catch { return null; }
}
