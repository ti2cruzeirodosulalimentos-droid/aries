import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { CoverContent, type PersonalBranding } from "@/lib/pdf/Cover";

const colors = {
  bg: "#0A0A0A", card: "#161616", gold: "#D4AF37", goldLight: "#F5D76E", text: "#FFFFFF",
  muted: "#9A9A9A", border: "#2A2417", good: "#34D399", bad: "#F87171",
};

const s = StyleSheet.create({
  page: { backgroundColor: colors.bg, color: colors.text, padding: 36, fontSize: 10, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottom: `0.5pt solid ${colors.border}`, paddingBottom: 8, marginBottom: 16 },
  brand: { color: colors.gold, fontSize: 12, letterSpacing: 4, fontFamily: "Helvetica-Bold" },
  sub: { color: colors.muted, fontSize: 8 },
  title: { fontSize: 22, color: colors.gold, fontFamily: "Helvetica-Bold", marginTop: 6 },
  alunoLine: { color: colors.muted, fontSize: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 13, color: colors.gold, fontFamily: "Helvetica-Bold", marginBottom: 8, marginTop: 14, letterSpacing: 1.5 },
  sectionHint: { color: colors.muted, fontSize: 8, marginTop: -6, marginBottom: 10 },
  card: { backgroundColor: colors.card, borderRadius: 6, padding: 12, marginBottom: 8, border: `0.5pt solid ${colors.border}` },
  row: { flexDirection: "row" },
  statBox: { flex: 1, padding: 10, alignItems: "center", borderRight: `0.5pt solid ${colors.border}` },
  statLabel: { color: colors.gold, fontSize: 7, letterSpacing: 1.5, marginBottom: 4, textAlign: "center" },
  statValue: { fontSize: 16, color: colors.text, fontFamily: "Helvetica-Bold" },
  delta: { fontSize: 8, marginTop: 4 },
  th: { color: colors.gold, fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 1, textTransform: "uppercase", paddingVertical: 4 },
  td: { color: colors.text, fontSize: 9, paddingVertical: 4, borderTop: `0.5pt solid ${colors.border}` },
  tdMuted: { color: colors.muted, fontSize: 9, paddingVertical: 4, borderTop: `0.5pt solid ${colors.border}` },
  chartImg: { width: "100%", height: 220, marginBottom: 10 },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, borderTop: `0.5pt solid ${colors.border}`, paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
  footerText: { color: colors.muted, fontSize: 7 },
  emptyNote: { color: colors.muted, fontSize: 9 },
  resumoText: { color: colors.text, fontSize: 10, lineHeight: 1.5, marginBottom: 4 },
  fotoBlock: { marginBottom: 12 },
  fotoCompareRow: { flexDirection: "row", gap: 10 },
  fotoCol: { flex: 1, alignItems: "center" },
  fotoTag: { color: colors.gold, fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 1.5, marginBottom: 4, textTransform: "uppercase" },
  fotoImg: { width: "100%", height: 130, objectFit: "cover", borderRadius: 6, border: `0.5pt solid ${colors.border}` },
  fotoPlaceholder: { width: "100%", height: 130, borderRadius: 6, border: `0.5pt dashed ${colors.border}`, alignItems: "center", justifyContent: "center" },
  fotoDate: { color: colors.muted, fontSize: 7, marginTop: 4 },
});

// Cada tupla é [sufixo da chave circ_<sufixo>, rótulo exibido].
const CIRC_ROWS: Array<[string, string]> = [
  ["pescoco", "Pescoço"], ["ombro", "Ombro"], ["torax", "Tórax"],
  ["cintura", "Cintura"], ["abdomen", "Abdômen"], ["quadril", "Quadril"],
  ["braco_d", "Braço D."], ["braco_e", "Braço E."],
  ["antebraco_d", "Antebraço D."], ["antebraco_e", "Antebraço E."],
  ["coxa_d", "Coxa D."], ["coxa_e", "Coxa E."],
  ["panturrilha_d", "Panturrilha D."], ["panturrilha_e", "Panturrilha E."],
];

