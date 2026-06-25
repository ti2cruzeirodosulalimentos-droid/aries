import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { Database } from "@/integrations/supabase/types";

type Avaliacao = Database["public"]["Tables"]["avaliacoes_fisicas"]["Row"];
type Aluno = Database["public"]["Tables"]["alunos"]["Row"];
type Anamnese = Database["public"]["Tables"]["anamneses"]["Row"];

const colors = {
  bg: "#0A0A0A",
  card: "#161616",
  gold: "#D4AF37",
  goldLight: "#F5D76E",
  text: "#FFFFFF",
  muted: "#9A9A9A",
  border: "#2A2417",
};

const s = StyleSheet.create({
  page: { backgroundColor: colors.bg, color: colors.text, padding: 36, fontSize: 10, fontFamily: "Helvetica" },
  // Capa
  cover: { flex: 1, justifyContent: "space-between" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandText: { color: colors.gold, fontSize: 14, letterSpacing: 4, fontFamily: "Helvetica-Bold" },
  coverMiddle: { alignItems: "center" },
  coverTitle: { fontSize: 36, color: colors.gold, fontFamily: "Helvetica-Bold", textAlign: "center" },
  coverSubtitle: { fontSize: 12, color: colors.muted, marginTop: 8, letterSpacing: 6, textAlign: "center" },
  coverPhoto: { width: 140, height: 140, borderRadius: 70, marginTop: 28, marginBottom: 18, border: `2pt solid ${colors.gold}` },
  coverName: { fontSize: 22, color: colors.text, marginTop: 16, fontFamily: "Helvetica-Bold", textAlign: "center" },
  coverMeta: { fontSize: 10, color: colors.muted, marginTop: 4, textAlign: "center" },
  coverFooter: { borderTop: `0.5pt solid ${colors.border}`, paddingTop: 10, color: colors.muted, fontSize: 8, textAlign: "center" },
  // Páginas
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottom: `0.5pt solid ${colors.border}`, paddingBottom: 8, marginBottom: 16 },
  headerBrand: { color: colors.gold, fontSize: 9, letterSpacing: 3, fontFamily: "Helvetica-Bold" },
  headerMeta: { color: colors.muted, fontSize: 8 },
  sectionTitle: { fontSize: 13, color: colors.gold, fontFamily: "Helvetica-Bold", marginBottom: 10, marginTop: 12, letterSpacing: 1.5 },
  card: { backgroundColor: colors.card, borderRadius: 6, padding: 12, marginBottom: 8, border: `0.5pt solid ${colors.border}` },
  row: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "50%", marginBottom: 6, paddingRight: 6 },
  cell3: { width: "33.33%", marginBottom: 6, paddingRight: 6 },
  cell4: { width: "25%", marginBottom: 6, paddingRight: 6 },
  label: { color: colors.muted, fontSize: 7, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 },
  value: { color: colors.text, fontSize: 10, fontFamily: "Helvetica-Bold" },
  bigStat: { backgroundColor: colors.card, padding: 14, borderRadius: 8, alignItems: "center", border: `1pt solid ${colors.gold}` },
  bigStatLabel: { color: colors.gold, fontSize: 8, letterSpacing: 2, marginBottom: 6 },
  bigStatValue: { color: colors.text, fontSize: 22, fontFamily: "Helvetica-Bold" },
  bigStatHint: { color: colors.muted, fontSize: 8, marginTop: 4 },
  pageFooter: { position: "absolute", bottom: 20, left: 36, right: 36, borderTop: `0.5pt solid ${colors.border}`, paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
  footerText: { color: colors.muted, fontSize: 7 },
  parqRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottom: `0.5pt solid ${colors.border}` },
  parqLabel: { color: colors.text, fontSize: 9, flex: 1 },
  parqYes: { color: "#E5564B", fontSize: 9, fontFamily: "Helvetica-Bold" },
  parqNo: { color: colors.muted, fontSize: 9 },
});

