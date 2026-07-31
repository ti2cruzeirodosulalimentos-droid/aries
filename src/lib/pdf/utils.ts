import { supabase } from "@/integrations/supabase/client";

/** Baixa uma URL (ex.: signed URL do Storage) e converte pra dataURL — react-pdf lida melhor com dataURL do que URL remota. */
export async function urlToDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const r = await fetch(url);
    const b = await r.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(b);
    });
  } catch {
    return null;
  }
}

export interface PersonalBrandingData {
  logoUrl: string | null;
  brandName: string | null;
}

/** Busca a marca (logo + nome) do personal dono do registro, já com a logo em dataURL pronta pro PDF. */
export async function fetchPersonalBranding(personalId: string | null | undefined): Promise<PersonalBrandingData> {
  if (!personalId) return { logoUrl: null, brandName: null };
  const { data } = await supabase.from("profiles").select("logo_url, brand_name").eq("id", personalId).maybeSingle();
  const logoUrl = await urlToDataUrl(data?.logo_url ?? null);
  return { logoUrl, brandName: data?.brand_name ?? null };
}
