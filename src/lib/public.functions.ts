import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Perfil público do personal (página de divulgação, sem login). Roda com
 * service-role só pra esse lookup pontual — não expõe a tabela profiles
 * pra anon, devolve apenas os campos que fazem sentido numa página pública.
 */
export const getPublicPersonalProfile = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(40) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error } = await (supabaseAdmin as any)
      .from("profiles")
      .select("full_name, brand_name, logo_url, bio, especialidades, contato_whatsapp")
      .eq("public_slug", data.slug)
      .eq("is_public", true)
      .maybeSingle();
    if (error) throw error;
    return profile ?? null;
  });
