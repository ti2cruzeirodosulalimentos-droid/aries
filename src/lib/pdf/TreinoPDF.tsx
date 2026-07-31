import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { TreinoCompleto, TreinoExercicioRow } from "@/lib/queries/treinos";
import type { PersonalBranding } from "@/lib/pdf/AvaliacaoPDF";

interface AlunoInfo {
  full_name: string;
  birth_date: string | null;
  gender: string | null;
  photo_url?: string | null;
}

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
  cover: { flex: 1, justifyContent: "space-between" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandText: { color: colors.gold, fontSize: 14, letterSpacing: 4, fontFamily: "Helvetica-Bold" },
  brandLogo: { height: 40, maxWidth: 200, objectFit: "contain" },
  brandLogoDefault: { width: 44, height: 44, borderRadius: 22, objectFit: "cover" },
  coverMiddle: { alignItems: "center" },
  coverTitle: { fontSize: 36, color: colors.gold, fontFamily: "Helvetica-Bold", textAlign: "center" },
  coverSubtitle: { fontSize: 12, color: colors.muted, marginTop: 8, letterSpacing: 6, textAlign: "center" },
  coverPhoto: { width: 140, height: 140, borderRadius: 70, marginTop: 28, marginBottom: 18, border: `2pt solid ${colors.gold}` },
  coverName: { fontSize: 22, color: colors.text, marginTop: 16, fontFamily: "Helvetica-Bold", textAlign: "center" },
  coverMeta: { fontSize: 10, color: colors.muted, marginTop: 4, textAlign: "center" },
  coverFichas: { flexDirection: "row", gap: 10, marginTop: 20, justifyContent: "center" },
  fichaBadge: { width: 32, height: 32, borderRadius: 16, border: `1pt solid ${colors.gold}`, alignItems: "center", justifyContent: "center" },
  fichaBadgeText: { color: colors.gold, fontFamily: "Helvetica-Bold", fontSize: 13 },
  coverFooter: { borderTop: `0.5pt solid ${colors.border}`, paddingTop: 10, color: colors.muted, fontSize: 8, textAlign: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottom: `0.5pt solid ${colors.border}`, paddingBottom: 8, marginBottom: 16 },
  headerLeft: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  headerLetra: { color: colors.gold, fontSize: 20, fontFamily: "Helvetica-Bold" },
  headerNome: { color: colors.text, fontSize: 13, fontFamily: "Helvetica-Bold" },
  headerMeta: { color: colors.muted, fontSize: 8 },
  objetivo: { color: colors.muted, fontSize: 9, marginBottom: 14, fontStyle: "italic" },
  groupTitle: { fontSize: 10, color: colors.gold, fontFamily: "Helvetica-Bold", letterSpacing: 1.5, marginTop: 14, marginBottom: 8, textTransform: "uppercase" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7, paddingHorizontal: 10, backgroundColor: colors.card, borderRadius: 6, marginBottom: 6, border: `0.5pt solid ${colors.border}` },
  numBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" },
  numBadgeText: { color: "#000000", fontSize: 9, fontFamily: "Helvetica-Bold" },
  exNome: { color: colors.text, fontSize: 10, fontFamily: "Helvetica-Bold" },
  exMeta: { color: colors.muted, fontSize: 8, marginTop: 2 },
  serieBox: { alignItems: "center", minWidth: 42 },
  serieValue: { color: colors.goldLight, fontSize: 10, fontFamily: "Helvetica-Bold" },
  serieLabel: { color: colors.muted, fontSize: 6, letterSpacing: 0.5, textTransform: "uppercase" },
  metodoTag: { backgroundColor: colors.gold, borderRadius: 3, paddingVertical: 2, paddingHorizontal: 5, marginTop: 3, alignSelf: "flex-start" },
  metodoTagText: { color: "#000000", fontSize: 6, fontFamily: "Helvetica-Bold", letterSpacing: 0.5, textTransform: "uppercase" },
  cardioBox: { marginTop: 14, backgroundColor: colors.card, borderRadius: 6, padding: 12, border: `1pt solid ${colors.gold}` },
  cardioTitle: { color: colors.gold, fontSize: 9, fontFamily: "Helvetica-Bold", letterSpacing: 1.5, marginBottom: 6 },
  cardioLine: { color: colors.text, fontSize: 9, marginBottom: 2 },
  obsBox: { marginTop: 14, backgroundColor: colors.card, borderRadius: 6, padding: 12, border: `0.5pt solid ${colors.border}` },
  obsTitle: { color: colors.gold, fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 1.5, marginBottom: 6, textTransform: "uppercase" },
  obsText: { color: colors.text, fontSize: 9, lineHeight: 1.5 },
  pageFooter: { position: "absolute", bottom: 20, left: 36, right: 36, borderTop: `0.5pt solid ${colors.border}`, paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
  footerText: { color: colors.muted, fontSize: 7 },
});

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