function fmt(v: number | null | undefined, suffix = "", digits = 2) {
  if (v === null || v === undefined || isNaN(Number(v))) return "—";
  return Number(v).toFixed(digits) + suffix;
}
function fmtInt(v: number | null | undefined, suffix = "") {
  if (v === null || v === undefined) return "—";
  return Math.round(Number(v)) + suffix;
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function calcAge(birth: string | null | undefined): string {
  if (!birth) return "—";
  const b = new Date(birth);
  const t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  const md = t.getMonth() - b.getMonth();
  if (md < 0 || (md === 0 && t.getDate() < b.getDate())) a--;
  return `${a} anos`;
}

function PageFooter({ page, total, aluno }: { page: number; total: number; aluno: string }) {
  return (
    <View style={s.pageFooter} fixed>
      <Text style={s.footerText}>{aluno}</Text>
      <Text style={s.footerText}>ARIÉS</Text>
      <Text style={s.footerText}>Página {page} de {total}</Text>
    </View>
  );
}

function Field({ label, value, width }: { label: string; value: string; width?: "cell" | "cell3" | "cell4" }) {
  const w = width === "cell3" ? s.cell3 : width === "cell4" ? s.cell4 : s.cell;
  return (
    <View style={w}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value || "—"}</Text>
    </View>
  );
}

export interface AvaliacaoPDFProps {
  aluno: Aluno;
  avaliacao: Avaliacao;
  anamnese?: Anamnese | null;
  fotoUrl?: string | null;
}

