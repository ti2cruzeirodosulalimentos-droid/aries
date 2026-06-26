import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { qk } from "@/lib/query-keys";

export interface Template {
  id: string;
  nome: string;
  canal: "whatsapp" | "email" | "ambos";
  assunto: string | null;
  corpo: string;
}
export type TemplateInput = Omit<Template, "id"> & { id?: string; owner_id?: string };

export function useMensagensTemplates() {
  return useQuery({
    queryKey: qk.mensagens.templates,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensagens_templates")
        .select("id,nome,canal,assunto,corpo")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Template[];
    },
  });
}

export function useUpsertTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: TemplateInput) => {
      const fields = { nome: t.nome, canal: t.canal, assunto: t.assunto, corpo: t.corpo };
      if (t.id) {
        const { error } = await supabase.from("mensagens_templates").update(fields).eq("id", t.id);
        if (error) throw error;
      } else {
        if (!t.owner_id) throw new Error("owner_id obrigatório para criar template");
        const { error } = await supabase
          .from("mensagens_templates")
          .insert({ owner_id: t.owner_id, ...fields });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.mensagens.all }),
  });
}

/** Exclui template com remoção OTIMISTA da lista. */
export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mensagens_templates").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.mensagens.all });
      const prev = qc.getQueryData<Template[]>(qk.mensagens.templates);
      qc.setQueryData<Template[]>(qk.mensagens.templates, (old) => old?.filter((t) => t.id !== id));
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.mensagens.templates, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.mensagens.all }),
  });
}