export interface EvolucaoRegistro {
  /** Data em ISO (yyyy-mm-dd) — necessário pra calcular intervalos entre avaliações. */
  data: string;
  peso: number | null;
  gordura: number | null;
  massa_magra: number | null;
  massa_gorda: number | null;
  imc: number | null;
  rcq: number | null;
  circ_pescoco: number | null;
  circ_ombro: number | null;
  circ_torax: number | null;
  circ_cintura: number | null;
  circ_abdomen: number | null;
  circ_quadril: number | null;
  circ_braco_d: number | null;
  circ_braco_e: number | null;
  circ_antebraco_d: number | null;
  circ_antebraco_e: number | null;
  circ_coxa_d: number | null;
  circ_coxa_e: number | null;
  circ_panturrilha_d: number | null;
  circ_panturrilha_e: number | null;
}

export interface FotoComparacao {
  angulo: string;
  label: string;
  antes: { url: string; data: string } | null;
  depois: { url: string; data: string } | null;
}

export interface EvolucaoPDFProps {
  alunoNome: string;
  fotoUrl?: string | null;
  periodo: { de: string; ate: string };
  /** Ordenados da avaliação mais recente pra mais antiga (registros[0] = última). */
  registros: EvolucaoRegistro[];
  chartImage?: string | null; // dataURL PNG
  /** Fotos de evolução (antes/depois) por ângulo — página omitida se vazio. */
  fotos?: FotoComparacao[];
  personal?: PersonalBranding | null;
}

function fmt(v: number | null | undefined, suf = "", digits = 1) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  return Number(v).toFixed(digits) + suf;
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function diasEntre(recente: string, antiga: string): number {
  return Math.round((new Date(`${recente}T00:00:00`).getTime() - new Date(`${antiga}T00:00:00`).getTime()) / 86400000);
}
function fmtPeriodo(dias: number): string {
  if (dias <= 0) return "—";
  if (dias < 60) return `${dias} dia${dias === 1 ? "" : "s"}`;
  const meses = Math.round(dias / 30);
  return `${meses} ${meses === 1 ? "mês" : "meses"}`;
}
function delta(curr: number | null, prev: number | null, invert = false) {
  if (curr == null || prev == null) return null;
  const d = curr - prev;
  const good = invert ? d < 0 : d > 0;
  return { d, good };
}

// Parágrafo introdutório puramente descritivo (só reafirma os números já calculados, sem juízo clínico).
function gerarResumo(
  periodo: { de: string; ate: string }, periodoDias: number,
  dPeso: ReturnType<typeof delta>, dPG: ReturnType<typeof delta>, dMM: ReturnType<typeof delta>,
): string {
  if (periodoDias <= 0) return "";
  const partes: string[] = [];
  if (dPeso) partes.push(`o peso ${dPeso.d < 0 ? "reduziu" : dPeso.d > 0 ? "aumentou" : "manteve-se estável em"} ${Math.abs(dPeso.d).toFixed(1)} kg`);
  if (dPG) partes.push(`o percentual de gordura ${dPG.d < 0 ? "reduziu" : dPG.d > 0 ? "aumentou" : "manteve-se estável em"} ${Math.abs(dPG.d).toFixed(1)} p.p.`);
  if (dMM) partes.push(`a massa magra ${dMM.d > 0 ? "aumentou" : dMM.d < 0 ? "reduziu" : "manteve-se estável em"} ${Math.abs(dMM.d).toFixed(1)} kg`);
  if (!partes.length) return "";
  const frase = partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
  return `Ao longo de ${fmtPeriodo(periodoDias)} (${periodo.de} a ${periodo.ate}), ${frase}.`;
}

function FotoCompareBlock({ label, antes, depois }: { label: string; antes: FotoComparacao["antes"]; depois: FotoComparacao["depois"] }) {
  return (
    <View style={s.fotoBlock}>
      <Text style={[s.sectionTitle, { marginTop: 0, marginBottom: 6, fontSize: 11 }]}>{label.toUpperCase()}</Text>
      <View style={s.fotoCompareRow}>
        <View style={s.fotoCol}>
          <Text style={s.fotoTag}>Antes</Text>
          {antes ? <Image src={antes.url} style={s.fotoImg} /> : <View style={s.fotoPlaceholder}><Text style={{ color: colors.muted, fontSize: 8 }}>Sem foto</Text></View>}
          <Text style={s.fotoDate}>{antes ? fmtDate(antes.data) : "—"}</Text>
        </View>
        <View style={s.fotoCol}>
          <Text style={s.fotoTag}>Depois</Text>
          {depois ? <Image src={depois.url} style={s.fotoImg} /> : <View style={s.fotoPlaceholder}><Text style={{ color: colors.muted, fontSize: 8 }}>Sem foto</Text></View>}
          <Text style={s.fotoDate}>{depois ? fmtDate(depois.data) : "—"}</Text>
        </View>
      </View>
    </View>
  );
}

