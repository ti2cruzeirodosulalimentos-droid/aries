import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Database } from "@/integrations/supabase/types";
import { CoverContent, type PersonalBranding } from "@/lib/pdf/Cover";

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
  refCard: { borderRadius: 6, border: `0.5pt solid ${colors.border}`, overflow: "hidden" },
  refRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, paddingHorizontal: 10, borderBottom: `0.5pt solid ${colors.border}` },
  refRowActive: { backgroundColor: colors.gold },
  refLabel: { color: colors.text, fontSize: 9 },
  refLabelActive: { color: "#000000", fontSize: 9, fontFamily: "Helvetica-Bold" },
  refValue: { color: colors.muted, fontSize: 9 },
  refValueActive: { color: "#000000", fontSize: 9, fontFamily: "Helvetica-Bold" },
  acsmRow: { flexDirection: "row", borderBottom: `0.5pt solid ${colors.border}`, alignItems: "center" },
  acsmLabelCell: { flex: 1.3, fontSize: 8, color: colors.text, paddingVertical: 6, paddingLeft: 8 },
  refLabelActiveInline: { color: colors.gold, fontFamily: "Helvetica-Bold" },
  acsmHeadText: { color: colors.gold, fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  acsmCell: { flex: 1, textAlign: "center", fontSize: 8, color: colors.muted, paddingVertical: 6 },
  acsmColActive: { color: "#000000", backgroundColor: colors.gold },
  acsmCellActive: { color: "#000000", backgroundColor: colors.gold, fontFamily: "Helvetica-Bold" },
  acsmSource: { color: colors.muted, fontSize: 6, textAlign: "right", paddingVertical: 4, paddingRight: 8, fontStyle: "italic" },
});

const IMC_TABLE: Array<[string, string]> = [
  ["Abaixo do peso", "< 18.5"],
  ["Eutrofia", "18.5 – 24.9"],
  ["Sobrepeso", "25.0 – 29.9"],
  ["Obesidade grau I", "30.0 – 34.9"],
  ["Obesidade grau II", "35.0 – 39.9"],
  ["Obesidade grau III", "≥ 40.0"],
];

function RefTable({ rows, current }: { rows: Array<[string, string]>; current: string | null }) {
  return (
    <View style={s.refCard}>
      {rows.map(([label, value], i) => {
        const active = label === current;
        return (
          <View key={label} style={[s.refRow, active ? s.refRowActive : null, i === rows.length - 1 ? { borderBottom: 0 } : null]}>
            <Text style={active ? s.refLabelActive : s.refLabel}>{label}</Text>
            <Text style={active ? s.refValueActive : s.refValue}>{value}</Text>
          </View>
        );
      })}
    </View>
  );
}

// Tabela de % de gordura ideal por idade/sexo — ACSM (Lea & Febiger, 1986),
// referência clássica de fisiologia do exercício. Substitui a faixa fixa
// (10–20% / 18–25%) usada anteriormente por um alvo específico da faixa etária.
const ACSM_GORDURA_IDEAL: Array<{ faixa: string; min: number; max: number | null; homens: number; mulheres: number }> = [
  { faixa: "18-29", min: 18, max: 29, homens: 14, mulheres: 19 },
  { faixa: "30-39", min: 30, max: 39, homens: 16, mulheres: 21 },
  { faixa: "40-49", min: 40, max: 49, homens: 17, mulheres: 22 },
  { faixa: "50-59", min: 50, max: 59, homens: 18, mulheres: 23 },
  { faixa: "60+", min: 60, max: null, homens: 21, mulheres: 26 },
];

function acsmFaixaIndex(idade: number | null): number | null {
  if (idade == null || isNaN(idade)) return null;
  const idx = ACSM_GORDURA_IDEAL.findIndex((f) => idade >= f.min && (f.max === null || idade <= f.max));
  return idx === -1 ? (idade < 18 ? 0 : ACSM_GORDURA_IDEAL.length - 1) : idx;
}

function AcsmTable({ idade, feminino }: { idade: number | null; feminino: boolean }) {
  const idx = acsmFaixaIndex(idade);
  return (
    <View style={s.refCard}>
      <View style={[s.acsmRow, { backgroundColor: colors.card }]}>
        <Text style={[s.acsmLabelCell, s.acsmHeadText]}>Idade</Text>
        {ACSM_GORDURA_IDEAL.map((f, i) => (
          <Text key={f.faixa} style={[s.acsmCell, s.acsmHeadText, i === idx ? s.acsmColActive : null]}>{f.faixa}</Text>
        ))}
      </View>
      <View style={s.acsmRow}>
        <Text style={[s.acsmLabelCell, !feminino ? s.refLabelActiveInline : null]}>Homens</Text>
        {ACSM_GORDURA_IDEAL.map((f, i) => (
          <Text key={f.faixa} style={[s.acsmCell, !feminino && i === idx ? s.acsmCellActive : null]}>{f.homens}%</Text>
        ))}
      </View>
      <View style={[s.acsmRow, { borderBottom: 0 }]}>
        <Text style={[s.acsmLabelCell, feminino ? s.refLabelActiveInline : null]}>Mulheres</Text>
        {ACSM_GORDURA_IDEAL.map((f, i) => (
          <Text key={f.faixa} style={[s.acsmCell, feminino && i === idx ? s.acsmCellActive : null]}>{f.mulheres}%</Text>
        ))}
      </View>
      <Text style={s.acsmSource}>Fonte: ACSM — Lea & Febiger, 1986</Text>
    </View>
  );
}

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
  personal?: PersonalBranding | null;
}