function serieTexto(item: TreinoExercicioRow): string {
  if (item.series && item.repeticoes) return `${item.series}x${item.repeticoes}`;
  if (item.series) return `${item.series}x`;
  if (item.repeticoes) return item.repeticoes;
  return "—";
}

export interface TreinoPDFProps {
  aluno: AlunoInfo;
  treinos: TreinoCompleto[];
  fotoUrl?: string | null;
  personal?: PersonalBranding | null;
}

export function TreinoPDF({ aluno, treinos, fotoUrl, personal }: TreinoPDFProps) {
  const totalPages = 1 + treinos.length;

  return (
    <Document title={`Ficha de Treino — ${aluno.full_name}`} author="ARIÉS">
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
            <Text style={s.coverSubtitle}>PROGRAMA DE TREINO</Text>
            <Text style={s.coverTitle}>Ficha Completa</Text>
            {fotoUrl ? <Image src={fotoUrl} style={s.coverPhoto} /> : null}
            <Text style={s.coverName}>{aluno.full_name}</Text>
            <Text style={s.coverMeta}>{calcAge(aluno.birth_date)} · {aluno.gender || "—"}</Text>
            <View style={s.coverFichas}>
              {treinos.map((t) => (
                <View key={t.letra} style={s.fichaBadge}>
                  <Text style={s.fichaBadgeText}>{t.letra}</Text>
                </View>
              ))}
            </View>
          </View>
          <Text style={s.coverFooter}>Documento confidencial — uso exclusivo do avaliado e profissional</Text>
        </View>
      </Page>

      {/* UMA PÁGINA POR FICHA */}
      {treinos.map((treino, idx) => {
        let grupoAnterior: string | null = null;
        const principais = treino.itens.filter((i) => i.exercicio?.grupo_muscular !== "Cardio");
        const cardio = treino.itens.filter((i) => i.exercicio?.grupo_muscular === "Cardio");

        return (
          <Page key={treino.letra} size="A4" style={s.page}>
            <View style={s.header}>
              <View style={s.headerLeft}>
                <Text style={s.headerLetra}>{treino.letra}</Text>
                <Text style={s.headerNome}>{treino.nome}</Text>
              </View>
              <Text style={s.headerMeta}>{aluno.full_name}</Text>
            </View>

            {treino.objetivo ? <Text style={s.objetivo}>{treino.objetivo}</Text> : null}

            {principais.map((item, i) => {
              const grupo = item.exercicio?.grupo_muscular ?? null;
              const novoGrupo = grupo !== grupoAnterior;
              grupoAnterior = grupo;
              return (
                <View key={item.id}>
                  {novoGrupo && grupo ? <Text style={s.groupTitle}>{grupo}</Text> : null}
                  <View style={s.row}>
                    <View style={s.numBadge}>
                      <Text style={s.numBadgeText}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.exNome}>{item.exercicio?.nome ?? "—"}</Text>
                      <Text style={s.exMeta}>
                        {[
                          item.carga ? `${item.carga}` : null,
                          item.descanso_seg ? `descanso ${item.descanso_seg}s` : null,
                        ].filter(Boolean).join(" · ") || (item.observacoes ?? "")}
                      </Text>
                      {item.metodo ? (
                        <View style={s.metodoTag}>
                          <Text style={s.metodoTagText}>{item.metodo}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={s.serieBox}>
                      <Text style={s.serieValue}>{serieTexto(item)}</Text>
                      <Text style={s.serieLabel}>séries x reps</Text>
                    </View>
                  </View>
                </View>
              );
            })}

            {cardio.length ? (
              <View style={s.cardioBox}>
                <Text style={s.cardioTitle}>CARDIO</Text>
                {cardio.map((item) => (
                  <Text key={item.id} style={s.cardioLine}>
                    {item.exercicio?.nome}
                    {item.repeticoes ? ` — ${item.repeticoes}` : ""}
                    {item.observacoes ? ` (${item.observacoes})` : ""}
                  </Text>
                ))}
              </View>
            ) : null}

            {treino.observacoes ? (
              <View style={s.obsBox}>
                <Text style={s.obsTitle}>Orientações</Text>
                <Text style={s.obsText}>{treino.observacoes}</Text>
              </View>
            ) : null}

            <PageFooter page={idx + 2} total={totalPages} aluno={aluno.full_name} />
          </Page>
        );
      })}
    </Document>
  );
}