function PageFooter({ aluno }: { aluno: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{aluno}</Text>
      <Text style={s.footerText}>ARIÉS · Transformando metas em resultados</Text>
      <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  );
}

function PageHeader({ fotoUrl }: { fotoUrl?: string | null }) {
  return (
    <View style={s.header}>
      <View>
        <Text style={s.brand}>ARIÉS</Text>
        <Text style={s.sub}>Transformando metas em resultados</Text>
      </View>
      {fotoUrl ? <Image src={fotoUrl} style={{ width: 50, height: 50, borderRadius: 25, border: `1pt solid ${colors.gold}` }} /> : null}
    </View>
  );
}

function SummaryBox({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View style={[s.statBox, isLast ? { borderRight: 0 } : null]}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

function StatBox({ label, curr, d, suf, digits, isLast }: {
  label: string; curr: number | null | undefined; d: ReturnType<typeof delta>; suf: string; digits: number; isLast?: boolean;
}) {
  return (
    <View style={[s.statBox, isLast ? { borderRight: 0 } : null]}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{fmt(curr, suf, digits)}</Text>
      {d && (
        <Text style={[s.delta, { color: d.good ? colors.good : colors.bad }]}>
          {d.d > 0 ? "+" : "-"}{Math.abs(d.d).toFixed(digits)}{suf}
        </Text>
      )}
    </View>
  );
}

function RateCard({ label, rate, suf, good, isLast }: { label: string; rate: number | null; suf: string; good: boolean | null; isLast?: boolean }) {
  return (
    <View style={[s.card, { flex: 1, alignItems: "center", paddingVertical: 14, marginBottom: 0 }, isLast ? {} : { marginRight: 10 }]}>
      <Text style={s.statLabel}>{label.toUpperCase()}</Text>
      <Text style={[s.statValue, { color: good == null ? colors.text : good ? colors.good : colors.bad }]}>
        {rate != null ? `${rate > 0 ? "+" : ""}${rate.toFixed(2)}${suf}` : "—"}
      </Text>
    </View>
  );
}

export function EvolucaoPDF({ alunoNome, fotoUrl, periodo, registros, chartImage, fotos, personal }: EvolucaoPDFProps) {
  // registros[0] = mais recente, último índice = mais antiga.
  const first = registros[registros.length - 1] ?? null;
  const last = registros[0] ?? null;

  const dPeso = delta(last?.peso ?? null, first?.peso ?? null, true);
  const dPG = delta(last?.gordura ?? null, first?.gordura ?? null, true);
  const dMM = delta(last?.massa_magra ?? null, first?.massa_magra ?? null, false);
  const dMG = delta(last?.massa_gorda ?? null, first?.massa_gorda ?? null, true);
  const dIMC = delta(last?.imc ?? null, first?.imc ?? null, true);
  const dRCQ = delta(last?.rcq ?? null, first?.rcq ?? null, true);

  const periodoDias = first && last ? diasEntre(last.data, first.data) : 0;
  const semanas = periodoDias > 0 ? periodoDias / 7 : null;
  const intervaloMedioDias = registros.length > 1 ? periodoDias / (registros.length - 1) : null;

  const taxaPeso = semanas && dPeso ? dPeso.d / semanas : null;
  const taxaGordura = semanas && dPG ? dPG.d / semanas : null;
  const taxaMM = semanas && dMM ? dMM.d / semanas : null;

  const circRows = CIRC_ROWS.map(([key, label]) => {
    const fKey = `circ_${key}` as keyof EvolucaoRegistro;
    const f = first?.[fKey] != null ? Number(first[fKey]) : null;
    const l = last?.[fKey] != null ? Number(last[fKey]) : null;
    if (f == null && l == null) return null;
    const d = f != null && l != null ? l - f : null;
    const pct = d != null && f ? (d / f) * 100 : null;
    return { label, f, l, d, pct };
  }).filter((r): r is { label: string; f: number | null; l: number | null; d: number | null; pct: number | null } => r !== null);

  // Dias desde a avaliação anterior — registros[i] é mais novo que registros[i+1].
  const intervalos = registros.map((r, i) => (i < registros.length - 1 ? diasEntre(r.data, registros[i + 1].data) : null));

  const resumo = gerarResumo(periodo, periodoDias, dPeso, dPG, dMM);
  const fotosValidas = (fotos ?? []).filter((f) => f.antes || f.depois);

  return (
    <Document title={`Evolução — ${alunoNome}`} author="ARIÉS">
      {/* CAPA */}
      <Page size="A4" style={s.page}>
        <CoverContent
          personal={personal}
          overline="RELATÓRIO DE EVOLUÇÃO"
          title="Transformação em Números"
          personName={alunoNome}
          personMeta={`Período de ${periodo.de} a ${periodo.ate}`}
          personPhotoUrl={fotoUrl}
        />
      </Page>

      {/* RESUMO, VARIAÇÃO TOTAL E RITMO */}
      <Page size="A4" style={s.page}>
        <PageHeader fotoUrl={fotoUrl} />
        <Text style={s.title}>Relatório de Evolução</Text>
        <Text style={s.alunoLine}>{alunoNome} · Período {periodo.de} a {periodo.ate} · {registros.length} avaliações</Text>
        {resumo ? <Text style={s.resumoText}>{resumo}</Text> : null}

        <Text style={s.sectionTitle}>RESUMO DO ACOMPANHAMENTO</Text>
        <View style={[s.card, s.row, { padding: 0 }]}>
          <SummaryBox label="AVALIAÇÕES" value={String(registros.length)} />
          <SummaryBox label="PERÍODO TOTAL" value={fmtPeriodo(periodoDias)} />
          <SummaryBox label="INTERVALO MÉDIO" value={intervaloMedioDias != null ? fmtPeriodo(Math.round(intervaloMedioDias)) : "—"} isLast />
        </View>

        <Text style={s.sectionTitle}>VARIAÇÃO TOTAL</Text>
        <View style={[s.card, s.row, { padding: 0, marginBottom: 4 }]}>
          <StatBox label="PESO" curr={last?.peso} d={dPeso} suf=" kg" digits={1} />
          <StatBox label="% GORDURA" curr={last?.gordura} d={dPG} suf="%" digits={1} />
          <StatBox label="MASSA MAGRA" curr={last?.massa_magra} d={dMM} suf=" kg" digits={1} isLast />
        </View>
        <View style={[s.card, s.row, { padding: 0 }]}>
          <StatBox label="MASSA GORDA" curr={last?.massa_gorda} d={dMG} suf=" kg" digits={1} />
          <StatBox label="IMC" curr={last?.imc} d={dIMC} suf="" digits={1} />
          <StatBox label="RCQ" curr={last?.rcq} d={dRCQ} suf="" digits={2} isLast />
        </View>

        <Text style={s.sectionTitle}>RITMO DE EVOLUÇÃO</Text>
        <Text style={s.sectionHint}>Média de variação por semana ao longo de todo o período</Text>
        <View style={[s.row]}>
          <RateCard label="Peso" rate={taxaPeso} suf=" kg/sem" good={dPeso?.good ?? null} />
          <RateCard label="% Gordura" rate={taxaGordura} suf="%/sem" good={dPG?.good ?? null} />
          <RateCard label="Massa Magra" rate={taxaMM} suf=" kg/sem" good={dMM?.good ?? null} isLast />
        </View>

        <PageFooter aluno={alunoNome} />
      </Page>

      {/* EVOLUÇÃO EM FOTOS */}
      {fotosValidas.length > 0 && (
        <Page size="A4" style={s.page}>
          <PageHeader fotoUrl={fotoUrl} />
          <Text style={s.sectionTitle}>EVOLUÇÃO EM FOTOS</Text>
          <Text style={s.sectionHint}>{fmtDate(fotosValidas[0].antes?.data ?? fotosValidas[0].depois?.data)} → {fmtDate(fotosValidas[0].depois?.data ?? fotosValidas[0].antes?.data)}</Text>
          {fotosValidas.map((f) => (
            <FotoCompareBlock key={f.angulo} label={f.label} antes={f.antes} depois={f.depois} />
          ))}
          <PageFooter aluno={alunoNome} />
        </Page>
      )}

      {/* COMPARAÇÃO DE CIRCUNFERÊNCIAS */}
      <Page size="A4" style={s.page}>
        <PageHeader fotoUrl={fotoUrl} />
        <Text style={s.sectionTitle}>COMPARAÇÃO DE CIRCUNFERÊNCIAS</Text>
        <Text style={s.sectionHint}>{fmtDate(first?.data)} → {fmtDate(last?.data)}</Text>

        {circRows.length ? (
          <View style={s.card}>
            <View style={s.row}>
              <Text style={[s.th, { flex: 1.6 }]}>Medida</Text>
              <Text style={[s.th, { flex: 1, textAlign: "right" }]}>1ª Aval.</Text>
              <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Última</Text>
              <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Variação</Text>
              <Text style={[s.th, { flex: 1, textAlign: "right" }]}>%</Text>
            </View>
            {circRows.map((r) => (
              <View key={r.label} style={s.row}>
                <Text style={[s.td, { flex: 1.6 }]}>{r.label}</Text>
                <Text style={[s.tdMuted, { flex: 1, textAlign: "right" }]}>{r.f != null ? `${r.f.toFixed(1)} cm` : "—"}</Text>
                <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{r.l != null ? `${r.l.toFixed(1)} cm` : "—"}</Text>
                <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{r.d != null ? `${r.d > 0 ? "+" : ""}${r.d.toFixed(1)} cm` : "—"}</Text>
                <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{r.pct != null ? `${r.pct > 0 ? "+" : ""}${r.pct.toFixed(1)}%` : "—"}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={s.card}>
            <Text style={s.emptyNote}>Nenhuma circunferência foi registrada nas avaliações deste período.</Text>
          </View>
        )}

        <PageFooter aluno={alunoNome} />
      </Page>

      {/* GRÁFICO E HISTÓRICO COMPLETO */}
      <Page size="A4" style={s.page}>
        <PageHeader fotoUrl={fotoUrl} />

        {chartImage ? (
          <>
            <Text style={s.sectionTitle}>GRÁFICO DE EVOLUÇÃO</Text>
            <Image src={chartImage} style={s.chartImg} />
          </>
        ) : null}

        <Text style={s.sectionTitle}>HISTÓRICO COMPLETO</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={[s.th, { flex: 1.2 }]}>Data</Text>
            <Text style={[s.th, { flex: 0.9, textAlign: "right" }]}>Intervalo</Text>
            <Text style={[s.th, { flex: 0.9, textAlign: "right" }]}>Peso</Text>
            <Text style={[s.th, { flex: 0.9, textAlign: "right" }]}>% Gord.</Text>
            <Text style={[s.th, { flex: 1, textAlign: "right" }]}>M. Magra</Text>
            <Text style={[s.th, { flex: 0.8, textAlign: "right" }]}>IMC</Text>
          </View>
          {registros.map((r, i) => (
            <View key={r.data} style={s.row}>
              <Text style={[s.td, { flex: 1.2 }]}>{fmtDate(r.data)}</Text>
              <Text style={[s.tdMuted, { flex: 0.9, textAlign: "right" }]}>{intervalos[i] != null ? `${intervalos[i]}d` : "1ª"}</Text>
              <Text style={[s.td, { flex: 0.9, textAlign: "right" }]}>{fmt(r.peso, " kg")}</Text>
              <Text style={[s.td, { flex: 0.9, textAlign: "right" }]}>{fmt(r.gordura, "%")}</Text>
              <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{fmt(r.massa_magra, " kg")}</Text>
              <Text style={[s.td, { flex: 0.8, textAlign: "right" }]}>{fmt(r.imc)}</Text>
            </View>
          ))}
        </View>

        <PageFooter aluno={alunoNome} />
      </Page>
    </Document>
  );
}