export function AvaliacaoPDF({ aluno, avaliacao: a, anamnese, fotoUrl, personal }: AvaliacaoPDFProps) {
  const total = anamnese ? 5 : 4;

  const isFeminino = a.genero === "feminino";
  const massaMagraNum = a.massa_magra != null ? Number(a.massa_magra) : null;
  // Peso ideal pelo IMC (faixa "Eutrofia" da OMS: 18.5–24.9) — conceito diferente
  // do peso ideal por composição corporal, calculado só a partir da altura.
  const alturaNum = a.altura != null ? Number(a.altura) : null;
  const pesoImcMin = alturaNum ? 18.5 * alturaNum * alturaNum : null;
  const pesoImcMax = alturaNum ? 24.9 * alturaNum * alturaNum : null;

  // % de gordura ideal por idade/sexo — tabela ACSM (Lea & Febiger, 1986).
  // Peso e massa gorda ideais são derivados desse alvo preservando a massa magra atual.
  const idadeNum = a.idade != null ? Number(a.idade) : null;
  const acsmIdx = acsmFaixaIndex(idadeNum);
  const acsmFaixa = acsmIdx != null ? ACSM_GORDURA_IDEAL[acsmIdx] : null;
  const gorduraIdealAcsm = acsmFaixa ? (isFeminino ? acsmFaixa.mulheres : acsmFaixa.homens) : null;
  const pesoIdealAcsm = massaMagraNum != null && gorduraIdealAcsm != null ? massaMagraNum / (1 - gorduraIdealAcsm / 100) : null;
  const massaGordaIdealAcsm = pesoIdealAcsm != null && massaMagraNum != null ? pesoIdealAcsm - massaMagraNum : null;
  const pesoAtualNum = a.peso != null ? Number(a.peso) : null;
  const diffPeso = pesoAtualNum != null && pesoIdealAcsm != null ? pesoAtualNum - pesoIdealAcsm : null;
  const diffPesoLabel = diffPeso == null ? "—" : Math.abs(diffPeso) < 0.5 ? "No peso ideal" : diffPeso > 0 ? `Perder ${fmt(Math.abs(diffPeso))} kg` : `Ganhar ${fmt(Math.abs(diffPeso))} kg`;

  return (
    <Document title={`Avaliação Física — ${aluno.full_name}`} author="ARIÉS">
      {/* CAPA */}
      <Page size="A4" style={s.page}>
        <CoverContent
          personal={personal}
          overline="AVALIAÇÃO FÍSICA"
          title="Relatório Premium"
          personName={aluno.full_name}
          personMeta={`${calcAge(aluno.birth_date)} · ${aluno.gender || "—"} · Avaliação de ${fmtDate(a.data_avaliacao)}`}
          personPhotoUrl={fotoUrl}
        />
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

        <PageFooter page={anamnese ? 4 : 3} total={total} aluno={aluno.full_name} />
      </Page>

      {/* TABELAS DE REFERÊNCIA */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.headerBrand}>TABELAS DE REFERÊNCIA</Text>
          <Text style={s.headerMeta}>{aluno.full_name}</Text>
        </View>

        <Text style={s.sectionTitle}>METAS E FAIXAS IDEAIS</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Field label="Peso ideal" value={fmt(pesoIdealAcsm, " kg")} width="cell3" />
            <Field label="Gordura ideal" value={fmt(gorduraIdealAcsm, "%", 0)} width="cell3" />
            <Field label="Massa gorda ideal" value={fmt(massaGordaIdealAcsm, " kg")} width="cell3" />
            <Field label="Faixa etária considerada" value={acsmFaixa ? `${acsmFaixa.faixa} anos` : "—"} width="cell3" />
            <Field
              label="Peso ideal pelo IMC (18.5–24.9)"
              value={pesoImcMin != null ? `${fmt(pesoImcMin)} – ${fmt(pesoImcMax)} kg` : "—"}
              width="cell3"
            />
            <Field label="Diferença para o peso ideal" value={diffPesoLabel} width="cell3" />
          </View>
        </View>

        <Text style={s.sectionTitle}>CLASSIFICAÇÃO DO IMC (OMS)</Text>
        <View style={{ width: "60%" }}>
          <RefTable rows={IMC_TABLE} current={a.imc_classificacao} />
        </View>

        <Text style={s.sectionTitle}>% GORDURA IDEAL POR IDADE (ACSM)</Text>
        <AcsmTable idade={idadeNum} feminino={isFeminino} />

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
