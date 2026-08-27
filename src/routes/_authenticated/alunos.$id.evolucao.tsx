import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useRef, useState } from "react";
import { TrendingUp, TrendingDown, Download, FileText } from "lucide-react";
import { useAlunoBasic, useEvolucao, useFotos } from "@/lib/queries/aluno-modulos";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsSkeleton } from "@/components/ui/list-skeleton";
import { toast } from "sonner";
import { BodyMuscleMap } from "@/components/BodyMuscleMap";
import { fetchPersonalBranding, urlToDataUrl } from "@/lib/pdf/utils";
import { supabase } from "@/integrations/supabase/client";

const FOTOS_BUCKET = "evolucao-fotos";
const ANGULOS: Array<{ value: string; label: string }> = [
  { value: "frente", label: "Frente" },
  { value: "lado", label: "Lateral" },
  { value: "costas", label: "Costas" },
];

const EvolucaoChart = lazy(() => import("@/components/EvolucaoChart"));

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
  massa_magra: number | null; massa_gorda: number | null; imc: number | null; rcq: number | null;
  circ_pescoco: number | null; circ_ombro: number | null; circ_torax: number | null;
  circ_cintura: number | null; circ_abdomen: number | null; circ_quadril: number | null;
  circ_braco_d: number | null; circ_braco_e: number | null;
  circ_antebraco_d: number | null; circ_antebraco_e: number | null;
  circ_coxa_d: number | null; circ_coxa_e: number | null;
  circ_panturrilha_d: number | null; circ_panturrilha_e: number | null;
};

// Cada tupla é [sufixo da chave circ_<sufixo>, rótulo exibido] — mesma convenção do PDF.
const CIRC_ROWS: Array<[string, string]> = [
  ["pescoco", "Pescoço"], ["ombro", "Ombro"], ["torax", "Tórax"],
  ["cintura", "Cintura"], ["abdomen", "Abdômen"], ["quadril", "Quadril"],
  ["braco_d", "Braço D."], ["braco_e", "Braço E."],
  ["antebraco_d", "Antebraço D."], ["antebraco_e", "Antebraço E."],
  ["coxa_d", "Coxa D."], ["coxa_e", "Coxa E."],
  ["panturrilha_d", "Panturrilha D."], ["panturrilha_e", "Panturrilha E."],
];

function diasEntre(recente: string, antiga: string): number {
  return Math.round((new Date(`${recente}T00:00:00`).getTime() - new Date(`${antiga}T00:00:00`).getTime()) / 86400000);
}
function fmtPeriodo(dias: number): string {
  if (dias <= 0) return "—";
  if (dias < 60) return `${dias} dia${dias === 1 ? "" : "s"}`;
  const meses = Math.round(dias / 30);
  return `${meses} ${meses === 1 ? "mês" : "meses"}`;
}
function avg(a: number | null, b: number | null): number | null {
  if (a == null && b == null) return null;
  if (a == null) return b;
  if (b == null) return a;
  return (a + b) / 2;
}

