import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";

export type PdfTema = "escuro" | "claro";

/** Tema padrão — visual "luxury" pra tela/WhatsApp. */
const DARK = {
  bg: "#0A0A0A",
  card: "#161616",
  gold: "#D4AF37",
  goldLight: "#F5D76E",
  text: "#FFFFFF",
  muted: "#9A9A9A",
  border: "#2A2417",
};

/** Tema impressão — fundo branco, pouquíssima tinta, texto de alto contraste.
 * O dourado fica um pouco mais escuro que no tema padrão (menos "neon" no
 * papel), mas continua claro o bastante pra texto preto por cima ler bem. */
const LIGHT = {
  bg: "#FFFFFF",
  card: "#F4F3EF",
  gold: "#C6A044",
  goldLight: "#D8BA6C",
  text: "#1A1A1A",
  muted: "#5C5C5C",
  border: "#D9D5C7",
};

export function pdfPalette(tema: PdfTema = "escuro") {
  return tema === "claro" ? LIGHT : DARK;
}

export interface PersonalBranding {
  logoUrl?: string | null;
  brandName?: string | null;
}

function buildCoverStyles(c: ReturnType<typeof pdfPalette>) {
  return StyleSheet.create({
    cover: { flex: 1, justifyContent: "space-between", alignItems: "center" },
    logoWrap: { alignItems: "center", marginTop: 24 },
    logoCustom: { width: 190, height: 190, objectFit: "contain" },
    logoDefault: { width: 190, height: 190, borderRadius: 95, objectFit: "cover", border: `2pt solid ${c.gold}` },
    brandName: { color: c.gold, fontSize: 13, letterSpacing: 3, fontFamily: "Helvetica-Bold", marginTop: 12, textAlign: "center" },
    middle: { alignItems: "center" },
    overline: { fontSize: 12, color: c.muted, marginTop: 16, letterSpacing: 6, textAlign: "center" },
    title: { fontSize: 32, color: c.gold, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 8 },
    personPhoto: { width: 110, height: 110, borderRadius: 55, marginTop: 24, border: `2pt solid ${c.gold}` },
    personName: { fontSize: 20, color: c.text, marginTop: 16, fontFamily: "Helvetica-Bold", textAlign: "center" },
    meta: { fontSize: 10, color: c.muted, marginTop: 4, textAlign: "center" },
    footer: { borderTop: `0.5pt solid ${c.border}`, paddingTop: 10, color: c.muted, fontSize: 8, textAlign: "center", marginBottom: 4 },
  });
}

export interface CoverContentProps {
  personal?: PersonalBranding | null;
  /** Rótulo pequeno acima do título — ex.: "AVALIAÇÃO FÍSICA", "PROGRAMA DE TREINO". */
  overline: string;
  /** Título grande — ex.: "Relatório Premium", "Ficha Completa". */
  title: string;
  personName: string;
  /** Linha pequena abaixo do nome — idade/gênero, período, etc. Livre por tipo de documento. */
  personMeta?: string;
  personPhotoUrl?: string | null;
  /** Conteúdo extra específico do documento (ex.: badges A/B/C do treino). */
  extra?: ReactNode;
  /** "claro" = versão pra impressão em P&B (fundo branco, pouca tinta). Padrão "escuro". */
  tema?: PdfTema;
}

/** Capa padrão de todos os PDFs — logo grande e centralizada, só título/infos mudam por documento. */
export function CoverContent({ personal, overline, title, personName, personMeta, personPhotoUrl, extra, tema = "escuro" }: CoverContentProps) {
  const c = pdfPalette(tema);
  const s = buildCoverStyles(c);
  const logo = personal?.logoUrl;
  const hasFoto = !!personPhotoUrl;
  return (
    <View style={s.cover}>
      <View style={s.logoWrap}>
        {logo ? (
          <Image src={logo} style={s.logoCustom} />
        ) : (
          <Image src="/logo-aries.jpg" style={s.logoDefault} />
        )}
        {personal?.brandName ? <Text style={s.brandName}>{personal.brandName.toUpperCase()}</Text> : null}
      </View>

      <View style={s.middle}>
        <Text style={s.overline}>{overline}</Text>
        <Text style={s.title}>{title}</Text>
        {hasFoto ? <Image src={personPhotoUrl!} style={s.personPhoto} /> : null}
        <Text style={s.personName}>{personName}</Text>
        {personMeta ? <Text style={s.meta}>{personMeta}</Text> : null}
        {extra}
      </View>

      <Text style={s.footer}>Documento confidencial — uso exclusivo do avaliado e profissional</Text>
    </View>
  );
}