export function AvaliacaoPDF({ aluno, avaliacao: a, anamnese, fotoUrl }: AvaliacaoPDFProps) {
  const total = anamnese ? 4 : 3;
  return (
    <Document title={`Avaliação Física — ${aluno.full_name}`} author="ARIÉS">
      {/* CAPA */}
      <Page size="A4" style={s.page}>
        <View style={s.cover}>
          <View style={s.brandRow}>
            <Text style={s.brandText}>PERSONAL ARIANNY PRO</Text>
          </View>
          <View style={s.coverMiddle}>
            <Text style={s.coverSubtitle}>AVALIAÇÃO FÍSICA</Text>
            <Text style={s.coverTitle}>Relatório Premium</Text>
            {fotoUrl ? <Image src={fotoUrl} style={s.coverPhoto} /> : null}
            <Text style={s.coverName}>{aluno.full_name}</Text>
            <Text style={s.coverMeta}>{calcAge(aluno.birth_date)} · {aluno.gender || "—"}</Text>
            <Text style={s.coverMeta}>Avaliação de {fmtDate(a.data_avaliacao)}</Text>
          </View>
          <Text style={s.coverFooter}>Documento confidencial — uso exclusivo do avaliado e profissional</Text>
        </View>
      </Page>

      {/* ANAMNESE */}
      {anamnese ? (
        <Page size="A4" style={s.page}>
          <View style={s.header}>
            <Text style={s.headerBrand}>ANAMNESE CLÍNICA</Text>
            <Text style={s.headerMeta}>{aluno.full_name} · {fmtDate(anamnese.data_anamnese)}</Text>
          </View>

          <Text style={s.sectionTitle}>HISTÓRICO CLÍNICO</Text>
          <View style={s.card}>
            <View style={s.row}>
              <Field label="Doenças crônicas" value={anamnese.doencas_cronicas ?? "Nenhuma relatada"} />
              <Field label="Cirurgias" value={anamnese.cirurgias ?? "Nenhuma"} />
              <Field label="Medicamentos" value={anamnese.medicamentos ?? "Nenhum"} />
              <Field label="Lesões" value={anamnese.lesoes ?? "Nenhuma"} />
              <Field label="Alergias" value={anamnese.alergias ?? "Nenhuma"} />
              <Field label="Histórico familiar" value={anamnese.historico_familiar ?? "—"} />
            </View>
          </View>

          <Text style={s.sectionTitle}>HÁBITOS DE VIDA</Text>
          <View style={s.card}>
            <View style={s.row}>
              <Field label="Fumante" value={anamnese.fumante ? "Sim" : "Não"} width="cell4" />
              <Field label="Álcool" value={anamnese.alcool ?? "—"} width="cell4" />
              <Field label="Sono" value={anamnese.qualidade_sono ?? "—"} width="cell4" />
              <Field label="Horas/sono" value={anamnese.horas_sono ? `${anamnese.horas_sono}h` : "—"} width="cell4" />
              <Field label="Stress" value={anamnese.nivel_stress ?? "—"} width="cell4" />
              <Field label="Hidratação" value={anamnese.hidratacao_litros ? `${anamnese.hidratacao_litros}L/dia` : "—"} width="cell4" />
              <Field label="Alimentação" value={anamnese.alimentacao ?? "—"} />
            </View>
          </View>

          <Text style={s.sectionTitle}>ATIVIDADE & OBJETIVOS</Text>
          <View style={s.card}>
            <View style={s.row}>
              <Field label="Pratica atividade" value={anamnese.pratica_atividade ? "Sim" : "Não"} />
              <Field label="Experiência em musculação" value={anamnese.experiencia_musculacao ?? "—"} />
              <Field label="Atividade descrição" value={anamnese.atividade_descricao ?? "—"} />
              <Field label="Tempo inativo" value={anamnese.tempo_inatividade ?? "—"} />
              <Field label="Objetivo principal" value={anamnese.objetivo_principal ?? "—"} />
              <Field label="Objetivo secundário" value={anamnese.objetivo_secundario ?? "—"} />
              <Field label="Prazo" value={anamnese.prazo_objetivo ?? "—"} />
              <Field label="Motivação" value={anamnese.motivacao ?? "—"} />
            </View>
          </View>

          <Text style={s.sectionTitle}>PAR-Q</Text>
          <View style={s.card}>
            {[
              ["Algum médico já disse que você possui problema cardíaco?", anamnese.parq_problema_cardiaco],
              ["Sente dor no peito ao realizar atividade física?", anamnese.parq_dor_peito],
              ["Apresentou dor no peito no último mês?", anamnese.parq_dor_peito],
              ["Tende a perder o equilíbrio devido a tontura ou perda de consciência?", anamnese.parq_tontura],
              ["Possui algum problema ósseo ou articular que poderia piorar com a prática?", anamnese.parq_problema_osseo],
              ["Tem pressão arterial elevada?", anamnese.parq_pressao_alta],
              ["Toma algum medicamento para pressão arterial ou coração?", anamnese.parq_medicamento_pressao],
              ["Sabe de alguma outra razão para não fazer atividade física?", anamnese.parq_outras_razoes],
            ].map(([q, v], i) => (
              <View key={i} style={s.parqRow}>
                <Text style={s.parqLabel}>{q as string}</Text>
                <Text style={v ? s.parqYes : s.parqNo}>{v ? "SIM" : "Não"}</Text>
              </View>
            ))}
            {anamnese.parq_observacoes ? (
              <View style={{ marginTop: 8 }}>
                <Text style={s.label}>Observações</Text>
                <Text style={s.value}>{anamnese.parq_observacoes}</Text>
              </View>
            ) : null}
          </View>
          <PageFooter page={2} total={total} aluno={aluno.full_name} />
        </Page>
      ) : null}

      {/* MEDIDAS */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.headerBrand}>ANTROPOMETRIA</Text>
          <Text style={s.headerMeta}>{aluno.full_name} · {fmtDate(a.data_avaliacao)}</Text>
        </View>

        <Text style={s.sectionTitle}>DADOS GERAIS</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Field label="Peso" value={fmt(a.peso, " kg")} width="cell4" />
            <Field label="Altura" value={fmt(a.altura, " m")} width="cell4" />
            <Field label="Idade" value={fmtInt(a.idade, " anos")} width="cell4" />
            <Field label="Gênero" value={a.genero ?? "—"} width="cell4" />
            <Field label="PA Sistólica" value={fmtInt(a.pressao_sistolica, " mmHg")} width="cell4" />
            <Field label="PA Diastólica" value={fmtInt(a.pressao_diastolica, " mmHg")} width="cell4" />
            <Field label="FC Repouso" value={fmtInt(a.fc_repouso, " bpm")} width="cell4" />
            <Field label="IMC" value={a.imc ? `${fmt(a.imc)} — ${a.imc_classificacao ?? ""}` : "—"} width="cell4" />
          </View>
        </View>

        <Text style={s.sectionTitle}>CIRCUNFERÊNCIAS (cm)</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Field label="Pescoço" value={fmt(a.circ_pescoco)} width="cell3" />
            <Field label="Ombro" value={fmt(a.circ_ombro)} width="cell3" />
            <Field label="Tórax" value={fmt(a.circ_torax)} width="cell3" />
            <Field label="Cintura" value={fmt(a.circ_cintura)} width="cell3" />
            <Field label="Abdômen" value={fmt(a.circ_abdomen)} width="cell3" />
            <Field label="Quadril" value={fmt(a.circ_quadril)} width="cell3" />
            <Field label="Braço D." value={fmt(a.circ_braco_d)} width="cell3" />
            <Field label="Braço E." value={fmt(a.circ_braco_e)} width="cell3" />
            <Field label="Antebraço D." value={fmt(a.circ_antebraco_d)} width="cell3" />
            <Field label="Antebraço E." value={fmt(a.circ_antebraco_e)} width="cell3" />
            <Field label="Coxa D." value={fmt(a.circ_coxa_d)} width="cell3" />
            <Field label="Coxa E." value={fmt(a.circ_coxa_e)} width="cell3" />
            <Field label="Panturrilha D." value={fmt(a.circ_panturrilha_d)} width="cell3" />
            <Field label="Panturrilha E." value={fmt(a.circ_panturrilha_e)} width="cell3" />
            <Field label="RCQ" value={a.rcq ? `${a.rcq} — ${a.rcq_classificacao ?? ""}` : "—"} width="cell3" />
          </View>
        </View>
        <PageFooter page={anamnese ? 3 : 2} total={total} aluno={aluno.full_name} />
      </Page>

      {/* DOBRAS & RESULTADOS */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.headerBrand}>COMPOSIÇÃO CORPORAL</Text>
          <Text style={s.headerMeta}>Protocolo: {protocoloLabel(a.protocolo)}</Text>
        </View>

        <Text style={s.sectionTitle}>DOBRAS CUTÂNEAS (mm)</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Field label="Peitoral" value={fmt(a.dobra_peitoral)} width="cell4" />
            <Field label="Axilar Média" value={fmt(a.dobra_axilar_media)} width="cell4" />
            <Field label="Tríceps" value={fmt(a.dobra_triceps)} width="cell4" />
            <Field label="Subescapular" value={fmt(a.dobra_subescapular)} width="cell4" />
            <Field label="Abdominal" value={fmt(a.dobra_abdominal)} width="cell4" />
            <Field label="Suprailíaca" value={fmt(a.dobra_suprailiaca)} width="cell4" />
            <Field label="Coxa" value={fmt(a.dobra_coxa)} width="cell4" />
            <Field label="Densidade Corporal" value={a.densidade_corporal ? String(a.densidade_corporal) : "—"} width="cell4" />
          </View>
        </View>

        <Text style={s.sectionTitle}>RESULTADOS</Text>
        <View style={[s.row, { gap: 10, marginBottom: 12 }]}>
          <View style={[s.bigStat, { flex: 1 }]}>
            <Text style={s.bigStatLabel}>% GORDURA</Text>
            <Text style={s.bigStatValue}>{fmt(a.percentual_gordura, "%")}</Text>
            <Text style={s.bigStatHint}>via {protocoloLabel(a.protocolo)}</Text>
          </View>
          <View style={[s.bigStat, { flex: 1 }]}>
            <Text style={s.bigStatLabel}>MASSA MAGRA</Text>
            <Text style={s.bigStatValue}>{fmt(a.massa_magra, " kg")}</Text>
          </View>
          <View style={[s.bigStat, { flex: 1 }]}>
            <Text style={s.bigStatLabel}>MASSA GORDA</Text>
            <Text style={s.bigStatValue}>{fmt(a.massa_gorda, " kg")}</Text>
          </View>
        </View>

        <View style={s.card}>
          <View style={s.row}>
            <Field label="Peso atual" value={fmt(a.peso, " kg")} width="cell3" />
            <Field label="Peso ideal (mín)" value={fmt(a.peso_ideal_min, " kg")} width="cell3" />
            <Field label="Peso ideal (máx)" value={fmt(a.peso_ideal_max, " kg")} width="cell3" />
          </View>
        </View>

        {a.observacoes ? (
          <>
            <Text style={s.sectionTitle}>OBSERVAÇÕES DO AVALIADOR</Text>
            <View style={s.card}><Text style={{ color: colors.text, fontSize: 10, lineHeight: 1.5 }}>{a.observacoes}</Text></View>
          </>
        ) : null}

        <PageFooter page={total} total={total} aluno={aluno.full_name} />
      </Page>
    </Document>
  );
}

function protocoloLabel(p: string | null) {
  if (p === "jp3") return "Jackson & Pollock (3 dobras)";
  if (p === "jp7") return "Jackson & Pollock (7 dobras)";
  if (p === "obesos") return "Protocolo Obesos (Weltman)";
  return "—";
}
