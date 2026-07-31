import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { PersonalBranding } from "@/lib/pdf/AvaliacaoPDF";

const colors = {
  bg: "#0A0A0A", card: "#161616", gold: "#D4AF37", goldLight: "#F5D76E", text: "#FFFFFF",
  muted: "#9A9A9A", border: "#2A2417", good: "#34D399", bad: "#F87171",
};

const s = StyleSheet.create({
  page: { backgroundColor: colors.bg, color: colors.text, padding: 36, fontSize: 10, fontFamily: "Helvetica" },
  // Capa
  cover: { flex: 1, justifyContent: "space-between" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandLogo: { height: 40, maxWidth: 200, objectFit: "contain" },
  brandText: { color: colors.gold, fontSize: 14, letterSpacing: 4, fontFamily: "Helvetica-Bold" },
  brandLogoDefault: { width: 44, height: 44, borderRadius: 22, objectFit: "cover" },
  coverMiddle: { alignItems: "center" },
  coverTitle: { fontSize: 36, color: colors.gold, fontFamily: "Helvetica-Bold", textAlign: "center" },
  coverSubtitle: { fontSize: 12, color: colors.muted, marginTop: 8, letterSpacing: 6, textAlign: "center" },
  coverPhoto: { width: 140, height: 140, borderRadius: 70, marginTop: 28, marginBottom: 18, border: `2pt solid ${colors.gold}` },
  coverName: { fontSize: 22, color: colors.text, marginTop: 16, fontFamily: "Helvetica-Bold", textAlign: "center" },
  coverMeta: { fontSize: 10, color: colors.muted, marginTop: 4, textAlign: "center" },
  coverFooter: { borderTop: `0.5pt solid ${colors.border}`, paddingTop: 10, color: colors.muted, fontSize: 8, textAlign: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottom: `0.5pt solid ${colors.border}`, paddingBottom: 8, marginBottom: 16 },
  brand: { color: colors.gold, fontSize: 12, letterSpacing: 4, fontFamily: "Helvetica-Bold" },
  sub: { color: colors.muted, fontSize: 8 },
  title: { fontSize: 22, color: colors.gold, fontFamily: "Helvetica-Bold", marginTop: 6 },
  alunoLine: { color: colors.muted, fontSize: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 13, color: colors.gold, fontFamily: "Helvetica-Bold", marginBottom: 8, marginTop: 14, letterSpacing: 1.5 },
  card: { backgroundColor: colors.card, borderRadius: 6, padding: 12, marginBottom: 8, border: `0.5pt solid ${colors.border}` },
  row: { flexDirection: "row" },
  statBox: { flex: 1, padding: 10, alignItems: "center", borderRight: `0.5pt solid ${colors.border}` },
  statLabel: { color: colors.gold, fontSize: 7, letterSpacing: 2, marginBottom: 4 },
  statValue: { fontSize: 16, color: colors.text, fontFamily: "Helvetica-Bold" },
  delta: { fontSize: 8, marginTop: 4 },
  th: { color: colors.gold, fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 1, textTransform: "uppercase", paddingVertical: 4 },
  td: { color: colors.text, fontSize: 9, paddingVertical: 4, borderTop: `0.5pt solid ${colors.border}` },
  chartImg: { width: "100%", height: 220, marginBottom: 10 },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, borderTop: `0.5pt solid ${colors.border}`, paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
  footerText: { color: colors.muted, fontSize: 7 },
});

export interface EvolucaoPDFProps {
  alunoNome: string;
  fotoUrl?: string | null;
  periodo: { de: string; ate: string };
  registros: Array<{
    data: string; peso: number | null; gordura: number | null; massa_magra: number | null; imc: number | null;
  }>;
  chartImage?: string | null; // dataURL PNG
  personal?: PersonalBranding | null;
}

function fmt(v: number | null | undefined, suf = "") {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  return Number(v).toFixed(1) + suf;
}
function delta(curr: number | null, prev: number | null, invert = false) {
  if (curr == null || prev == null) return null;
  const d = curr - prev;
  const good = invert ? d < 0 : d > 0;
  return { d, good };
}

export function EvolucaoPDF({ alunoNome, fotoUrl, periodo, registros, chartImage, personal }: EvolucaoPDFProps) {
  const first = registros[registros.length - 1] ?? null;
  const last = registros[0] ?? null;
  const dPeso = first && last ? delta(last.peso, first.peso, true) : null;
  const dPG = first && last ? delta(last.gordura, first.gordura, true) : null;
  const dMM = first && last ? delta(last.massa_magra, first.massa_magra, false) : null;
  const dIMC = first && last ? delta(last.imc, first.imc, true) : null;

  return (
    <Document title={`Evolução — ${alunoNome}`} author="ARIÉS">
      {/* CAPA */}
      <Page size="A4" style={s.page}>
        <View style={s.cover}>
          <View style={s.brandRow}>
            {personal?.logoUrl ? (
              <Image src={personal.logoUrl} style={s.brandLogo} />
            ) : (
              <Image src="/logo-aries.jpg" style={s.brandLogoDefault} />
            )}
          </View>
          <View style={s.coverMiddle}>
            <Text style={s.coverSubtitle}>RELATÓRIO DE EVOLUÇÃO</Text>
            <Text style={s.coverTitle}>Transformação em Números</Text>
            {fotoUrl ? <Image src={fotoUrl} style={s.coverPhoto} /> : null}
            <Text style={s.coverName}>{alunoNome}</Text>
            <Text style={s.coverMeta}>Período de {periodo.de} a {periodo.ate}</Text>
          </View>
          <Text style={s.coverFooter}>Documento confidencial — uso exclusivo do avaliado e profissional</Text>
        </View>
      </Page>

      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>ARIÉS</Text>
            <Text style={s.sub}>Transformando metas em resultados</Text>
          </View>
          {fotoUrl ? <Image src={fotoUrl} style={{ width: 50, height: 50, borderRadius: 25, border: `1pt solid ${colors.gold}` }} /> : null}
        </View>

        <Text style={s.title}>Relatório de Evolução</Text>
        <Text style={s.alunoLine}>{alunoNome} · Período {periodo.de} a {periodo.ate} · {registros.length} avaliações</Text>

        <Text style={s.sectionTitle}>VARIAÇÃO TOTAL</Text>
        <View style={[s.card, s.row, { padding: 0 }]}>
          {[
            { label: "PESO", v: fmt(last?.peso, " kg"), d: dPeso, suf: " kg" },
            { label: "% GORDURA", v: fmt(last?.gordura, "%"), d: dPG, suf: "%" },
            { label: "MASSA MAGRA", v: fmt(last?.massa_magra, " kg"), d: dMM, suf: " kg" },
            { label: "IMC", v: fmt(last?.imc), d: dIMC, suf: "" },
          ].map((b, i, arr) => (
            <View key={b.label} style={[s.statBox, i === arr.length - 1 ? { borderRight: 0 } : {}]}>
              <Text style={s.statLabel}>{b.label}</Text>
              <Text style={s.statValue}>{b.v}</Text>
              {b.d && (
                <Text style={[s.delta, { color: b.d.good ? colors.good : colors.bad }]}>
                  {b.d.d > 0 ? "▲" : "▼"} {Math.abs(b.d.d).toFixed(1)}{b.suf}
                </Text>
              )}
            </View>
          ))}
        </View>

        {chartImage ? (
          <>
            <Text style={s.sectionTitle}>GRÁFICO DE EVOLUÇÃO</Text>
            <Image src={chartImage} style={s.chartImg} />
          </>
        ) : null}

        <Text style={s.sectionTitle}>HISTÓRICO COMPLETO</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={[s.th, { flex: 1.4 }]}>Data</Text>
            <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Peso</Text>
            <Text style={[s.th, { flex: 1, textAlign: "right" }]}>% Gord.</Text>
            <Text style={[s.th, { flex: 1, textAlign: "right" }]}>M. Magra</Text>
            <Text style={[s.th, { flex: 1, textAlign: "right" }]}>IMC</Text>
          </View>
          {registros.map((r) => (
            <View key={r.data} style={s.row}>
              <Text style={[s.td, { flex: 1.4 }]}>{r.data}</Text>
              <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{fmt(r.peso, " kg")}</Text>
              <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{fmt(r.gordura, "%")}</Text>
              <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{fmt(r.massa_magra, " kg")}</Text>
              <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{fmt(r.imc)}</Text>
            </View>
          ))}
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>{alunoNome}</Text>
          <Text style={s.footerText}>ARIÉS · Transformando metas em resultados</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
