import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { qk } from "@/lib/query-keys";

export interface ProfileBranding {
  id: string;
  full_name: string | null;
  logo_url: string | null;
  brand_name: string | null;
}

/** Perfil (com marca/logo) do usuário logado. */
export function useMyProfile(userId: string | undefined) {
  return useQuery({
    queryKey: qk.profile.mine(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, logo_url, brand_name")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? { id: userId!, full_name: null, logo_url: null, brand_name: null }) as ProfileBranding;
    },
  });
}

/** Perfil (marca/logo) de um personal específico — usado ao gerar PDFs de um aluno. */
export function useProfileBranding(personalId: string | undefined) {
  return useQuery({
    queryKey: qk.profile.branding(personalId),
    enabled: !!personalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("logo_url, brand_name")
        .eq("id", personalId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? { logo_url: null, brand_name: null }) as Pick<ProfileBranding, "logo_url" | "brand_name">;
    },
  });
}

/** Atualiza marca/logo do próprio perfil (upsert — perfil pode não existir ainda). */
export function useUpdateMyProfile(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { logo_url?: string | null; brand_name?: string | null; full_name?: string | null }) => {
      if (!userId) throw new Error("Sessão expirada");
      const { error } = await supabase.from("profiles").upsert({ id: userId, ...patch });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.profile.mine(userId) }),
  });
}