function EvolucaoPage() {
  const { id } = Route.useParams();
  const chartRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const { data: aluno } = useAlunoBasic(id);
  const { data, isLoading, isError, refetch } = useEvolucao<Row>(id);
  const { data: fotos } = useFotos(id);

  // Sessão de fotos mais antiga e mais recente (só faz sentido comparar se houver 2+ datas distintas).
  const fotosComparacao = useMemo(() => {
    const lista = fotos ?? [];
    const datas = Array.from(new Set(lista.map((f: any) => f.data_foto as string))).sort();
    if (datas.length < 2) return null;
    const dataAntes = datas[0], dataDepois = datas[datas.length - 1];
    return ANGULOS.map((a) => ({
      angulo: a.value,
      label: a.label,
      antes: lista.find((f: any) => f.data_foto === dataAntes && f.angulo === a.value) ?? null,
      depois: lista.find((f: any) => f.data_foto === dataDepois && f.angulo === a.value) ?? null,
    })).filter((r) => r.antes || r.depois);
  }, [fotos]);

  // Histórico mais recente primeiro, com dias desde a avaliação anterior (data já vem ordenada ascendente).
  const historico = useMemo(() => (data ?? []).map((r, i, arr) => ({
    ...r,
    intervaloDias: i > 0 ? diasEntre(r.data_avaliacao, arr[i - 1].data_avaliacao) : null,
  })).reverse(), [data]);

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
    const periodoDias = diasEntre(last.data_avaliacao, first.data_avaliacao);
    const intervaloMedioDias = data.length > 1 ? periodoDias / (data.length - 1) : null;
    const circRows = CIRC_ROWS.map(([key, label]) => {
      const fKey = `circ_${key}` as keyof Row;
      const f = first[fKey] != null ? Number(first[fKey]) : null;
      const l = last[fKey] != null ? Number(last[fKey]) : null;
      if (f == null && l == null) return null;
      const d = f != null && l != null ? l - f : null;
      return { label, f, l, d };
    }).filter((r): r is { label: string; f: number | null; l: number | null; d: number | null } => r !== null);
    return {
      first, last, periodoDias, intervaloMedioDias, circRows,
      dPeso: diff(last.peso, first.peso),
      dGord: diff(last.percentual_gordura, first.percentual_gordura),
      dMM: diff(last.massa_magra, first.massa_magra),
      dMG: diff(last.massa_gorda, first.massa_gorda),
      dIMC: diff(last.imc, first.imc),
      dRCQ: diff(last.rcq, first.rcq),
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
        data: r.data_avaliacao,
        peso: numOrNull(r.peso),
        gordura: numOrNull(r.percentual_gordura),
        massa_magra: numOrNull(r.massa_magra),
        massa_gorda: numOrNull(r.massa_gorda),
        imc: numOrNull(r.imc),
        rcq: numOrNull(r.rcq),
        circ_pescoco: numOrNull(r.circ_pescoco),
        circ_ombro: numOrNull(r.circ_ombro),
        circ_torax: numOrNull(r.circ_torax),
        circ_cintura: numOrNull(r.circ_cintura),
        circ_abdomen: numOrNull(r.circ_abdomen),
        circ_quadril: numOrNull(r.circ_quadril),
        circ_braco_d: numOrNull(r.circ_braco_d),
        circ_braco_e: numOrNull(r.circ_braco_e),
        circ_antebraco_d: numOrNull(r.circ_antebraco_d),
        circ_antebraco_e: numOrNull(r.circ_antebraco_e),
        circ_coxa_d: numOrNull(r.circ_coxa_d),
        circ_coxa_e: numOrNull(r.circ_coxa_e),
        circ_panturrilha_d: numOrNull(r.circ_panturrilha_d),
        circ_panturrilha_e: numOrNull(r.circ_panturrilha_e),
      }));
      const periodo = { de: formatDate(data[0].data_avaliacao), ate: formatDate(data[data.length - 1].data_avaliacao) };

      const [personal, fotosPdf, [{ pdf }, { EvolucaoPDF }]] = await Promise.all([
        fetchPersonalBranding((aluno as any)?.personal_id),
        fotosComparacao
          ? Promise.all(fotosComparacao.map(async (fc) => ({
              angulo: fc.angulo,
              label: fc.label,
              antes: await resolveFotoParaPdf(fc.antes),
              depois: await resolveFotoParaPdf(fc.depois),
            })))
          : Promise.resolve([]),
        Promise.all([import("@react-pdf/renderer"), import("@/lib/pdf/EvolucaoPDF")]),
      ]);
      const blob = await pdf(
        <EvolucaoPDF
          alunoNome={aluno?.full_name ?? "Aluno"}
          fotoUrl={aluno?.photo_url ?? null}
          periodo={periodo}
          registros={registros}
          chartImage={chartImage}
          fotos={fotosPdf}
          personal={personal}
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
        <div className="luxury-card p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-3">Resumo do acompanhamento</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="font-display text-xl">{data.length}</p>
              <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Avaliações</span>
            </div>
            <div>
              <p className="font-display text-xl">{fmtPeriodo(summary.periodoDias)}</p>
              <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Período total</span>
            </div>
            <div>
              <p className="font-display text-xl">{summary.intervaloMedioDias != null ? fmtPeriodo(Math.round(summary.intervaloMedioDias)) : "—"}</p>
              <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Intervalo médio</span>
            </div>
          </div>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard label="Peso" value={fmt(summary.last.peso, " kg")} delta={summary.dPeso} invert />
          <StatCard label="% Gordura" value={fmt(summary.last.percentual_gordura, "%")} delta={summary.dGord} invert />
          <StatCard label="Massa Magra" value={fmt(summary.last.massa_magra, " kg")} delta={summary.dMM} />
          <StatCard label="Massa Gorda" value={fmt(summary.last.massa_gorda, " kg")} delta={summary.dMG} invert />
          <StatCard label="IMC" value={fmt(summary.last.imc)} delta={summary.dIMC} invert />
          <StatCard label="RCQ" value={fmt(summary.last.rcq, "", 2)} delta={summary.dRCQ} invert digits={2} />
        </div>
      )}

      {summary && (
        <div className="luxury-card p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Heatmap Corporal (1ª avaliação vs atual)</p>
          <p className="text-[11px] text-muted-foreground mb-2">Verde = reduziu · Vermelho = aumentou · Cinza = estável</p>
          <BodyMuscleMap
            heatmap={{
              abdomen: trend(summary.last.circ_abdomen ?? summary.last.circ_cintura, summary.first.circ_abdomen ?? summary.first.circ_cintura),
              lombar: trend(summary.last.circ_cintura, summary.first.circ_cintura),
              gluteo: trend(summary.last.circ_quadril, summary.first.circ_quadril),
              peito: trend(summary.last.circ_torax, summary.first.circ_torax),
              quadriceps: trend(avg(summary.last.circ_coxa_d, summary.last.circ_coxa_e), avg(summary.first.circ_coxa_d, summary.first.circ_coxa_e)),
              posterior: trend(avg(summary.last.circ_coxa_d, summary.last.circ_coxa_e), avg(summary.first.circ_coxa_d, summary.first.circ_coxa_e)),
              biceps: trend(avg(summary.last.circ_braco_d, summary.last.circ_braco_e), avg(summary.first.circ_braco_d, summary.first.circ_braco_e)),
              triceps: trend(avg(summary.last.circ_braco_d, summary.last.circ_braco_e), avg(summary.first.circ_braco_d, summary.first.circ_braco_e)),
            }}
          />
        </div>
      )}

      {summary && summary.circRows.length > 0 && (
        <div className="luxury-card p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-3">Comparação de Circunferências</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2">Medida</th>
                  <th className="py-2 text-right">1ª Aval.</th>
                  <th className="py-2 text-right">Última</th>
                  <th className="py-2 text-right">Variação</th>
                </tr>
              </thead>
              <tbody>
                {summary.circRows.map((r) => (
                  <tr key={r.label} className="border-b border-border/40">
                    <td className="py-2">{r.label}</td>
                    <td className="py-2 text-right text-muted-foreground">{r.f != null ? `${r.f.toFixed(1)} cm` : "—"}</td>
                    <td className="py-2 text-right">{r.l != null ? `${r.l.toFixed(1)} cm` : "—"}</td>
                    <td className={`py-2 text-right ${r.d == null ? "text-muted-foreground" : r.d < 0 ? "text-emerald-400" : r.d > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {r.d != null ? `${r.d > 0 ? "+" : ""}${r.d.toFixed(1)} cm` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="luxury-card p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-primary mb-3">Tendência</p>
        <div ref={chartRef} className="h-72 w-full">
          <Suspense fallback={<Skeleton className="h-full w-full rounded-xl" />}>
            <EvolucaoChart data={chartData} />
          </Suspense>
        </div>
      </div>

      <div className="luxury-card p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-primary mb-3">Histórico</p>

        {/* Celular: cards */}
        <div className="space-y-2 sm:hidden">
          {historico.map((r) => (
            <div key={r.id} className="rounded-lg border border-border/40 p-3">
              <div className="flex items-baseline justify-between">
                <p className="font-medium">{formatDate(r.data_avaliacao)}</p>
                <span className="text-[10px] text-muted-foreground">{r.intervaloDias != null ? `+${r.intervaloDias}d` : "1ª avaliação"}</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                {[
                  ["Peso", fmt(r.peso, " kg")], ["% Gord.", fmt(r.percentual_gordura, "%")], ["IMC", fmt(r.imc)],
                  ["M. Magra", fmt(r.massa_magra, " kg")], ["M. Gorda", fmt(r.massa_gorda, " kg")],
                ].map(([l, val]) => (
                  <div key={l}>
                    <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">{l}</span>
                    <span className="text-sm font-medium">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: tabela */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-2">Data</th><th className="py-2 text-right">Intervalo</th><th className="py-2 text-right">Peso</th>
                <th className="py-2 text-right">% Gord.</th><th className="py-2 text-right">M. Magra</th>
                <th className="py-2 text-right">M. Gorda</th><th className="py-2 text-right">IMC</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((r) => (
                <tr key={r.id} className="border-b border-border/40">
                  <td className="py-2">{formatDate(r.data_avaliacao)}</td>
                  <td className="py-2 text-right text-muted-foreground">{r.intervaloDias != null ? `${r.intervaloDias}d` : "1ª"}</td>
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
    </div>
  );
}

function StatCard({ label, value, delta, invert, digits = 1 }: { label: string; value: string; delta: number | null; invert?: boolean; digits?: number }) {
  const isGood = delta == null || delta === 0 ? null : invert ? delta < 0 : delta > 0;
  const Icon = (delta ?? 0) > 0 ? TrendingUp : TrendingDown;
  return (
    <div className="luxury-card p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-xl mt-1">{value}</p>
      {delta != null && delta !== 0 && (
        <p className={`mt-1 text-xs flex items-center gap-1 ${isGood ? "text-emerald-400" : "text-destructive"}`}>
          <Icon className="size-3" /> {Math.abs(delta).toFixed(digits)} desde a 1ª avaliação
        </p>
      )}
    </div>
  );
}

function fmt(v: number | null | undefined, suf = "", digits = 1) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return Number(v).toFixed(digits) + suf;
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

/** Gera signed URL do Storage e converte pra dataURL — react-pdf não acessa bucket privado direto. */
async function resolveFotoParaPdf(f: any): Promise<{ url: string; data: string } | null> {
  if (!f) return null;
  const { data: signed } = await supabase.storage.from(FOTOS_BUCKET).createSignedUrl(f.storage_path, 3600);
  const dataUrl = await urlToDataUrl(signed?.signedUrl ?? null);
  if (!dataUrl) return null;
  return { url: dataUrl, data: f.data_foto };
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
