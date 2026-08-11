import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Database } from "@/integrations/supabase/types";
import { CoverContent, type PersonalBranding } from "@/lib/pdf/Cover";
import { classificarPG } from "@/lib/calculos/fisica";

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
});

const IMC_TABLE: Array<[string, string]> = [
  ["Abaixo do peso", "< 18.5"],
  ["Eutrofia", "18.5 – 24.9"],
  ["Sobrepeso", "25.0 – 29.9"],
  ["Obesidade grau I", "30.0 – 34.9"],
  ["Obesidade grau II", "35.0 – 39.9"],
  ["Obesidade grau III", "≥ 40.0"],
];

function pgTable(genero: string | null): Array<[string, string]> {
  if (genero === "feminino") {
    return [
      ["Essencial", "< 14%"],
      ["Atlética", "14% – 20.9%"],
      ["Boa forma", "21% – 24.9%"],
      ["Aceitável", "25% – 31.9%"],
      ["Obesidade", "≥ 32%"],
    ];
  }
  return [
    ["Essencial", "< 6%"],
    ["Atlética", "6% – 13.9%"],
    ["Boa forma", "14% – 17.9%"],
    ["Aceitável", "18% – 24.9%"],
    ["Obesidade", "≥ 25%"],
  ];
}

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

  // Faixa de %gordura usada no cálculo do peso ideal por composição corporal
  // (mesma regra de src/lib/calculos/fisica.ts:composicao — preserva massa magra).
  const isFeminino = a.genero === "feminino";
  const gFaixaMin = isFeminino ? 18 : 10;
  const gFaixaMax = isFeminino ? 25 : 20;
  const massaMagraNum = a.massa_magra != null ? Number(a.massa_magra) : null;
  const gorduraIdealMin = massaMagraNum != null && a.peso_ideal_min != null ? Number(a.peso_ideal_min) - massaMagraNum : null;
  const gorduraIdealMax = massaMagraNum != null && a.peso_ideal_max != null ? Number(a.peso_ideal_max) - massaMagraNum : null;
  // Peso ideal pelo IMC (faixa "Eutrofia" da OMS: 18.5–24.9) — conceito diferente
  // do peso ideal por composição corporal, calculado só a partir da altura.
  const alturaNum = a.altura != null ? Number(a.altura) : null;
  const pesoImcMin = alturaNum ? 18.5 * alturaNum * alturaNum : null;
  const pesoImcMax = alturaNum ? 24.9 * alturaNum * alturaNum : null;

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
            <Field
              label="Peso ideal (composição corporal)"
              value={a.peso_ideal_min != null ? `${fmt(a.peso_ideal_min)} – ${fmt(a.peso_ideal_max)} kg` : "—"}
              width="cell"
            />
            <Field
              label="Peso ideal (IMC 18.5–24.9)"
              value={pesoImcMin != null ? `${fmt(pesoImcMin)} – ${fmt(pesoImcMax)} kg` : "—"}
              width="cell"
            />
            <Field
              label={`% Gordura ideal (${a.genero === "feminino" ? "mulher" : "homem"})`}
              value={`${gFaixaMin}% – ${gFaixaMax}%`}
              width="cell"
            />
            <Field
              label="Massa gorda ideal"
              value={gorduraIdealMin != null ? `${fmt(gorduraIdealMin)} – ${fmt(gorduraIdealMax)} kg` : "—"}
              width="cell"
            />
          </View>
        </View>

        <View style={[s.row, { gap: 16 }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>CLASSIFICAÇÃO DO IMC (OMS)</Text>
            <RefTable rows={IMC_TABLE} current={a.imc_classificacao} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>% DE GORDURA — {a.genero === "feminino" ? "MULHER" : "HOMEM"}</Text>
            <RefTable rows={pgTable(a.genero)} current={a.percentual_gordura != null ? classificarPG(Number(a.percentual_gordura), a.genero === "feminino" ? "feminino" : "masculino") : null} />
          </View>
        </View>

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
