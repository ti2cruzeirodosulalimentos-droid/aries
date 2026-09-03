export type EntregaPDFResultado = "compartilhado" | "baixado" | "cancelado";

/**
 * Entrega um PDF já gerado — "compartilhar" abre o menu nativo do
 * aparelho (WhatsApp, Telegram, e-mail...) com o arquivo já anexado,
 * usando a Web Share API. Não existe forma de mandar direto pro
 * WhatsApp sem essa etapa (nenhum site consegue enviar arquivo pra
 * outro app sem o usuário confirmar), mas é o equivalente mais próximo
 * disso — funciona nativamente em Android/iOS. Em navegador sem esse
 * suporte (a maioria dos desktops), cai automaticamente pra baixar.
 */
export async function entregarPDF(
  blob: Blob,
  filename: string,
  modo: "compartilhar" | "baixar",
  opts?: { title?: string; text?: string },
): Promise<EntregaPDFResultado> {
  if (modo === "compartilhar" && typeof navigator !== "undefined" && typeof navigator.share === "function") {
    const file = new File([blob], filename, { type: "application/pdf" });
    const suportaArquivo = typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] });
    if (suportaArquivo) {
      try {
        await navigator.share({ files: [file], title: opts?.title, text: opts?.text });
        return "compartilhado";
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return "cancelado";
        // qualquer outro erro cai pro download abaixo
      }
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return "baixado";
}
